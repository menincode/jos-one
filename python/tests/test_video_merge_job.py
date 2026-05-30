"""Tests for background video merge job state and cancel."""

from __future__ import annotations

import threading
import time
from pathlib import Path
from unittest.mock import patch

from python.services.video_merge import job as merge_job


def _reset_job_state() -> None:
    merge_job.clear_merge_cancel()
    with merge_job._lock:  # noqa: SLF001
        merge_job._state.clear()  # noqa: SLF001
        merge_job._state.update(  # noqa: SLF001
            {
                "status": "idle",
                "message": "",
                "progress": 0,
                "total": 0,
                "outputs": [],
                "row_states": {},
            }
        )


def test_get_video_merge_job_status_idle_defaults() -> None:
    _reset_job_state()
    status = merge_job.get_video_merge_job_status()
    assert status["status"] == "idle"
    assert status["progress"] == 0
    assert status["row_states"] == {}


def test_request_cancel_marks_pending_and_running_rows() -> None:
    _reset_job_state()
    with merge_job._lock:  # noqa: SLF001
        merge_job._state["status"] = "running"  # noqa: SLF001
        merge_job._state["row_states"] = {  # noqa: SLF001
            "r1": {"status": "pending", "message": ""},
            "r2": {"status": "running", "message": "Clip 1/2"},
            "r3": {"status": "done", "message": "Xong"},
        }

    with patch.object(merge_job, "request_merge_cancel") as mock_cancel:
        result = merge_job.request_cancel_video_merge()

    assert result["ok"] is True
    mock_cancel.assert_called_once()
    status = merge_job.get_video_merge_job_status()
    assert status["status"] == "cancelled"
    assert status["row_states"]["r1"]["status"] == "cancelled"
    assert status["row_states"]["r2"]["status"] == "cancelled"
    assert status["row_states"]["r3"]["status"] == "done"


def test_update_row_state_keeps_live_render_fields() -> None:
    _reset_job_state()
    merge_job._update_row_state(  # noqa: SLF001
        "mix-1",
        status="running",
        message="Clip 1/3: a.mp4 · 2.5x · 00:10",
        output_duration_sec=10.0,
        output_speed_x=2.5,
    )
    merge_job._update_row_state(  # noqa: SLF001
        "mix-1",
        status="running",
        message="Clip 2/3: b.mp4 · 3.1x · 00:20",
        output_duration_sec=20.0,
        output_speed_x=3.1,
    )
    row = merge_job.get_video_merge_job_status()["row_states"]["mix-1"]
    assert row["output_duration_sec"] == 20.0
    assert row["output_speed_x"] == 3.1
    assert "Clip 2/3" in row["message"]


def test_start_job_busy_returns_false(tmp_path) -> None:
    _reset_job_state()
    with merge_job._lock:  # noqa: SLF001
        merge_job._state["status"] = "running"  # noqa: SLF001

    result = merge_job.start_video_merge_job(
        str(tmp_path),
        str(tmp_path),
        [],
        {},
    )
    assert result["ok"] is False


def test_start_job_success_updates_row_states(tmp_path: Path) -> None:
    _reset_job_state()
    inp = tmp_path / "in"
    out = tmp_path / "out"
    inp.mkdir()
    out.mkdir()
    path_a = str((inp / "a.mp4").resolve())
    (inp / "a.mp4").write_bytes(b"x")
    videos = [
        {
            "name": "a.mp4",
            "path": path_a,
            "size_bytes": 1,
            "duration_sec": 30.0,
        },
    ]
    rows = [{"id": "r1", "leading_paths": [path_a]}]
    export = {
        "resolution": "320x240",
        "fps": "15",
        "format": "mp4",
        "durationMinSec": "10",
        "durationMaxSec": "120",
        "zoomMin": "1",
        "zoomMax": "1",
        "speedMin": "1",
        "speedMax": "1",
        "concurrency": "1",
    }

    def fake_render(**kwargs):  # type: ignore[no-untyped-def]
        out_path = kwargs["output_path"]
        Path(out_path).write_bytes(b"ok")
        cb = kwargs.get("on_progress")
        if cb:
            cb(5.0, 2.0, "Chuẩn hóa · Clip 1/1: a.mp4 · 2.0x · 00:05", "normalize")
        return True, "", 5.0, 2.0

    with patch.object(merge_job.io, "list_videos_in_folder") as mock_list:
        mock_list.return_value = {
            "ok": True,
            "path": str(inp),
            "message": "",
            "videos": videos,
        }
        with patch.object(merge_job.io, "enrich_videos_with_duration", return_value=videos):
            with patch.object(merge_job.pipeline, "render_mix_row", side_effect=fake_render):
                started = merge_job.start_video_merge_job(
                    str(inp), str(out), rows, export
                )
                assert started["ok"] is True
                deadline = time.monotonic() + 10.0
                status = merge_job.get_video_merge_job_status()
                while status["status"] == "running" and time.monotonic() < deadline:
                    time.sleep(0.05)
                    status = merge_job.get_video_merge_job_status()

    assert status["status"] == "done"
    assert status["row_states"]["r1"]["status"] == "done"
    assert status["row_states"]["r1"].get("output_duration_sec") == 5.0
    assert (out / "mix-r1.mp4").is_file()
    expected_path = str((out / "mix-r1.mp4").resolve())
    assert status["outputs"][0]["path"] == expected_path
    assert Path(status["outputs"][0]["path"]).is_absolute()


def test_multi_row_first_output_before_job_done(tmp_path: Path) -> None:
    _reset_job_state()
    inp = tmp_path / "in"
    out = tmp_path / "out"
    inp.mkdir()
    out.mkdir()
    path_a = str((inp / "a.mp4").resolve())
    path_b = str((inp / "b.mp4").resolve())
    (inp / "a.mp4").write_bytes(b"x")
    (inp / "b.mp4").write_bytes(b"y")
    videos = [
        {
            "name": "a.mp4",
            "path": path_a,
            "size_bytes": 1,
            "duration_sec": 30.0,
        },
        {
            "name": "b.mp4",
            "path": path_b,
            "size_bytes": 1,
            "duration_sec": 30.0,
        },
    ]
    rows = [
        {"id": "r1", "leading_paths": [path_a]},
        {"id": "r2", "leading_paths": [path_b]},
    ]
    export = {
        "resolution": "320x240",
        "fps": "15",
        "format": "mp4",
        "durationMinSec": "10",
        "durationMaxSec": "120",
        "zoomMin": "1",
        "zoomMax": "1",
        "speedMin": "1",
        "speedMax": "1",
        "concurrency": "2",
    }
    r2_gate = threading.Event()

    def fake_render(**kwargs):  # type: ignore[no-untyped-def]
        row_id = kwargs.get("row_id", "")
        out_path = kwargs["output_path"]
        if row_id == "r2":
            r2_gate.wait(timeout=10.0)
        Path(out_path).write_bytes(b"ok")
        return True, "", 5.0, 2.0

    with patch.object(merge_job.io, "list_videos_in_folder") as mock_list:
        mock_list.return_value = {
            "ok": True,
            "path": str(inp),
            "message": "",
            "videos": videos,
        }
        with patch.object(merge_job.io, "enrich_videos_with_duration", return_value=videos):
            with patch.object(merge_job.pipeline, "render_mix_row", side_effect=fake_render):
                started = merge_job.start_video_merge_job(
                    str(inp), str(out), rows, export
                )
                assert started["ok"] is True

                saw_r1_while_running = False
                deadline = time.monotonic() + 10.0
                while time.monotonic() < deadline:
                    status = merge_job.get_video_merge_job_status()
                    if status["status"] == "running":
                        outputs = status.get("outputs", [])
                        r1_out = next((o for o in outputs if o["row_id"] == "r1"), None)
                        if (
                            r1_out is not None
                            and r1_out["ok"]
                            and status["row_states"].get("r1", {}).get("status") == "done"
                        ):
                            saw_r1_while_running = True
                            break
                    elif status["status"] in ("done", "error", "cancelled"):
                        break
                    time.sleep(0.02)

                r2_gate.set()

                final_deadline = time.monotonic() + 10.0
                status = merge_job.get_video_merge_job_status()
                while status["status"] == "running" and time.monotonic() < final_deadline:
                    time.sleep(0.05)
                    status = merge_job.get_video_merge_job_status()

    assert saw_r1_while_running, "expected r1 output while job still running"
    assert status["status"] == "done"
    assert len(status["outputs"]) == 2


def test_start_job_planner_fail(tmp_path) -> None:
    _reset_job_state()
    inp = tmp_path / "in"
    out = tmp_path / "out"
    inp.mkdir()
    out.mkdir()

    with patch.object(
        merge_job.io,
        "list_videos_in_folder",
        return_value={"ok": True, "videos": [], "message": "", "path": str(inp)},
    ):
        with patch.object(merge_job.io, "enrich_videos_with_duration", return_value=[]):
            with patch.object(
                merge_job.pipeline,
                "plan_mix_rows",
                return_value={"ok": False, "message": "Lỗi planner"},
            ):
                result = merge_job.start_video_merge_job(
                    str(inp),
                    str(out),
                    [{"id": "r1", "leading_paths": []}],
                    {"resolution": "1920x1080", "fps": "30"},
                )
    assert result["ok"] is False

"""Integration smoke for video merge (real FFmpeg when plugins exist)."""

from __future__ import annotations

import subprocess
import time
from pathlib import Path
from unittest.mock import patch

import pytest

from python.services.plugin_downloader import get_ffmpeg_path, get_ffprobe_path
from python.services.settings_service import DEFAULT_VIDEO_EXPORT
from python.services.video_merge import job as merge_job

pytestmark = pytest.mark.integration


def _ffmpeg_ready() -> bool:
    return get_ffmpeg_path() is not None and get_ffprobe_path() is not None


@pytest.fixture()
def merge_reset() -> None:
    merge_job.clear_merge_cancel()
    merge_job.kill_active_subprocesses()
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
    yield
    merge_job.request_merge_cancel()
    merge_job.kill_active_subprocesses()
    worker = merge_job._worker_thread  # noqa: SLF001
    if worker is not None and worker.is_alive():
        worker.join(timeout=60.0)
    merge_job.clear_merge_cancel()
    with merge_job._lock:  # noqa: SLF001
        merge_job._state["status"] = "idle"  # noqa: SLF001


def _make_test_clip(ffmpeg: Path, dest: Path, label: str) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(ffmpeg),
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"testsrc=duration=2:size=320x240:rate=15,format=yuv420p",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=2",
        "-shortest",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "28",
        "-c:a",
        "aac",
        "-b:a",
        "64k",
        "-metadata",
        f"title={label}",
        str(dest),
    ]
    subprocess.run(cmd, check=True, capture_output=True, timeout=60)


@pytest.fixture()
def merge_folders(tmp_path: Path) -> tuple[Path, Path, list[dict], dict]:
    if not _ffmpeg_ready():
        pytest.skip("FFmpeg/ffprobe plugins not installed")
    ffmpeg = get_ffmpeg_path()
    assert ffmpeg is not None
    inp = tmp_path / "input"
    out = tmp_path / "output"
    inp.mkdir()
    out.mkdir()
    clip_a = inp / "a.mp4"
    clip_b = inp / "b.mp4"
    _make_test_clip(ffmpeg, clip_a, "a")
    _make_test_clip(ffmpeg, clip_b, "b")
    videos = merge_job.io.list_videos_in_folder(str(inp))["videos"]
    enriched = merge_job.io.enrich_videos_with_duration(videos)
    assert all(v.get("duration_sec") is not None for v in enriched)
    export = dict(DEFAULT_VIDEO_EXPORT)
    export.update(
        {
            "resolution": "320x240",
            "fps": "15",
            "durationMinSec": "3",
            "durationMaxSec": "10",
            "concurrency": "1",
            "zoomMin": "1",
            "zoomMax": "1",
            "speedMin": "1",
            "speedMax": "1",
        }
    )
    rows = [
        {
            "id": "smoke-row-1",
            "leading_paths": [str(clip_a.resolve()), str(clip_b.resolve())],
        }
    ]
    return inp, out, rows, export


def _wait_job_terminal(timeout_sec: float = 180.0) -> dict:
    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        status = merge_job.get_video_merge_job_status()
        if status["status"] in ("done", "error", "cancelled", "idle"):
            if status["status"] != "idle" or status.get("outputs"):
                return status
        time.sleep(0.25)
    raise AssertionError("Job did not finish in time")


@pytest.mark.skipif(not _ffmpeg_ready(), reason="FFmpeg plugins missing")
def test_smoke_merge_produces_mix_file(
    merge_reset: None,
    merge_folders: tuple[Path, Path, list[dict], dict],
) -> None:
    inp, out, rows, export = merge_folders
    started = merge_job.start_video_merge_job(str(inp), str(out), rows, export)
    assert started["ok"] is True

    status = _wait_job_terminal()
    assert status["status"] == "done", status.get("message")
    assert "Hoàn tất" in status["message"]

    out_file = Path(status["outputs"][0]["path"])
    assert out_file.is_file()
    assert out_file.stat().st_size > 1000
    assert out_file.name.startswith("20") and out_file.name.endswith("_a.mp4")

    row = status["row_states"]["smoke-row-1"]
    assert row["status"] == "done"
    assert row.get("output_duration_sec") is not None or "Thời lượng" in row.get(
        "message", ""
    )

    outputs = status["outputs"]
    assert len(outputs) == 1
    assert outputs[0]["ok"] is True
    assert outputs[0]["row_id"] == "smoke-row-1"


@pytest.mark.skipif(not _ffmpeg_ready(), reason="FFmpeg plugins missing")
def test_smoke_cancel_mid_job(
    merge_reset: None,
    merge_folders: tuple[Path, Path, list[dict], dict],
) -> None:
    inp, out, rows, export = merge_folders
    original_render = merge_job.pipeline.render_mix_row

    def slow_render(**kwargs):  # type: ignore[no-untyped-def]
        if merge_job.is_merge_cancelled():
            return False, "Đã hủy.", None, None, None
        time.sleep(1.0)
        if merge_job.is_merge_cancelled():
            return False, "Đã hủy.", None, None, None
        return original_render(**kwargs)

    with patch.object(merge_job.pipeline, "render_mix_row", side_effect=slow_render):
        started = merge_job.start_video_merge_job(str(inp), str(out), rows, export)
        assert started["ok"] is True
        time.sleep(0.15)
        cancel = merge_job.request_cancel_video_merge()
        assert cancel["ok"] is True
        status = _wait_job_terminal(timeout_sec=30.0)

    assert status["status"] == "cancelled"
    row = status["row_states"].get("smoke-row-1", {})
    if row:
        assert row.get("status") in ("cancelled", "error", "running")


def test_job_done_when_one_row_succeeds_one_fails(
    merge_reset: None,
    tmp_path: Path,
) -> None:
    inp = tmp_path / "in"
    out = tmp_path / "out"
    inp.mkdir()
    out.mkdir()
    (inp / "a.mp4").write_bytes(b"x")
    (inp / "b.mp4").write_bytes(b"y")

    videos = [
        {
            "name": "a.mp4",
            "path": str((inp / "a.mp4").resolve()),
            "size_bytes": 1,
            "duration_sec": 30.0,
        },
        {
            "name": "b.mp4",
            "path": str((inp / "b.mp4").resolve()),
            "size_bytes": 1,
            "duration_sec": 30.0,
        },
    ]
    rows = [
        {"id": "ok-row", "leading_paths": [videos[0]["path"]]},
        {"id": "fail-row", "leading_paths": [videos[1]["path"]]},
    ]
    export = dict(DEFAULT_VIDEO_EXPORT)
    export["durationMinSec"] = "20"
    export["durationMaxSec"] = "120"

    call_count = {"n": 0}

    def fake_render(**kwargs):  # type: ignore[no-untyped-def]
        call_count["n"] += 1
        row_id = kwargs.get("row_id", "")
        if row_id == "ok-row":
            out_path = kwargs["output_path"]
            Path(out_path).write_bytes(b"fake-mp4-content")
            return True, "", 12.5, 2.0, None
        return False, "Lỗi giả lập", None, None, None

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
                status = _wait_job_terminal(timeout_sec=15.0)

    assert status["status"] == "done"
    assert "1/2" in status["message"]
    assert status["row_states"]["ok-row"]["status"] == "done"
    assert status["row_states"]["fail-row"]["status"] == "error"

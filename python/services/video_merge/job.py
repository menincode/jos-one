"""Background video merge job: state, cancel, start/status."""

from __future__ import annotations

import logging
import shutil
import subprocess
import sys
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Callable, TypedDict

from python.services.plugin_downloader import get_plugins_dir
from python.services.video_merge import io, mix_output_path, pipeline

logger = logging.getLogger(__name__)

# Per-job scratch next to plugins/: {repo|exe}/temp/{job_id}/row_{id}/
_MERGE_TEMP_DIR = "temp"


def get_merge_temp_dir() -> Path:
    """Same directory level as plugins/ (repo root in dev, app dir when frozen)."""
    return get_plugins_dir().parent / _MERGE_TEMP_DIR

_lock = threading.Lock()
_cancel_requested = False
_active_procs: list[subprocess.Popen[Any]] = []
_active_procs_lock = threading.Lock()

_state: dict[str, Any] = {
    "status": "idle",
    "message": "",
    "progress": 0,
    "total": 0,
    "outputs": [],
    "row_states": {},
}

_worker_thread: threading.Thread | None = None


class _RowResult(TypedDict):
    row_id: str
    ok: bool
    output_path: str
    message: str
    output_duration_sec: float | None
    output_speed_x: float | None
    clip_count: int
    chaptime: str


def register_proc(proc: subprocess.Popen[Any]) -> None:
    with _active_procs_lock:
        _active_procs.append(proc)


def kill_active_subprocesses() -> None:
    with _active_procs_lock:
        procs = list(_active_procs)
        _active_procs.clear()
    for proc in procs:
        _terminate_proc(proc)


def clear_merge_cancel() -> None:
    global _cancel_requested
    _cancel_requested = False


def set_merge_cancel_requested(value: bool = True) -> None:
    global _cancel_requested
    _cancel_requested = value


def is_merge_cancelled() -> bool:
    return _cancel_requested


def request_merge_cancel() -> None:
    set_merge_cancel_requested(True)
    kill_active_subprocesses()


def _terminate_proc(proc: subprocess.Popen[Any]) -> None:
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                capture_output=True,
                check=False,
            )
        else:
            proc.terminate()
    except OSError:
        pass


def get_video_merge_job_status() -> dict[str, Any]:
    with _lock:
        return {
            "status": _state["status"],
            "message": _state["message"],
            "progress": _state["progress"],
            "total": _state["total"],
            "outputs": list(_state["outputs"]),
            "row_states": dict(_state["row_states"]),
        }


def reset_video_merge_job_display() -> dict[str, Any]:
    """Clear per-row merge results from UI (status / export / speed columns)."""
    with _lock:
        if _state["status"] == "running":
            return {
                "ok": False,
                "message": "Đang ghép video, không thể làm mới bảng mix.",
            }
        _state["status"] = "idle"
        _state["message"] = ""
        _state["progress"] = 0
        _state["total"] = 0
        _state["outputs"] = []
        _state["row_states"] = {}
    return {"ok": True, "message": ""}


def _update_row_state(row_id: str, **kwargs: Any) -> None:
    with _lock:
        row = dict(_state["row_states"].get(row_id, {}))
        for key, value in kwargs.items():
            if value is None and key in (
                "output_duration_sec",
                "output_speed_x",
                "mix_clip_count",
                "mix_total_duration_sec",
            ):
                continue
            if value == "" and key == "chaptime":
                continue
            row[key] = value
        _state["row_states"][row_id] = row


def request_cancel_video_merge() -> dict[str, bool]:
    with _lock:
        if _state["status"] not in ("running", "pending"):
            return {"ok": True}
    request_merge_cancel()
    with _lock:
        _state["status"] = "cancelled"
        _state["message"] = "Đã hủy."
        for row_id, row in _state["row_states"].items():
            if row.get("status") in ("pending", "running"):
                updated = dict(row)
                updated["status"] = "cancelled"
                updated["message"] = "Đã hủy"
                _state["row_states"][row_id] = updated
    return {"ok": True}


def shutdown_video_merge_on_app_exit() -> None:
    with _lock:
        running = _state["status"] == "running"
    if running:
        request_merge_cancel()
        with _lock:
            _state["status"] = "cancelled"
            _state["message"] = "Đã hủy khi thoát ứng dụng."


def start_video_merge_job(
    input_folder: str,
    output_folder: str,
    mix_rows: list[dict],
    export_settings: dict,
    folder_videos: list | None = None,
) -> dict[str, Any]:
    global _worker_thread

    with _lock:
        if _state["status"] == "running":
            return {"ok": False, "message": "Đang có job ghép video khác."}

    config, err = io.parse_export_settings(export_settings)
    if config is None:
        return {"ok": False, "message": err or "Cấu hình xuất không hợp lệ."}

    in_clean = input_folder.strip()
    out_clean = output_folder.strip()
    folder_check = io.validate_merge_folders(in_clean, out_clean)
    if not folder_check.get("ok"):
        return {
            "ok": False,
            "message": str(folder_check.get("message", "Thư mục không hợp lệ.")),
        }

    listing = io.list_videos_in_folder(in_clean)
    if not listing.get("ok"):
        return {
            "ok": False,
            "message": str(listing.get("message", "Không đọc được thư mục đầu vào.")),
        }

    normalized_cache = io.normalize_folder_videos(folder_videos or [])
    cached_in_folder = io.filter_folder_videos_in_directory(normalized_cache, in_clean)
    if cached_in_folder:
        videos = io.enrich_videos_with_duration(cached_in_folder)
    else:
        videos = io.enrich_videos_with_duration(listing["videos"])
    plan = pipeline.plan_mix_rows(
        mix_rows,
        videos,
        duration_min_sec=config.duration_min_sec,
        duration_max_sec=config.duration_max_sec,
    )
    if not plan.get("ok"):
        with _lock:
            _state["status"] = "error"
            _state["message"] = str(plan.get("message", "Lỗi planner."))
        return {"ok": False, "message": _state["message"]}

    planned_rows = plan["rows"]
    total_clips = sum(len(r["sequence_paths"]) for r in planned_rows)
    job_id = uuid.uuid4().hex[:12]

    clear_merge_cancel()
    with _lock:
        _state["status"] = "running"
        _state["message"] = "Đang chuẩn bị…"
        _state["progress"] = 0
        _state["total"] = total_clips
        _state["outputs"] = []
        _state["row_states"] = {
            str(r["id"]): {
                "status": "pending",
                "message": "",
                "phase": "",
                "mix_clip_count": len(r.get("sequence_paths") or []),
                "mix_total_duration_sec": r.get("total_duration_sec"),
            }
            for r in planned_rows
        }

    _worker_thread = threading.Thread(
        target=_run_job,
        args=(job_id, out_clean, planned_rows, config, total_clips),
        daemon=True,
        name=f"video-merge-{job_id}",
    )
    _worker_thread.start()
    return {"ok": True, "message": "Đã bắt đầu ghép video."}


def _run_job(
    job_id: str,
    output_folder: str,
    planned_rows: list[dict],
    config: io.ExportRenderConfig,
    total_clips: int,
) -> None:
    out_root = Path(output_folder)
    temp_root = get_merge_temp_dir() / job_id
    temp_root.mkdir(parents=True, exist_ok=True)
    ok_count = 0

    try:
        def run_row(row: dict) -> _RowResult:
            if is_merge_cancelled():
                return {
                    "row_id": str(row.get("id", "")),
                    "ok": False,
                    "output_path": "",
                    "message": "Đã hủy.",
                    "output_duration_sec": None,
                    "output_speed_x": None,
                    "clip_count": 0,
                    "chaptime": "",
                }

            row_id = str(row["id"])
            sequence: list[str] = row["sequence_paths"]
            _update_row_state(
                row_id,
                status="running",
                phase="processing",
                message="Đang xử lý…",
            )

            row_temp = temp_root / f"row_{row_id}"
            first_source = sequence[0] if sequence else ""
            output_path = mix_output_path.resolve_mix_output_path(
                out_root,
                first_source,
                config.format_ext,
            )

            def on_progress(
                dur: float,
                speed: float,
                message: str,
                phase: str,
                *,
                _row_id: str = row_id,
            ) -> None:
                _update_row_state(
                    _row_id,
                    status="running",
                    phase=phase,
                    message=message,
                    output_duration_sec=dur,
                    output_speed_x=speed,
                )

            def cancel_check() -> bool:
                return is_merge_cancelled()

            try:
                ok, msg, out_dur, out_speed, chaptime = pipeline.render_mix_row(
                    row_id=row_id,
                    sequence_paths=sequence,
                    export_config=config,
                    output_path=output_path,
                    temp_dir=row_temp,
                    on_progress=on_progress,
                    cancel_check=cancel_check,
                )
            except Exception as exc:
                logger.exception("render_mix_row failed row_id=%s", row_id)
                ok, msg, out_dur, out_speed, chaptime = (
                    False,
                    f"Lỗi ghép mix: {exc}",
                    None,
                    None,
                    "",
                )
            finally:
                if row_temp.exists():
                    shutil.rmtree(row_temp, ignore_errors=True)

            return {
                "row_id": row_id,
                "ok": ok,
                "output_path": str(output_path.resolve()) if ok else "",
                "message": msg,
                "output_duration_sec": out_dur,
                "output_speed_x": out_speed,
                "clip_count": len(sequence),
                "chaptime": chaptime if ok else "",
            }

        workers = max(1, int(getattr(config, "concurrency", 1) or 1))
        logger.info("Row thread pool started (workers=%s)", workers)
        with ThreadPoolExecutor(max_workers=workers, thread_name_prefix="row-task") as pool:
            futures = [pool.submit(run_row, row) for row in planned_rows]

            for future in as_completed(futures):
                res = future.result()

                with _lock:
                    _state["progress"] = int(_state.get("progress", 0) or 0) + res["clip_count"]
                    _state["outputs"].append(
                        {
                            "row_id": res["row_id"],
                            "ok": res["ok"],
                            "path": res["output_path"],
                            "message": res["message"],
                            "output_duration_sec": res["output_duration_sec"],
                            "output_speed_x": res["output_speed_x"],
                        }
                    )

                row_id = res["row_id"]
                if is_merge_cancelled():
                    _update_row_state(row_id, status="cancelled", message="Đã hủy")
                    continue

                if res["ok"]:
                    ok_count += 1
                    out_dur = res["output_duration_sec"]
                    out_speed = res["output_speed_x"]
                    done_msg = (
                        f"Thời lượng xuất (FFmpeg): {out_dur:.1f}s · speed {out_speed:.1f}x"
                        if out_dur is not None and out_speed is not None
                        else "Hoàn tất"
                    )
                    _update_row_state(
                        row_id,
                        status="done",
                        message=done_msg,
                        output_duration_sec=out_dur,
                        output_speed_x=out_speed,
                        chaptime=res.get("chaptime") or "",
                    )
                else:
                    _update_row_state(
                        row_id, status="error", message=res["message"] or "Lỗi ghép video."
                    )

        logger.info("Row thread pool shut down")

    finally:
        if temp_root.exists():
            shutil.rmtree(temp_root, ignore_errors=True)
        kill_active_subprocesses()

        with _lock:
            if is_merge_cancelled():
                _state["status"] = "cancelled"
                _state["message"] = "Đã hủy."
            elif ok_count >= 1:
                n = len(planned_rows)
                _state["status"] = "done"
                _state["message"] = f"Hoàn tất {ok_count}/{n} mix."
            else:
                _state["status"] = "error"
                _state["message"] = "Không có mix nào thành công."

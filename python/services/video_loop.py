"""Video loop: repeat every video in a folder N times via FFmpeg concat demuxer."""

from __future__ import annotations

import logging
import re
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any

from python.services.plugin_downloader import get_ffmpeg_path, get_ffprobe_path
from python.services.video_merge.io import VIDEO_EXTENSIONS, probe_media

logger = logging.getLogger(__name__)

_TIME_RE = re.compile(r"time=(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)")
_SPEED_RE = re.compile(r"speed=\s*([\d.]+)x")

_lock = threading.Lock()
_state: dict[str, Any] = {
    "status": "idle",
    "message": "",
    "progress": 0,
    "output_path": "",
    "speed_x": None,
    "total_files": 0,
    "done_files": 0,
    "file_statuses": [],  # list[dict] per-file status
}
_worker_thread: threading.Thread | None = None
_cancel_event = threading.Event()
_procs_lock = threading.Lock()
_active_procs: list[subprocess.Popen[Any]] = []
_executor: ThreadPoolExecutor | None = None


def _hms_to_seconds(h: str, m: str, s: str) -> float:
    return int(h) * 3600 + int(m) * 60 + float(s)


def _probe_duration(path: str) -> float | None:
    ffprobe = get_ffprobe_path()
    if ffprobe is None:
        return None
    meta = probe_media(path, ffprobe)
    if not meta:
        return None
    fmt = meta.get("format") or {}
    try:
        return float(fmt.get("duration", 0))
    except (TypeError, ValueError):
        return None


def _win_creationflags() -> int:
    if sys.platform != "win32":
        return 0
    return subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]


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


def _register_proc(proc: subprocess.Popen[Any]) -> None:
    with _procs_lock:
        _active_procs.append(proc)


def _unregister_proc(proc: subprocess.Popen[Any]) -> None:
    with _procs_lock:
        try:
            _active_procs.remove(proc)
        except ValueError:
            pass


def _build_output_filename(input_path: str, loop_count: int) -> str:
    stem = Path(input_path).stem
    ext = Path(input_path).suffix.lstrip(".").lower() or "mp4"
    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    return f"{stamp}_{stem}_loop_{loop_count}x.{ext}"


def _list_videos_in_folder(folder: str) -> list[Path]:
    """List video files in a folder, sorted alphabetically."""
    root = Path(folder)
    if not root.is_dir():
        return []
    videos: list[Path] = []
    for entry in sorted(root.iterdir(), key=lambda p: p.name.lower()):
        if entry.is_file() and entry.suffix.lower() in VIDEO_EXTENSIONS:
            videos.append(entry)
    return videos


def _make_file_status(
    name: str,
    input_path: str,
    status: str = "pending",
    progress_pct: int = 0,
    output_path: str = "",
) -> dict[str, Any]:
    return {
        "file_name": name,
        "input_path": input_path,
        "status": status,
        "progress_pct": progress_pct,
        "output_path": output_path,
        "speed_x": None,
    }


def get_video_loop_job_status() -> dict[str, Any]:
    with _lock:
        result = dict(_state)
        result["file_statuses"] = [dict(fs) for fs in _state["file_statuses"]]
        return result


def start_video_loop_job(
    input_folder: str,
    output_folder: str,
    loop_count: int,
    thread_count: int = 4,
) -> dict[str, Any]:
    global _worker_thread

    in_clean = input_folder.strip()
    out_clean = output_folder.strip()

    if not in_clean:
        return {"ok": False, "message": "Chọn thư mục đầu vào."}
    if not Path(in_clean).is_dir():
        return {"ok": False, "message": "Thư mục đầu vào không tồn tại."}
    if not out_clean:
        return {"ok": False, "message": "Chọn thư mục đầu ra."}
    if not Path(out_clean).is_dir():
        return {"ok": False, "message": "Thư mục đầu ra không tồn tại."}
    if loop_count < 2:
        return {"ok": False, "message": "Số lần lặp phải >= 2."}

    ffmpeg = get_ffmpeg_path()
    if ffmpeg is None:
        return {"ok": False, "message": "FFmpeg chưa sẵn sàng."}

    videos = _list_videos_in_folder(in_clean)
    if not videos:
        return {"ok": False, "message": "Không tìm thấy video nào trong thư mục đầu vào."}

    with _lock:
        if _state["status"] == "running":
            return {"ok": False, "message": "Đang có job loop video khác."}

    _cancel_event.clear()
    with _procs_lock:
        _active_procs.clear()

    safe_threads = max(1, min(32, int(thread_count or 4)))

    initial_statuses = [
        _make_file_status(v.name, v.resolve().as_posix()) for v in videos
    ]

    with _lock:
        _state["status"] = "running"
        _state["message"] = f"Đang chuẩn bị… ({len(videos)} video, {safe_threads} luồng)"
        _state["progress"] = 0
        _state["output_path"] = ""
        _state["speed_x"] = None
        _state["total_files"] = len(videos)
        _state["done_files"] = 0
        _state["file_statuses"] = initial_statuses

    _worker_thread = threading.Thread(
        target=_run_loop_job,
        args=(videos, out_clean, loop_count, ffmpeg, safe_threads),
        daemon=True,
        name="video-loop",
    )
    _worker_thread.start()
    return {"ok": True, "message": f"Đã bắt đầu loop {len(videos)} video ({safe_threads} luồng)."}


def cancel_video_loop_job() -> dict[str, bool]:
    global _executor
    _cancel_event.set()
    # Shutdown the executor to cancel pending (not-yet-started) futures
    if _executor is not None:
        _executor.shutdown(wait=False, cancel_futures=True)
    with _procs_lock:
        procs = list(_active_procs)
    for proc in procs:
        _terminate_proc(proc)
    with _lock:
        if _state["status"] == "running":
            _state["status"] = "cancelled"
            _state["message"] = "Đã hủy."
            for fs in _state["file_statuses"]:
                if fs["status"] in ("pending", "running"):
                    fs["status"] = "cancelled"
    logger.info("video-loop: cancel requested (%d active subprocesses)", len(procs))
    return {"ok": True}


def shutdown_video_loop_on_app_exit() -> None:
    with _lock:
        running = _state["status"] == "running"
    if running:
        cancel_video_loop_job()


def _run_loop_job(
    videos: list[Path],
    output_folder: str,
    loop_count: int,
    ffmpeg: Path,
    thread_count: int,
) -> None:
    """Orchestrate batch via ThreadPoolExecutor."""
    total_files = len(videos)

    # Build index map: video path -> index
    idx_map: dict[str, int] = {}
    for i, v in enumerate(videos):
        idx_map[str(v)] = i

    results: list[dict[str, Any] | None] = [None] * total_files

    exec_ = ThreadPoolExecutor(
        max_workers=thread_count,
        thread_name_prefix="jos-video-loop",
    )
    global _executor
    _executor = exec_
    try:
        future_map = {
            exec_.submit(
                _process_one_video,
                video_path,
                output_folder,
                loop_count,
                ffmpeg,
                idx_map[str(video_path)],
                total_files,
            ): idx_map[str(video_path)]
            for video_path in videos
        }
        for future in as_completed(future_map):
            index = future_map[future]
            try:
                results[index] = future.result()
            except Exception:  # noqa: BLE001
                logger.exception("Loop video failed for index %d", index)
                with _lock:
                    _state["file_statuses"][index]["status"] = "error"
                    if _cancel_event.is_set():
                        _state["file_statuses"][index]["status"] = "cancelled"
    finally:
        exec_.shutdown(wait=False)
        _executor = None

    # Compute final state
    ok_count = sum(1 for r in results if r and r.get("ok"))
    last_output = ""
    for r in results:
        if r and r.get("ok") and r.get("output_path"):
            last_output = r["output_path"]

    with _lock:
        if _cancel_event.is_set():
            _state["status"] = "cancelled"
            _state["message"] = "Đã hủy."
            for fs in _state["file_statuses"]:
                if fs["status"] in ("pending", "running"):
                    fs["status"] = "cancelled"
        elif ok_count >= 1:
            _state["status"] = "done"
            _state["progress"] = 100
            _state["output_path"] = last_output
            _state["done_files"] = ok_count
            _state["message"] = f"Hoàn tất {ok_count}/{total_files} video."
        else:
            _state["status"] = "error"
            _state["message"] = "Không có video nào loop thành công."


def _process_one_video(
    video_path: Path,
    output_folder: str,
    loop_count: int,
    ffmpeg: Path,
    file_idx: int,
    total_files: int,
) -> dict[str, Any]:
    """Process a single video: create concat list, run ffmpeg, return result."""
    if _cancel_event.is_set():
        return {"ok": False}

    video_name = video_path.name
    with _lock:
        _state["file_statuses"][file_idx]["status"] = "running"

    # Probe source duration
    source_dur = _probe_duration(str(video_path))
    total_dur = (source_dur or 0.0) * loop_count

    # Build output filename
    output_name = _build_output_filename(str(video_path), loop_count)
    output_path = Path(output_folder) / output_name
    if output_path.exists():
        stem_part = output_path.stem
        ext = output_path.suffix
        suffix = 2
        while True:
            alt = Path(output_folder) / f"{stem_part}_{suffix}{ext}"
            if not alt.exists():
                output_path = alt
                break
            suffix += 1

    concat_list_path = output_path.parent / f".loop_concat_{output_path.stem}.txt"
    try:
        posix_path = video_path.resolve().as_posix().replace("'", "''")
        lines = [f"file '{posix_path}'" for _ in range(loop_count)]
        concat_list_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

        cmd = [
            str(ffmpeg),
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list_path),
            "-c", "copy",
            str(output_path),
        ]

        logger.info(
            "Loop video [%d/%d]: %s × %d → %s",
            file_idx + 1, total_files, video_name, loop_count, output_path.name,
        )

        stderr_chunks: list[str] = []
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                creationflags=_win_creationflags(),
            )
        except OSError as exc:
            logger.error("FFmpeg failed to start: %s", exc)
            with _lock:
                _state["file_statuses"][file_idx]["status"] = "error"
            return {"ok": False}

        _register_proc(proc)

        assert proc.stderr is not None

        def read_stderr(
            _chunks: list[str] = stderr_chunks,
            _total: float = total_dur,
            _idx: int = file_idx,
            _total_files: int = total_files,
            _name: str = video_name,
        ) -> None:
            for line in proc.stderr:
                _chunks.append(line)
                _update_progress_from_line(line, _total, _idx, _total_files, _name)

        stderr_thread = threading.Thread(target=read_stderr, daemon=True)
        stderr_thread.start()

        while proc.poll() is None:
            if _cancel_event.is_set():
                _terminate_proc(proc)
                stderr_thread.join(timeout=2)
                _unregister_proc(proc)
                with _lock:
                    _state["file_statuses"][file_idx]["status"] = "cancelled"
                return {"ok": False}
            stderr_thread.join(timeout=0.05)

        stderr_thread.join(timeout=5)
        _unregister_proc(proc)

        if _cancel_event.is_set():
            with _lock:
                _state["file_statuses"][file_idx]["status"] = "cancelled"
            return {"ok": False}

        if proc.returncode != 0:
            log_tail = "".join(stderr_chunks[-20:])
            logger.warning(
                "FFmpeg loop failed for %s (code %s): %s",
                video_name, proc.returncode, log_tail[:2000],
            )
            with _lock:
                _state["file_statuses"][file_idx]["status"] = "error"
            return {"ok": False}

        resolved_output = output_path.resolve().as_posix()
        with _lock:
            _state["file_statuses"][file_idx]["status"] = "done"
            _state["file_statuses"][file_idx]["progress_pct"] = 100
            _state["file_statuses"][file_idx]["output_path"] = resolved_output
            # Update aggregate
            done = sum(1 for fs in _state["file_statuses"] if fs["status"] == "done")
            _state["done_files"] = done
            _state["progress"] = int((done / total_files) * 100)
            _state["message"] = f"[{done}/{total_files}] Xong: {output_path.name}"
        logger.info("Loop video done: %s", output_path.name)
        return {"ok": True, "output_path": resolved_output}

    finally:
        try:
            if concat_list_path.exists():
                concat_list_path.unlink()
        except OSError:
            pass


def _update_progress_from_line(
    line: str,
    total_dur: float,
    file_idx: int,
    total_files: int,
    video_name: str,
) -> None:
    if total_dur <= 0:
        return
    time_match = _TIME_RE.search(line)
    if time_match:
        h, m, s = time_match.groups()
        elapsed = _hms_to_seconds(h, m, s)
        file_pct = min(1.0, elapsed / total_dur)
        file_pct_int = min(99, int(file_pct * 100))
        speed_match = _SPEED_RE.search(line)
        speed: float | None = None
        if speed_match:
            try:
                speed = float(speed_match.group(1))
            except ValueError:
                pass
        with _lock:
            _state["speed_x"] = speed
            if file_idx < len(_state["file_statuses"]):
                _state["file_statuses"][file_idx]["progress_pct"] = file_pct_int
                _state["file_statuses"][file_idx]["speed_x"] = speed

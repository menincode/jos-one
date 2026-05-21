"""Background video merge job (plan + parallel ffmpeg export per row)."""

from __future__ import annotations

import logging
import threading
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from pathlib import Path
from typing import Any

from python.services.mix_planner import MixRowInput, PlannedMixRow, plan_mix_rows
from python.services.video_duration import enrich_videos_with_duration
from python.services.video_folders import list_videos_in_folder
from python.services.video_merge_runner import export_planned_row, parse_concurrency

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_state: dict[str, Any] = {
    "status": "idle",
    "message": "",
    "progress": 0,
    "total": 0,
    "outputs": [],
    "row_states": {},
}
_cancel_requested = False


def _set_state(**kwargs: Any) -> None:
    with _lock:
        _state.update(kwargs)


def _set_row_state(row_id: str, status: str, message: str = "") -> None:
    with _lock:
        row_states = dict(_state.get("row_states") or {})
        row_states[row_id] = {"status": status, "message": message}
        _state["row_states"] = row_states


def _increment_progress() -> None:
    with _lock:
        _state["progress"] = int(_state.get("progress") or 0) + 1


def get_video_merge_job_status() -> dict[str, Any]:
    with _lock:
        return dict(_state)


def request_cancel_video_merge() -> dict[str, bool | str]:
    global _cancel_requested
    with _lock:
        if _state.get("status") != "running":
            return {"ok": False, "message": "Không có tác vụ đang chạy."}
    _cancel_requested = True
    return {"ok": True, "message": ""}


def _cancel_check() -> bool:
    return _cancel_requested


def _parse_duration_bounds(export_settings: dict[str, Any]) -> tuple[float, float, str | None]:
    try:
        min_sec = float(str(export_settings.get("durationMinSec", "60")).strip())
        max_sec = float(str(export_settings.get("durationMaxSec", "90")).strip())
    except ValueError:
        return 0.0, 0.0, "Thời lượng min/max không hợp lệ."
    return min_sec, max_sec, None


def _init_row_states(planned: list[PlannedMixRow]) -> dict[str, dict[str, str]]:
    return {str(row["id"]): {"status": "pending", "message": ""} for row in planned}


def _export_row_task(
    row: PlannedMixRow,
    *,
    output_dir: Path,
    format_ext: str,
    export_settings: dict[str, Any],
    row_index: int,
) -> dict[str, str | bool]:
    row_id = str(row["id"])
    if _cancel_check():
        _set_row_state(row_id, "error", "Đã hủy ghép video.")
        return {"row_id": row_id, "ok": False, "path": "", "message": "Đã hủy ghép video."}

    _set_row_state(row_id, "running", "Đang ghép video…")
    result = export_planned_row(
        row,
        output_dir,
        format_ext=format_ext,
        export_settings=export_settings,
        seed=row_index,
    )
    if result["ok"]:
        _set_row_state(row_id, "done", "")
    else:
        message = str(result.get("message") or "Ghép video thất bại.")
        _set_row_state(row_id, "error", message)
        result["message"] = message
    _increment_progress()
    return result


def _run_rows_parallel(
    planned: list[PlannedMixRow],
    output_dir: Path,
    *,
    format_ext: str,
    export_settings: dict[str, Any],
) -> dict[str, Any]:
    workers = parse_concurrency(export_settings)
    outputs: list[dict[str, str | bool]] = []
    pending: dict[Future[dict[str, str | bool]], str] = {}

    with ThreadPoolExecutor(max_workers=workers, thread_name_prefix="merge-row") as pool:
        for index, row in enumerate(planned):
            if _cancel_check():
                break
            row_id = str(row["id"])
            future = pool.submit(
                _export_row_task,
                row,
                output_dir=output_dir,
                format_ext=format_ext,
                export_settings=export_settings,
                row_index=index,
            )
            pending[future] = row_id

        while pending:
            if _cancel_check():
                for future in pending:
                    future.cancel()
                break

            done, _ = wait(pending.keys(), return_when=FIRST_COMPLETED)
            for future in done:
                row_id = pending.pop(future)
                try:
                    result = future.result()
                except Exception as exc:
                    logger.exception("merge row %s failed", row_id)
                    message = str(exc)
                    _set_row_state(row_id, "error", message)
                    result = {
                        "row_id": row_id,
                        "ok": False,
                        "path": "",
                        "message": message,
                    }
                outputs.append(result)

    if _cancel_check():
        return {
            "ok": False,
            "message": "Đã hủy ghép video.",
            "outputs": outputs,
            "cancelled": True,
        }

    failed = [item for item in outputs if not item["ok"]]
    if failed:
        return {
            "ok": False,
            "message": f"{len(failed)}/{len(planned)} dòng ghép lỗi.",
            "outputs": outputs,
        }

    return {"ok": True, "message": "", "outputs": outputs}


def _run_job(
    input_folder: str,
    output_folder: str,
    rows: list[MixRowInput],
    export_settings: dict[str, Any],
) -> None:
    global _cancel_requested
    try:
        listing = list_videos_in_folder(input_folder)
        if not listing.get("ok"):
            _set_state(
                status="error",
                message=str(listing.get("message") or "Không đọc được thư mục đầu vào."),
                progress=0,
                total=0,
                row_states={},
            )
            return

        videos = enrich_videos_with_duration(listing["videos"])
        for item in videos:
            if item.get("duration_sec") is None:
                _set_state(
                    status="error",
                    message=f"Không đọc được thời lượng: {item.get('name', '')}",
                    progress=0,
                    total=0,
                    row_states={},
                )
                return

        min_sec, max_sec, err = _parse_duration_bounds(export_settings)
        if err:
            _set_state(status="error", message=err, progress=0, total=0, row_states={})
            return

        plan = plan_mix_rows(
            rows,
            videos,
            duration_min_sec=min_sec,
            duration_max_sec=max_sec,
        )
        if not plan["ok"]:
            _set_state(
                status="error",
                message=plan["message"],
                progress=0,
                total=0,
                row_states={},
            )
            return

        planned = plan["rows"]
        row_states = _init_row_states(planned)
        workers = parse_concurrency(export_settings)
        _set_state(
            total=len(planned),
            progress=0,
            message=f"Đang ghép video ({workers} luồng)…",
            row_states=row_states,
            outputs=[],
        )

        fmt = str(export_settings.get("format", "mp4")).strip().lower() or "mp4"
        out_dir = Path(output_folder.strip())
        result = _run_rows_parallel(
            planned,
            out_dir,
            format_ext=fmt,
            export_settings=export_settings,
        )

        if result.get("cancelled") or _cancel_check():
            _set_state(status="cancelled", message="Đã hủy ghép video.", progress=0)
            return

        outputs = result.get("outputs", [])
        succeeded = [item for item in outputs if item.get("ok")]
        if not result["ok"]:
            _set_state(
                status="error",
                message=str(result.get("message") or "Ghép thất bại."),
                progress=len(outputs),
                outputs=outputs,
            )
            return

        _set_state(
            status="done",
            message=f"Hoàn tất {len(succeeded)} video.",
            progress=len(planned),
            outputs=outputs,
        )
    except Exception as exc:
        logger.exception("video merge job failed")
        _set_state(status="error", message=str(exc), progress=0, total=0)
    finally:
        _cancel_requested = False


def start_video_merge_job(
    input_folder: str,
    output_folder: str,
    rows: list[dict[str, Any]],
    export_settings: dict[str, Any],
) -> dict[str, bool | str]:
    global _cancel_requested

    if not isinstance(input_folder, str) or not input_folder.strip():
        return {"ok": False, "message": "Thư mục đầu vào trống."}
    if not isinstance(output_folder, str) or not output_folder.strip():
        return {"ok": False, "message": "Thư mục đầu ra trống."}
    if not isinstance(rows, list) or not rows:
        return {"ok": False, "message": "Thêm ít nhất một dòng mix."}

    normalized_rows: list[MixRowInput] = []
    for item in rows:
        if not isinstance(item, dict):
            return {"ok": False, "message": "Dữ liệu dòng mix không hợp lệ."}
        row_id = str(item.get("id", "")).strip()
        leading_raw = item.get("leading_paths", [])
        if not row_id or not isinstance(leading_raw, list):
            return {"ok": False, "message": "Mỗi dòng mix cần id và leading_paths."}
        leading_paths = [str(p).strip() for p in leading_raw if str(p).strip()]
        if len(leading_paths) < 1 or len(leading_paths) > 5:
            return {"ok": False, "message": "Mỗi dòng chọn từ 1 đến 5 video đầu."}
        normalized_rows.append({"id": row_id, "leading_paths": leading_paths})

    with _lock:
        if _state.get("status") == "running":
            return {"ok": False, "message": "Đang có tác vụ ghép video khác."}

    _cancel_requested = False
    _set_state(
        status="running",
        message="Đang chuẩn bị…",
        progress=0,
        total=0,
        outputs=[],
        row_states={},
    )

    thread = threading.Thread(
        target=_run_job,
        args=(input_folder.strip(), output_folder.strip(), normalized_rows, export_settings),
        daemon=True,
    )
    thread.start()
    return {"ok": True, "message": ""}

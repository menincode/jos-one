"""Video merge I/O: folder listing, duration probe, export settings, dialogs."""

from __future__ import annotations

import logging
import os
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import webview

from python.config import get_tool_root
from python.services.plugin_downloader import get_ffprobe_path
from python.services.settings_service import DEFAULT_VIDEO_EXPORT

logger = logging.getLogger(__name__)

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".wmv"}
VIDEO_FILE_TYPES = (
    "Video files (*.mp4;*.mov;*.mkv;*.avi;*.webm;*.m4v;*.wmv)",
    "MP4 (*.mp4)",
    "MOV (*.mov)",
)
IMAGE_FILE_TYPES = (
    "Image files (*.png;*.jpg;*.jpeg;*.gif;*.webp;*.bmp)",
    "PNG (*.png)",
    "JPEG (*.jpg;*.jpeg)",
)

_LOGO_POSITIONS = frozenset(
    {
        "top_left",
        "top_center",
        "top_right",
        "center_left",
        "center",
        "center_right",
        "bottom_left",
        "bottom_center",
        "bottom_right",
    }
)


@dataclass(frozen=True)
class ExportRenderConfig:
    format_ext: str
    width: int
    height: int
    fps: int
    zoom_min: float
    zoom_max: float
    speed_min: float
    speed_max: float
    logo_path: str | None
    logo_position: str
    duration_min_sec: float
    duration_max_sec: float
    concurrency: int
    scene_transition: str = "none"
    transition_duration_min_sec: float = 0.4
    transition_duration_max_sec: float = 0.8


def _get_str(data: dict[str, Any], *keys: str, default: str = "") -> str:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if value is not None and not isinstance(value, bool):
            return str(value).strip()
    return default


def _parse_float(data: dict[str, Any], *keys: str, default: float) -> float:
    raw = _get_str(data, *keys, default=str(default))
    try:
        return float(raw.replace(",", "."))
    except ValueError:
        return default


def _parse_int(data: dict[str, Any], *keys: str, default: int) -> int:
    raw = _get_str(data, *keys, default=str(default))
    try:
        return int(float(raw.replace(",", ".")))
    except ValueError:
        return default


def parse_export_settings(
    raw: dict[str, Any],
) -> tuple[ExportRenderConfig | None, str | None]:
    """Parse UI export settings; returns (config, error_message_vi)."""
    resolution = _get_str(raw, "resolution", default="")
    if not resolution or "x" not in resolution.lower():
        return None, "Độ phân giải không hợp lệ (dùng dạng 1920x1080)."

    parts = resolution.lower().split("x", 1)
    try:
        width = int(parts[0].strip())
        height = int(parts[1].strip())
    except ValueError:
        return None, "Độ phân giải không hợp lệ (dùng dạng 1920x1080)."

    if width <= 0 or height <= 0:
        return None, "Độ phân giải phải lớn hơn 0."

    fps = _parse_int(raw, "fps", default=30)
    if fps <= 0:
        return None, "FPS phải lớn hơn 0."

    duration_min = _parse_float(
        raw, "durationMinSec", "duration_min_sec", default=3600.0
    )
    duration_max = _parse_float(
        raw, "durationMaxSec", "duration_max_sec", default=5400.0
    )
    if duration_min > duration_max:
        return None, "Thời lượng tối thiểu không được lớn hơn tối đa."

    zoom_min = _parse_float(raw, "zoomMin", "zoom_min", default=1.0)
    zoom_max = _parse_float(raw, "zoomMax", "zoom_max", default=1.2)
    speed_min = _parse_float(raw, "speedMin", "speed_min", default=0.9)
    speed_max = _parse_float(raw, "speedMax", "speed_max", default=1.1)

    if zoom_min > zoom_max:
        return None, "Zoom tối thiểu không được lớn hơn tối đa."
    if speed_min > speed_max:
        return None, "Tốc độ tối thiểu không được lớn hơn tối đa."

    logo_position = _get_str(raw, "logoPosition", "logo_position", default="bottom_right")
    if logo_position not in _LOGO_POSITIONS:
        logo_position = "bottom_right"

    format_ext = _get_str(raw, "format", default="mp4").lstrip(".").lower() or "mp4"
    logo_path_raw = _get_str(raw, "logoPath", "logo_path", default="")
    logo_path = logo_path_raw if logo_path_raw else None

    concurrency = _parse_int(raw, "concurrency", default=4)
    concurrency = max(1, min(16, concurrency))

    scene_transition = _get_str(
        raw, "sceneTransition", "scene_transition", default="none"
    ).lower()
    transition_min = _parse_float(
        raw, "transitionDurationMinSec", "transition_duration_min_sec", default=0.4
    )
    transition_max = _parse_float(
        raw, "transitionDurationMaxSec", "transition_duration_max_sec", default=0.8
    )
    if transition_min > transition_max:
        return None, "Thời lượng chuyển cảnh tối thiểu không được lớn hơn tối đa."

    return (
        ExportRenderConfig(
            format_ext=format_ext,
            width=width,
            height=height,
            fps=fps,
            zoom_min=zoom_min,
            zoom_max=zoom_max,
            speed_min=speed_min,
            speed_max=speed_max,
            logo_path=logo_path,
            logo_position=logo_position,
            duration_min_sec=duration_min,
            duration_max_sec=duration_max,
            concurrency=concurrency,
            scene_transition=scene_transition,
            transition_duration_min_sec=max(0.05, transition_min),
            transition_duration_max_sec=max(0.05, transition_max),
        ),
        None,
    )


def validate_merge_folders(input_folder: str, output_folder: str) -> dict[str, Any]:
    """Ensure input/output paths are set and existing directories."""
    in_clean = input_folder.strip()
    out_clean = output_folder.strip()
    if not in_clean:
        return {
            "ok": False,
            "input_ok": False,
            "output_ok": False,
            "message": "Chọn thư mục đầu vào.",
        }
    if not out_clean:
        return {
            "ok": False,
            "input_ok": Path(in_clean).is_dir(),
            "output_ok": False,
            "message": "Chọn thư mục đầu ra.",
        }

    in_ok = Path(in_clean).is_dir()
    out_ok = Path(out_clean).is_dir()
    if not in_ok and not out_ok:
        return {
            "ok": False,
            "input_ok": False,
            "output_ok": False,
            "message": "Thư mục đầu vào và đầu ra không tồn tại.",
        }
    if not in_ok:
        return {
            "ok": False,
            "input_ok": False,
            "output_ok": out_ok,
            "message": "Thư mục đầu vào không tồn tại.",
        }
    if not out_ok:
        return {
            "ok": False,
            "input_ok": True,
            "output_ok": False,
            "message": "Thư mục đầu ra không tồn tại.",
        }
    return {
        "ok": True,
        "input_ok": True,
        "output_ok": True,
        "message": "",
    }


def list_videos_in_folder(folder: str) -> dict[str, Any]:
    clean = folder.strip()
    if not clean:
        raise ValueError("Đường dẫn thư mục không được để trống.")

    path = Path(clean)
    if not path.is_dir():
        return {
            "ok": False,
            "path": clean,
            "message": "Thư mục không tồn tại hoặc không hợp lệ.",
            "videos": [],
        }

    videos: list[dict[str, Any]] = []
    for entry in sorted(path.iterdir(), key=lambda p: p.name.lower()):
        if not entry.is_file():
            continue
        if entry.suffix.lower() not in VIDEO_EXTENSIONS:
            continue
        videos.append(
            {
                "name": entry.name,
                "path": str(entry.resolve()),
                "size_bytes": entry.stat().st_size,
                "duration_sec": None,
            }
        )

    return {
        "ok": True,
        "path": str(path.resolve()),
        "message": "",
        "videos": videos,
    }


def probe_media(path: str, ffprobe: Path | None = None) -> dict[str, Any] | None:
    """Probe media metadata via ffprobe (json).

    We avoid `ffmpeg-python`'s probe wrapper here because a hung ffprobe can
    block indefinitely; we enforce a timeout for UI responsiveness.
    """
    probe_bin = ffprobe or get_ffprobe_path()
    if probe_bin is None:
        return None

    cmd = [
        str(probe_bin),
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        path,
    ]
    try:
        res = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,  # type: ignore[attr-defined]
        )
    except subprocess.TimeoutExpired:
        logger.warning("ffprobe timeout for %s", path)
        return None
    except OSError as exc:
        logger.debug("ffprobe failed for %s: %s", path, exc)
        return None

    if res.returncode != 0:
        stderr = (res.stderr or "").strip()
        logger.debug("ffprobe non-zero for %s (code=%s): %s", path, res.returncode, stderr[:400])
        return None

    raw = (res.stdout or "").strip()
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.debug("ffprobe json parse failed for %s: %s", path, exc)
        return None
    return parsed if isinstance(parsed, dict) else None


def _duration_from_meta(meta: dict[str, Any]) -> float | None:
    fmt = meta.get("format") or {}
    raw = fmt.get("duration")
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _video_stream_size_from_meta(meta: dict[str, Any]) -> tuple[int, int] | None:
    streams = meta.get("streams")
    if not isinstance(streams, list):
        return None
    for stream in streams:
        if not isinstance(stream, dict) or stream.get("codec_type") != "video":
            continue
        try:
            width = int(stream.get("width") or 0)
            height = int(stream.get("height") or 0)
        except (TypeError, ValueError):
            continue
        if width > 0 and height > 0:
            return width, height
    return None


def probe_duration_ffprobe(path: str, ffprobe: Path) -> float | None:
    meta = probe_media(path, ffprobe)
    if not meta:
        return None
    return _duration_from_meta(meta)


def _metadata_complete(item: dict[str, Any]) -> bool:
    dur = item.get("duration_sec")
    width = item.get("width")
    height = item.get("height")
    try:
        return (
            dur is not None
            and float(dur) > 0
            and int(width) > 0
            and int(height) > 0
        )
    except (TypeError, ValueError):
        return False


def normalize_folder_videos(raw: Any) -> list[dict[str, Any]]:
    """Normalize bridge payload videos for planner/enrich reuse."""
    if not isinstance(raw, list):
        return []
    items: list[dict[str, Any]] = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        path = str(entry.get("path", "")).strip()
        name = str(entry.get("name", "")).strip()
        if not path or not name:
            continue
        try:
            size_bytes = int(entry.get("size_bytes") or 0)
        except (TypeError, ValueError):
            size_bytes = 0
        item: dict[str, Any] = {
            "name": name,
            "path": path,
            "size_bytes": max(0, size_bytes),
            "duration_sec": None,
        }
        dur = entry.get("duration_sec")
        if dur is not None:
            try:
                item["duration_sec"] = float(dur)
            except (TypeError, ValueError):
                pass
        ff_dur = entry.get("duration_ffmpeg_sec")
        if ff_dur is not None:
            try:
                item["duration_ffmpeg_sec"] = float(ff_dur)
            except (TypeError, ValueError):
                pass
        for key in ("width", "height"):
            value = entry.get(key)
            if value is not None:
                try:
                    parsed = int(value)
                    if parsed > 0:
                        item[key] = parsed
                except (TypeError, ValueError):
                    pass
        items.append(item)
    return items


def filter_folder_videos_in_directory(
    videos: list[dict[str, Any]],
    input_folder: str,
) -> list[dict[str, Any]] | None:
    """Keep only videos under ``input_folder``; return None if payload is unusable."""
    if not videos:
        return None
    root = Path(input_folder.strip()).resolve()
    if not root.is_dir():
        return None
    kept: list[dict[str, Any]] = []
    for item in videos:
        path_raw = str(item.get("path", "")).strip()
        if not path_raw:
            return None
        try:
            resolved = Path(path_raw).resolve()
            resolved.relative_to(root)
        except (OSError, ValueError):
            return None
        kept.append({**item, "path": str(resolved)})
    return kept if kept else None


def enrich_videos_with_duration(
    videos: list[dict[str, Any]],
    max_workers: int = 4,
) -> list[dict[str, Any]]:
    ffprobe = get_ffprobe_path()
    if ffprobe is None:
        return [dict(v) for v in videos]

    def probe_one(video: dict[str, Any]) -> dict[str, Any]:
        item = dict(video)
        if _metadata_complete(item):
            return item
        path = str(item.get("path", ""))
        if path:
            meta = probe_media(path, ffprobe)
            if meta:
                duration = _duration_from_meta(meta)
                item["duration_sec"] = duration
                if duration is not None:
                    item["duration_ffmpeg_sec"] = duration
                stream_size = _video_stream_size_from_meta(meta)
                if stream_size is not None:
                    item["width"] = stream_size[0]
                    item["height"] = stream_size[1]
        return item

    if len(videos) <= 1:
        return [probe_one(v) for v in videos]

    workers = max(1, min(max_workers, len(videos)))
    results: list[dict[str, Any] | None] = [None] * len(videos)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(probe_one, videos[i]): i for i in range(len(videos))
        }
        for future in as_completed(futures):
            idx = futures[future]
            results[idx] = future.result()
    return [r for r in results if r is not None]


def _resolve_initial_directory(directory: str) -> str:
    clean = directory.strip()
    if not clean:
        return str(get_tool_root().resolve())

    path = Path(clean)
    if path.is_file():
        return str(path.parent.resolve())
    if path.is_dir():
        return str(path.resolve())
    parent = path.parent
    if parent.is_dir():
        return str(parent.resolve())
    return str(get_tool_root().resolve())


def _open_folder_dialog_impl(bridge: Any, directory: str) -> dict[str, str | bool]:
    initial = _resolve_initial_directory(directory)
    try:
        result = bridge.window.create_file_dialog(
            webview.FileDialog.FOLDER,
            directory=initial,
            allow_multiple=False,
        )
    except Exception as exc:
        logger.exception("open folder dialog failed")
        return {"ok": False, "path": "", "message": f"Không mở được hộp thoại: {exc}"}

    if not result:
        return {"ok": False, "path": "", "message": "Đã hủy chọn thư mục."}

    chosen = result[0] if isinstance(result, (list, tuple)) else result
    path = Path(str(chosen))
    if path.is_file():
        path = path.parent
    return {"ok": True, "path": str(path.resolve()), "message": ""}


def open_folder_dialog(bridge: Any, directory: str = "") -> dict[str, str | bool]:
    return _open_folder_dialog_impl(bridge, directory)


def open_input_folder_dialog(bridge: Any, directory: str = "") -> dict[str, str | bool]:
    initial = _resolve_initial_directory(directory)
    try:
        result = bridge.window.create_file_dialog(
            webview.FileDialog.OPEN,
            directory=initial,
            allow_multiple=False,
            file_types=VIDEO_FILE_TYPES,
        )
    except Exception as exc:
        logger.exception("open input dialog failed")
        return {"ok": False, "path": "", "message": f"Không mở được hộp thoại: {exc}"}

    if not result:
        return {"ok": False, "path": "", "message": "Đã hủy chọn tệp."}

    chosen = result[0] if isinstance(result, (list, tuple)) else result
    path = Path(str(chosen))
    folder = path.parent if path.is_file() else path
    return {"ok": True, "path": str(folder.resolve()), "message": ""}


def open_output_folder_dialog(bridge: Any, directory: str = "") -> dict[str, str | bool]:
    return _open_folder_dialog_impl(bridge, directory)


def open_image_file_dialog(bridge: Any, directory: str = "") -> dict[str, str | bool]:
    initial = _resolve_initial_directory(directory)
    try:
        result = bridge.window.create_file_dialog(
            webview.FileDialog.OPEN,
            directory=initial,
            allow_multiple=False,
            file_types=IMAGE_FILE_TYPES,
        )
    except Exception as exc:
        logger.exception("open image dialog failed")
        return {"ok": False, "path": "", "message": f"Không mở được hộp thoại: {exc}"}

    if not result:
        return {"ok": False, "path": "", "message": "Đã hủy chọn ảnh."}

    chosen = result[0] if isinstance(result, (list, tuple)) else result
    return {"ok": True, "path": str(Path(str(chosen)).resolve()), "message": ""}


def open_folder_in_explorer(folder: str) -> dict[str, str | bool]:
    clean = folder.strip()
    if not clean:
        return {"ok": False, "message": "Đường dẫn thư mục không hợp lệ."}
    path = Path(clean)
    if not path.is_dir():
        return {"ok": False, "message": "Thư mục không tồn tại."}

    try:
        if sys.platform == "win32":
            os.startfile(str(path.resolve()))  # noqa: S606
        elif sys.platform == "darwin":
            subprocess.run(["open", str(path.resolve())], check=False)
        else:
            subprocess.run(["xdg-open", str(path.resolve())], check=False)
    except OSError as exc:
        return {"ok": False, "message": f"Không mở được thư mục: {exc}"}
    return {"ok": True, "message": ""}


def open_media_file(file_path: str) -> dict[str, str | bool]:
    clean = file_path.strip()
    if not clean:
        return {"ok": False, "message": "Đường dẫn tệp không hợp lệ."}
    path = Path(clean)
    if not path.is_file():
        return {"ok": False, "message": "Tệp không tồn tại."}

    try:
        if sys.platform == "win32":
            os.startfile(str(path.resolve()))  # noqa: S606
        elif sys.platform == "darwin":
            subprocess.run(["open", str(path.resolve())], check=False)
        else:
            subprocess.run(["xdg-open", str(path.resolve())], check=False)
    except OSError as exc:
        return {"ok": False, "message": f"Không mở được tệp: {exc}"}
    return {"ok": True, "message": ""}


def default_export_settings_dict() -> dict[str, str]:
    return dict(DEFAULT_VIDEO_EXPORT)


def open_video_file_dialog(bridge: Any, directory: str = "") -> dict[str, str | bool]:
    initial = _resolve_initial_directory(directory)
    try:
        result = bridge.window.create_file_dialog(
            webview.FileDialog.OPEN,
            directory=initial,
            allow_multiple=False,
            file_types=VIDEO_FILE_TYPES,
        )
    except Exception as exc:
        logger.exception("open video file dialog failed")
        return {"ok": False, "path": "", "message": f"Không mở được hộp thoại: {exc}"}

    if not result:
        return {"ok": False, "path": "", "message": "Đã hủy chọn file."}

    chosen = result[0] if isinstance(result, (list, tuple)) else result
    return {"ok": True, "path": str(Path(str(chosen)).resolve()), "message": ""}

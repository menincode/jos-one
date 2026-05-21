"""Folder picker and video listing for the merge workspace."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import webview

VIDEO_EXTENSIONS = frozenset(
    {
        ".mp4",
        ".mov",
        ".webm",
        ".mkv",
        ".avi",
        ".m4v",
        ".wmv",
        ".flv",
    }
)

# pywebview: "Description (*.ext1;*.ext2)" — validated by webview.util.parse_file_type
VIDEO_FILE_TYPES = (
    "Video Files (*.mp4;*.MP4;*.mov;*.MOV;*.webm;*.WEBM;*.mkv;*.MKV;*.avi;*.AVI;*.m4v;*.M4V;*.wmv;*.WMV;*.flv;*.FLV)",
    "All Files (*.*)",
)

IMAGE_FILE_TYPES = (
    "Image Files (*.png;*.PNG;*.jpg;*.JPG;*.jpeg;*.JPEG;*.webp;*.WEBP;*.gif;*.GIF;*.bmp;*.BMP;*.svg;*.SVG)",
    "All Files (*.*)",
)


def _normalize_folder_path(folder: str) -> Path:
    clean = folder.strip()
    if not clean:
        raise ValueError("Đường dẫn thư mục không được để trống.")
    return Path(clean)


def _resolve_initial_directory(path: str) -> str:
    """Return an existing directory for dialog initial_folder (avoids broken HOMEPATH default)."""
    clean = (path or "").strip()
    if clean:
        candidate = Path(clean)
        if candidate.is_file():
            candidate = candidate.parent
        if candidate.is_dir():
            return str(candidate.resolve())

    for key in ("USERPROFILE", "HOME"):
        home = (os.environ.get(key) or "").strip()
        if home:
            home_path = Path(home)
            if home_path.is_dir():
                return str(home_path.resolve())

    return ""


def _dialog_result_path(result: Any) -> str:
    if not result:
        return ""
    selected = result[0] if isinstance(result, (tuple, list)) else result
    return str(selected).strip()


def open_folder_dialog(bridge: Any, directory: str = "") -> dict[str, str | bool]:
    """Open native folder picker; returns selected directory or cancel."""
    window = bridge.window
    initial = _resolve_initial_directory(directory)
    result = window.create_file_dialog(
        webview.FileDialog.FOLDER,
        directory=initial,
    )
    if not result:
        return {"ok": False, "path": "", "message": "Đã hủy chọn thư mục."}

    path = _dialog_result_path(result)
    if not path:
        return {"ok": False, "path": "", "message": "Không nhận được đường dẫn thư mục."}

    resolved = Path(path)
    if not resolved.is_dir():
        return {"ok": False, "path": "", "message": "Thư mục không tồn tại."}

    return {"ok": True, "path": str(resolved.resolve()), "message": ""}


def open_input_folder_dialog(bridge: Any, directory: str = "") -> dict[str, str | bool]:
    """Pick input folder via video file dialog (shows video filter + files in folder)."""
    window = bridge.window
    initial = _resolve_initial_directory(directory)
    result = window.create_file_dialog(
        webview.FileDialog.OPEN,
        directory=initial,
        allow_multiple=False,
        file_types=VIDEO_FILE_TYPES,
    )
    if not result:
        return {"ok": False, "path": "", "message": "Đã hủy chọn thư mục."}

    path = _dialog_result_path(result)
    if not path:
        return {"ok": False, "path": "", "message": "Không nhận được đường dẫn file."}

    selected = Path(path)
    if selected.is_file():
        folder = selected.parent
    elif selected.is_dir():
        folder = selected
    else:
        return {"ok": False, "path": "", "message": "Đường dẫn không hợp lệ."}

    if not folder.is_dir():
        return {"ok": False, "path": "", "message": "Thư mục không tồn tại."}

    return {"ok": True, "path": str(folder.resolve()), "message": ""}


def open_output_folder_dialog(bridge: Any, directory: str = "") -> dict[str, str | bool]:
    """Open folder picker for output directory."""
    return open_folder_dialog(bridge, directory)


def open_image_file_dialog(bridge: Any, directory: str = "") -> dict[str, str | bool]:
    """Open native file picker for a logo/image asset."""
    window = bridge.window
    initial = _resolve_initial_directory(directory)
    result = window.create_file_dialog(
        webview.FileDialog.OPEN,
        directory=initial,
        allow_multiple=False,
        file_types=IMAGE_FILE_TYPES,
    )
    if not result:
        return {"ok": False, "path": "", "message": "Đã hủy chọn file."}

    path = _dialog_result_path(result)
    if not path:
        return {"ok": False, "path": "", "message": "Không nhận được đường dẫn file."}

    resolved = Path(path)
    if not resolved.is_file():
        return {"ok": False, "path": "", "message": "File không tồn tại."}

    return {"ok": True, "path": str(resolved.resolve()), "message": ""}


def list_videos_in_folder(folder: str) -> dict[str, str | bool | list[dict[str, str | int | None]]]:
    """List video files in a directory (non-recursive)."""
    directory = _normalize_folder_path(folder)
    if not directory.is_dir():
        return {
            "ok": False,
            "path": str(directory),
            "message": "Thư mục không tồn tại hoặc không hợp lệ.",
            "videos": [],
        }

    videos: list[dict[str, str | int | None]] = []
    for entry in sorted(directory.iterdir(), key=lambda p: p.name.lower()):
        if not entry.is_file():
            continue
        if entry.suffix.lower() not in VIDEO_EXTENSIONS:
            continue
        stat = entry.stat()
        videos.append(
            {
                "name": entry.name,
                "path": str(entry.resolve()),
                "size_bytes": int(stat.st_size),
                "duration_sec": None,
            }
        )

    return {
        "ok": True,
        "path": str(directory.resolve()),
        "message": "",
        "videos": videos,
    }


def open_folder_in_explorer(folder: str) -> dict[str, str | bool]:
    """Open a folder in the system file manager."""
    directory = _normalize_folder_path(folder)
    if not directory.is_dir():
        try:
            directory.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            return {
                "ok": False,
                "path": str(directory),
                "message": f"Không tạo được thư mục: {exc}",
            }

    resolved = str(directory.resolve())
    try:
        if sys.platform == "win32":
            os.startfile(resolved)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.run(["open", resolved], check=False)
        else:
            subprocess.run(["xdg-open", resolved], check=False)
    except OSError as exc:
        return {
            "ok": False,
            "path": resolved,
            "message": f"Không mở được thư mục: {exc}",
        }

    return {"ok": True, "path": resolved, "message": ""}


def open_media_file(file_path: str) -> dict[str, str | bool]:
    """Open a video/image file with the system default application."""
    clean = (file_path or "").strip()
    if not clean:
        return {"ok": False, "path": "", "message": "Đường dẫn file trống."}

    target = Path(clean)
    if not target.is_file():
        return {
            "ok": False,
            "path": str(target),
            "message": "File không tồn tại.",
        }

    resolved = str(target.resolve())
    try:
        if sys.platform == "win32":
            os.startfile(resolved)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.run(["open", resolved], check=False)
        else:
            subprocess.run(["xdg-open", resolved], check=False)
    except OSError as exc:
        return {
            "ok": False,
            "path": resolved,
            "message": f"Không mở được file: {exc}",
        }

    return {"ok": True, "path": resolved, "message": ""}

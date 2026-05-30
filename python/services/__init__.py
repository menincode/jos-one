"""OS / native services invoked from js_api."""

from __future__ import annotations

from pathlib import Path


def get_app_info_dict() -> dict[str, str]:
    from python.bridge.contract import BRIDGE_API_VERSION
    from python.config import APP_TITLE, get_app_env

    return {
        "title": APP_TITLE,
        "env": get_app_env(),
        "bridge_api_version": BRIDGE_API_VERSION,
    }


def open_path_dialog_stub() -> dict[str, str | bool]:
    """Deprecated alias — use open_folder_dialog via js_api with WindowBridge."""
    return {
        "ok": False,
        "message": "Use open_folder_dialog",
        "path": "",
    }

"""Application configuration for pywebview desktop host."""

from __future__ import annotations

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
APP_DATA_DIR_NAME = "data"
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"
DEV_SERVER_URL = os.getenv("DEV_SERVER_URL", "http://127.0.0.1:5173")
APP_TITLE = os.getenv("APP_TITLE", "JOS One")
APP_VERSION = os.getenv("APP_VERSION", "1.1.2")
APP_NAME = os.getenv("APP_NAME", "jos-one")
APP_ICON_ICO = REPO_ROOT / "packaging" / "assets" / "josvn-icon.ico"

# Default window size (logical pixels). Override via WINDOW_WIDTH / WINDOW_HEIGHT.
WINDOW_WIDTH = 1440
WINDOW_HEIGHT = 900

_width = os.getenv("WINDOW_WIDTH", "").strip()
_height = os.getenv("WINDOW_HEIGHT", "").strip()
if _width.isdigit():
    WINDOW_WIDTH = int(_width)
if _height.isdigit():
    WINDOW_HEIGHT = int(_height)


def get_window_title() -> str:
    """Native window title bar text (includes app version)."""
    return f"{APP_TITLE} v{APP_VERSION}"


def window_start_maximized() -> bool:
    """Open the main window maximized (fills the screen, keeps title bar)."""
    override = os.getenv("WINDOW_MAXIMIZED", "").strip().lower()
    if override in ("1", "true", "yes", "on"):
        return True
    if override in ("0", "false", "no", "off"):
        return False
    return sys.platform == "win32"


DEFAULT_AUTH_API_URL = (
    "https://script.google.com/macros/s/"
    "AKfycbwGM1AF_kjxu7XxY9WgOIetuehLxgvjwHmDk-cfxVz25We2PWUoW1a3zlmkPX2iHsry/exec"
)


def get_auth_api_url() -> str:
    return (os.getenv("AUTH_API_URL") or "").strip() or DEFAULT_AUTH_API_URL


def auth_api_config_error() -> str | None:
    url = get_auth_api_url()
    if not url.startswith(("http://", "https://")):
        return "Auth API is not configured. Set AUTH_API_URL in the environment."
    return None


def is_packaged() -> bool:
    """True when running as a PyInstaller onefile/frozen executable."""
    return getattr(sys, "frozen", False)


def get_app_env() -> str:
    explicit = os.getenv("APP_ENV", "").strip().lower()
    if explicit:
        return explicit
    if is_packaged():
        return "production"
    return "development"


def is_development() -> bool:
    return get_app_env() in ("development", "dev")


def is_local() -> bool:
    return get_app_env() == "local"


def is_production() -> bool:
    return get_app_env() in ("production", "prod")


def asset_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / "frontend" / "dist"  # type: ignore[attr-defined]
    return FRONTEND_DIST


def resolve_app_icon() -> str | None:
    """Path to JOSVN .ico for exe, window title bar, and taskbar (Windows)."""
    if getattr(sys, "frozen", False):
        candidate = Path(sys._MEIPASS) / "assets" / "josvn-icon.ico"  # type: ignore[attr-defined]
    else:
        candidate = APP_ICON_ICO
    return str(candidate) if candidate.is_file() else None


def resolve_url() -> str:
    if is_development():
        return DEV_SERVER_URL
    dist_index = asset_root() / "index.html"
    if not dist_index.is_file():
        raise FileNotFoundError(
            f"Production build not found at {dist_index}. "
            "Run: yarn --cwd frontend build"
        )
    return dist_index.as_uri()


def webview_debug() -> bool:
    return is_development()


def get_tool_root() -> Path:
    """Directory containing the desktop app (repo root in dev, exe folder when packaged)."""
    if is_packaged():
        return Path(sys.executable).resolve().parent
    return REPO_ROOT


def get_app_data_dir() -> Path:
    """Writable app data (SQLite DB, encryption key) — not committed to git."""
    if getattr(sys, "frozen", False):
        return get_tool_root() / APP_DATA_DIR_NAME
    return REPO_ROOT / APP_DATA_DIR_NAME


def get_database_path() -> Path:
    override = os.getenv("JOS_DB_PATH", "").strip()
    if override:
        return Path(override)
    return get_app_data_dir() / "app.db"

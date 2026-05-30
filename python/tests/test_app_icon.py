"""App icon path for PyInstaller exe and pywebview window/taskbar."""

from __future__ import annotations

from pathlib import Path

from python.config import APP_ICON_ICO, resolve_app_icon


def test_app_icon_ico_exists_after_build() -> None:
    assert APP_ICON_ICO.is_file(), (
        f"Missing {APP_ICON_ICO}. Run: make build-icon"
    )


def test_resolve_app_icon_dev() -> None:
    path = resolve_app_icon()
    assert path is not None
    assert Path(path) == APP_ICON_ICO.resolve()

"""Path formatting for logs and human-readable FFmpeg command output."""

from __future__ import annotations

import os
from pathlib import Path

from python.config import get_tool_root

_FILTER_VALUE_FLAGS = frozenset(
    {
        "-filter_complex",
        "-vf",
        "-af",
        "-filter",
        "-filter_script",
    }
)


def use_relative_paths_in_logs() -> bool:
    """When True, FFmpeg command logs use paths relative to the tool root."""
    override = os.getenv("FFMPEG_LOG_RELATIVE_PATHS", "").strip().lower()
    if override in ("0", "false", "no", "off"):
        return False
    if override in ("1", "true", "yes", "on"):
        return True
    return True


def path_display_base() -> Path:
    """Directory used as the prefix stripped from logged paths."""
    return get_tool_root()


def to_display_path(path: str | Path, *, base: Path | None = None) -> str:
    """Return a repo-relative path for display when enabled; else absolute string."""
    raw = str(path)
    if not use_relative_paths_in_logs():
        return raw

    base_dir = (base or path_display_base()).resolve()
    try:
        resolved = Path(path).resolve()
        relative = resolved.relative_to(base_dir)
        return relative.as_posix()
    except (OSError, RuntimeError, ValueError):
        return raw


def _looks_like_filesystem_path(arg: str) -> bool:
    if not arg or arg.startswith("-") or arg.startswith("["):
        return False
    candidate = Path(arg)
    if candidate.is_absolute():
        return True
    if "/" in arg or "\\" in arg:
        return True
    return False


def relativize_ffmpeg_cmd_for_log(cmd: list[str]) -> list[str]:
    """Copy FFmpeg argv with filesystem paths shortened for logging."""
    if not use_relative_paths_in_logs():
        return list(cmd)

    base = path_display_base()
    display: list[str] = []
    skip_value = False
    for arg in cmd:
        if skip_value:
            display.append(arg)
            skip_value = False
            continue
        if arg in _FILTER_VALUE_FLAGS:
            display.append(arg)
            skip_value = True
            continue
        if _looks_like_filesystem_path(arg):
            display.append(to_display_path(arg, base=base))
        else:
            display.append(arg)
    return display

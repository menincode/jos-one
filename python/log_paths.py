"""Configure logging to shorten absolute paths in log output."""

from __future__ import annotations

import logging

from python.path_display import path_display_base, use_relative_paths_in_logs


class RelativePathLogFilter(logging.Filter):
    """Rewrite repo-root absolute paths in log messages to relative form."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not use_relative_paths_in_logs():
            return True
        if isinstance(record.msg, str):
            record.msg = shorten_paths_in_log_message(record.msg)
        return True


def shorten_paths_in_log_message(message: str) -> str:
    """Strip the tool root prefix from paths embedded in a log line."""
    if not use_relative_paths_in_logs():
        return message

    base = path_display_base().resolve()
    replacements = (
        f"{base}\\",
        f"{base}/",
        f"{base.as_posix()}/",
        str(base),
        base.as_posix(),
    )
    shortened = message
    for prefix in replacements:
        if prefix and prefix in shortened:
            shortened = shortened.replace(prefix, "")
    return shortened


def configure_log_paths() -> None:
    """Attach path-shortening filter to existing root handlers (idempotent)."""
    if not use_relative_paths_in_logs():
        return

    root = logging.getLogger()
    for handler in root.handlers:
        if any(isinstance(f, RelativePathLogFilter) for f in handler.filters):
            continue
        handler.addFilter(RelativePathLogFilter())

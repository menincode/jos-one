"""Root logger setup: rotating file handler + stderr console."""

from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

_LOG_FORMAT = "%(asctime)s [%(levelname)-8s] %(name)s: %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB per file
_BACKUP_COUNT = 5


def get_log_dir() -> Path:
    """logs/ next to the exe when frozen, logs/ at repo root in development."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent / "logs"
    from python.config import REPO_ROOT

    return REPO_ROOT / "logs"


def setup_logging(*, debug: bool = False) -> None:
    """Configure the root logger once at application startup.

    Safe to call multiple times — subsequent calls are no-ops.
    """
    root = logging.getLogger()
    if root.handlers:
        return

    level = logging.DEBUG if debug else logging.INFO
    root.setLevel(level)

    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT)

    # --- rotating file handler ---
    log_dir = get_log_dir()
    log_dir.mkdir(parents=True, exist_ok=True)
    file_handler = RotatingFileHandler(
        log_dir / "app.log",
        maxBytes=_MAX_BYTES,
        backupCount=_BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    # --- console (stderr) ---
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)

    # Suppress chatty third-party loggers
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("webview").setLevel(logging.WARNING)

    # FFmpeg: INFO logs full commands to app.log; stderr detail stays DEBUG unless --debug
    logging.getLogger("ffmpeg").setLevel(logging.DEBUG if debug else logging.INFO)

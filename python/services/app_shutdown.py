"""Stop background FFmpeg / merge work when the desktop app exits."""

from __future__ import annotations

import atexit
import logging

logger = logging.getLogger(__name__)

_shutdown_done = False


def shutdown_ffmpeg_workers() -> None:
    """
    Kill tracked FFmpeg subprocess trees and cancel in-flight merge jobs.

    Safe to call multiple times (window close + atexit).
    """
    global _shutdown_done
    if _shutdown_done:
        return
    _shutdown_done = True

    logger.info("Stopping FFmpeg workers before application exit")
    try:
        from python.services.video_merge.job import (
            clear_merge_cancel,
            kill_active_subprocesses,
            shutdown_video_merge_on_app_exit,
        )

        shutdown_video_merge_on_app_exit()
        kill_active_subprocesses()
        clear_merge_cancel()
    except Exception:
        logger.exception("Failed to stop FFmpeg workers on exit")


def register_app_shutdown_hooks() -> None:
    """Register process-level cleanup (backup if the window close hook is skipped)."""
    atexit.register(shutdown_ffmpeg_workers)

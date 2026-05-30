"""Tests for application shutdown FFmpeg cleanup."""

from __future__ import annotations

from unittest.mock import patch

import python.services.app_shutdown as app_shutdown


def test_shutdown_ffmpeg_workers_is_idempotent() -> None:
    app_shutdown._shutdown_done = False  # noqa: SLF001
    with patch(
        "python.services.video_merge.job.shutdown_video_merge_on_app_exit"
    ) as mock_job:
        with patch(
            "python.services.video_merge.job.kill_active_subprocesses"
        ) as mock_kill:
            with patch(
                "python.services.video_merge.job.clear_merge_cancel"
            ) as mock_clear:
                app_shutdown.shutdown_ffmpeg_workers()
                app_shutdown.shutdown_ffmpeg_workers()
                mock_job.assert_called_once()
                mock_kill.assert_called_once()
                mock_clear.assert_called_once()
    app_shutdown._shutdown_done = False  # noqa: SLF001


def test_shutdown_video_merge_on_app_exit_cancels_running_job() -> None:
    from python.services.video_merge import job as merge_job

    merge_job.clear_merge_cancel()
    with merge_job._lock:  # noqa: SLF001
        merge_job._state["status"] = "running"  # noqa: SLF001
        merge_job._state["message"] = "Đang ghép…"  # noqa: SLF001

    with patch.object(merge_job, "request_merge_cancel") as mock_cancel:
        merge_job.shutdown_video_merge_on_app_exit()
        mock_cancel.assert_called_once()

    with merge_job._lock:  # noqa: SLF001
        assert merge_job._state["status"] == "cancelled"  # noqa: SLF001
    merge_job.clear_merge_cancel()
    with merge_job._lock:  # noqa: SLF001
        merge_job._state["status"] = "idle"  # noqa: SLF001

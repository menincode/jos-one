"""Tests for watermark removal backend registration."""

from __future__ import annotations

from python.services.remove_watermark.service import (
    FFMPEG_DELOGO_BACKEND_ID,
    get_remove_logo_backend,
)


def test_ffmpeg_delogo_backend_still_registered() -> None:
    backend = get_remove_logo_backend(FFMPEG_DELOGO_BACKEND_ID)
    assert backend.backend_id == FFMPEG_DELOGO_BACKEND_ID

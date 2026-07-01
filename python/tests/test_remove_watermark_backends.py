"""Tests for watermark removal backend registration and math helper functions."""

from __future__ import annotations

from python.services.remove_watermark.service import (
    FFMPEG_DELOGO_BACKEND_ID,
    FFMPEG_CROP_BACKEND_ID,
    get_remove_logo_backend,
    normalize_logo_zoom_percent,
    compute_crop_scale_top_right_plan,
    build_crop_scale_video_filter,
)


def test_ffmpeg_delogo_backend_still_registered() -> None:
    backend = get_remove_logo_backend(FFMPEG_DELOGO_BACKEND_ID)
    assert backend.backend_id == FFMPEG_DELOGO_BACKEND_ID


def test_ffmpeg_crop_backend_registered() -> None:
    backend = get_remove_logo_backend(FFMPEG_CROP_BACKEND_ID)
    assert backend.backend_id == FFMPEG_CROP_BACKEND_ID


def test_normalize_logo_zoom_percent() -> None:
    assert normalize_logo_zoom_percent(None) == 4.0
    assert normalize_logo_zoom_percent(-5.0) == 4.0
    assert normalize_logo_zoom_percent(0.0) == 4.0
    assert normalize_logo_zoom_percent(0.5) == 1.0  # clamped to min
    assert normalize_logo_zoom_percent(5.0) == 5.0
    assert normalize_logo_zoom_percent(35.0) == 30.0  # clamped to max


def test_compute_crop_scale_top_right_plan() -> None:
    # 1000x500, 4% zoom -> factor 1.04
    # scaled_w = max(1001, int(1000 * 1.04 + 0.5)) = 1040
    # scaled_h = max(501, int(500 * 1.04 + 0.5)) = 520
    # crop_x = max(0, 1040 - 1000) = 40
    sw, sh, cx, cy, ow, oh = compute_crop_scale_top_right_plan(1000, 500, 4.0)
    assert sw == 1040
    assert sh == 520
    assert cx == 40
    assert cy == 0
    assert ow == 1000
    assert oh == 500


def test_build_crop_scale_video_filter() -> None:
    filt = build_crop_scale_video_filter(1920, 1080, 10.0)
    # factor 1.10
    # scaled_w = 1920 * 1.1 = 2112
    # scaled_h = 1080 * 1.1 = 1188
    # crop_x = 2112 - 1920 = 192
    assert filt == "scale=2112:1188,crop=1920:1080:192:0"

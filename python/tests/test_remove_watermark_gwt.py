"""Tests for GWT / Veo Watermark Remover backend helpers."""

from __future__ import annotations

from pathlib import Path

from python.services.remove_watermark.service import (
    DEFAULT_BACKEND_ID,
    GWT_VEO_BACKEND_ID,
    get_remove_logo_backend,
    parse_gwt_progress_percent,
    resolve_veo_watermark_remover_binary,
)


def test_parse_gwt_progress_percent_frame_counter() -> None:
    line = "  [----------------------------------------]   3% (6/192)"
    assert parse_gwt_progress_percent(line) == 3


def test_parse_gwt_progress_percent_ignores_denoiser_strength_log() -> None:
    blob = "[gwt] [warning] NcnnDenoiser: sigma=50, strength=150%, roi=188x136"
    assert parse_gwt_progress_percent(blob) is None


def test_default_backend_is_gwt_veo() -> None:
    assert DEFAULT_BACKEND_ID == GWT_VEO_BACKEND_ID
    backend = get_remove_logo_backend(DEFAULT_BACKEND_ID)
    assert backend.backend_id == GWT_VEO_BACKEND_ID


def test_resolve_veo_watermark_remover_binary_finds_ffmpge(tmp_path: Path) -> None:
    exe = tmp_path / "ffmpge.exe"
    exe.write_bytes(b"MZ")
    found = resolve_veo_watermark_remover_binary(tmp_path)
    assert found == exe.resolve()

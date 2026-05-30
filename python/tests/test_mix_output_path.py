"""Tests for mix output filename helpers."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from python.services.video_merge import mix_output_path


def test_build_mix_output_filename_uses_timestamp_and_first_stem() -> None:
    at = datetime(2026, 5, 30, 14, 7)
    name = mix_output_path.build_mix_output_filename(
        r"D:\in\my-clip.mp4",
        "mp4",
        at=at,
    )
    assert name == "20260530_1407_my-clip.mp4"


def test_sanitize_mix_output_stem_strips_invalid_chars() -> None:
    assert mix_output_path.sanitize_mix_output_stem('bad<>name') == "badname"


def test_resolve_mix_output_path_avoids_collision(tmp_path: Path) -> None:
    at = datetime(2026, 5, 30, 9, 15)
    first = str((tmp_path / "a.mp4").resolve())
    path_a = mix_output_path.resolve_mix_output_path(
        tmp_path,
        first,
        "mp4",
        at=at,
    )
    path_a.write_bytes(b"x")
    path_b = mix_output_path.resolve_mix_output_path(
        tmp_path,
        first,
        "mp4",
        at=at,
    )
    assert path_a.name == "20260530_0915_a.mp4"
    assert path_b.name == "20260530_0915_a_2.mp4"

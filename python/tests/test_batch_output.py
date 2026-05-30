"""Tests for batch output path resolution."""

from __future__ import annotations

from pathlib import Path

from python.services.batch_output import resolve_batch_output_dir


def test_resolve_batch_output_dir_uses_input_folder_name(tmp_path: Path) -> None:
    input_dir = tmp_path / "My Clips"
    input_dir.mkdir()
    output_root = tmp_path / "exports"
    output_root.mkdir()
    resolved = resolve_batch_output_dir(input_dir, str(output_root))
    assert resolved == output_root / "My-Clips"


def test_resolve_batch_output_dir_without_output_root(tmp_path: Path) -> None:
    input_dir = tmp_path / "in"
    input_dir.mkdir()
    assert resolve_batch_output_dir(input_dir, None) == input_dir

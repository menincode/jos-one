"""Regression: launch via `python -m python.main` from repo root (Makefile / dev.ps1)."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import python.main


def test_main_module_importable() -> None:
    assert callable(python.main.main)


def test_imports_with_repo_root_cwd() -> None:
    """Same cwd as `uv run python -m python.main` from Makefile."""
    repo_root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        [sys.executable, "-c", "from python.api.js_api import JsApi"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        timeout=15,
    )
    assert result.returncode == 0, result.stderr
    assert "No module named 'python'" not in (result.stderr or "")

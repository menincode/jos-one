"""Tests for repo-local temp directory helpers."""

from __future__ import annotations

from python.config import REPO_ROOT
from python.services.repo_temp import (
    TEMP_DIR_NAME,
    clean_repo_temp_dir,
    create_job_temp_dir,
    get_repo_temp_dir,
)


def test_get_repo_temp_dir_is_sibling_of_plugins() -> None:
    root = get_repo_temp_dir()
    assert root == REPO_ROOT / TEMP_DIR_NAME
    assert root.is_dir()
    assert root.parent / "plugins" == REPO_ROOT / "plugins"


def test_clean_repo_temp_dir_removes_previous_jobs() -> None:
    stale = create_job_temp_dir("jos-export-")
    marker = stale / "seg_000.mp4"
    marker.write_bytes(b"x")
    clean_repo_temp_dir()
    root = get_repo_temp_dir()
    assert root.is_dir()
    assert not stale.exists()
    assert list(root.iterdir()) == []


def test_create_job_temp_dir_under_repo_temp() -> None:
    job_dir = create_job_temp_dir("jos-export-")
    try:
        assert job_dir.is_dir()
        assert job_dir.parent == get_repo_temp_dir()
        assert job_dir.name.startswith("jos-export-")
    finally:
        import shutil

        shutil.rmtree(job_dir, ignore_errors=True)

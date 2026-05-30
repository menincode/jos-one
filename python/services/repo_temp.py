"""Repo-local temp workspace (sibling of ``plugins/``) for generated media."""

from __future__ import annotations

import logging
import shutil
import uuid
from pathlib import Path

from python.config import REPO_ROOT

logger = logging.getLogger(__name__)

TEMP_DIR_NAME = "temp"


def get_repo_temp_dir() -> Path:
    """``<repo>/temp`` — created on demand."""
    root = REPO_ROOT / TEMP_DIR_NAME
    root.mkdir(parents=True, exist_ok=True)
    return root


def clean_repo_temp_dir() -> Path:
    """Delete ``<repo>/temp`` and recreate it (e.g. before a new merge job)."""
    root = REPO_ROOT / TEMP_DIR_NAME
    if root.exists():
        shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True, exist_ok=True)
    logger.info("Cleaned repo temp directory: %s", root)
    return root


def create_job_temp_dir(prefix: str) -> Path:
    """
    Allocate ``<repo>/temp/{prefix}<id>/`` for one export/merge job.

    *prefix* should end with ``-`` (e.g. ``jos-export-``).
    """
    safe = "".join(c if c.isalnum() or c in "-_" else "-" for c in prefix) or "job-"
    if not safe.endswith("-"):
        safe = f"{safe}-"
    path = get_repo_temp_dir() / f"{safe}{uuid.uuid4().hex[:12]}"
    path.mkdir(parents=True, exist_ok=False)
    logger.debug("Created job temp dir: %s", path)
    return path


def remove_tree(path: Path) -> None:
    """Best-effort delete of a job temp directory."""
    try:
        shutil.rmtree(path, ignore_errors=True)
    except OSError as exc:
        logger.debug("Failed to remove temp dir %s: %s", path, exc)

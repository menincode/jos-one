"""Probe video duration off the UI thread (ffprobe in a thread pool)."""

from __future__ import annotations

import logging
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from python.services.plugin_downloader import augment_path_env, get_ffprobe_path

logger = logging.getLogger(__name__)

_PROBE_MAX_WORKERS = 4
_PROBE_TIMEOUT_SEC = 45


def _subprocess_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "capture_output": True,
        "text": True,
        "timeout": _PROBE_TIMEOUT_SEC,
        "env": augment_path_env(["ffmpeg"]),
    }
    if sys.platform == "win32":
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
    return kwargs


def probe_duration_ffprobe(file_path: str, ffprobe: Path) -> float | None:
    """Return duration in seconds via ffprobe, or None on failure."""
    try:
        completed = subprocess.run(
            [
                str(ffprobe),
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                file_path,
            ],
            **_subprocess_kwargs(),
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        logger.debug("ffprobe failed for %s: %s", file_path, exc)
        return None

    if completed.returncode != 0:
        logger.debug(
            "ffprobe exit %s for %s: %s",
            completed.returncode,
            file_path,
            (completed.stderr or "").strip(),
        )
        return None

    raw = (completed.stdout or "").strip()
    if not raw:
        return None
    try:
        value = float(raw)
    except ValueError:
        return None
    return value if value >= 0 else None


def enrich_videos_with_duration(
    videos: list[dict[str, str | int | None]],
    *,
    max_workers: int = _PROBE_MAX_WORKERS,
) -> list[dict[str, str | int | None]]:
    """Fill ``duration_sec`` on each video dict using parallel ffprobe calls."""
    if not videos:
        return videos

    ffprobe = get_ffprobe_path()
    if ffprobe is None:
        for item in videos:
            item["duration_sec"] = None
        return videos

    path_by_index = {i: str(videos[i]["path"]) for i in range(len(videos))}
    durations: dict[int, float | None] = {i: None for i in range(len(videos))}

    workers = min(max_workers, len(videos), _PROBE_MAX_WORKERS)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        future_map = {
            pool.submit(probe_duration_ffprobe, path, ffprobe): idx
            for idx, path in path_by_index.items()
        }
        for future in as_completed(future_map):
            idx = future_map[future]
            try:
                durations[idx] = future.result()
            except Exception as exc:  # noqa: BLE001 — isolate per-file failures
                logger.debug("duration probe error index=%s: %s", idx, exc)
                durations[idx] = None

    for idx, item in enumerate(videos):
        item["duration_sec"] = durations.get(idx)
    return videos

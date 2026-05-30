"""Mix row output filename: ``yyyyMMdd_HHmm_{firstVideoStem}.{ext}``."""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

_WINDOWS_INVALID = re.compile(r'[<>:"/\\|?*]')
_MULTI_SPACE = re.compile(r"\s+")


def sanitize_mix_output_stem(stem: str) -> str:
    """Make a filesystem-safe stem for mix output filenames (Windows-safe)."""
    cleaned = _WINDOWS_INVALID.sub("", stem.strip())
    cleaned = _MULTI_SPACE.sub(" ", cleaned).strip(" .")
    return cleaned or "video"


def first_video_stem(source_path: str) -> str:
    """Stem of the first source clip (``my-clip.mp4`` → ``my-clip``)."""
    clean = source_path.strip()
    if not clean:
        return "video"
    path = Path(clean)
    stem = path.stem.strip()
    return sanitize_mix_output_stem(stem) if stem else "video"


def build_mix_output_filename(
    first_source_path: str,
    format_ext: str,
    *,
    at: datetime | None = None,
) -> str:
    """Return ``yyyyMMdd_HHmm_{stem}.{ext}`` for a mix row output file."""
    when = at or datetime.now()
    ext = format_ext.strip().lstrip(".").lower() or "mp4"
    stamp = when.strftime("%Y%m%d_%H%M")
    stem = first_video_stem(first_source_path)
    return f"{stamp}_{stem}.{ext}"


def resolve_mix_output_path(
    output_folder: str | Path,
    first_source_path: str,
    format_ext: str,
    *,
    at: datetime | None = None,
) -> Path:
    """Unique path under ``output_folder``; suffix ``_2``, ``_3``, … on collision."""
    folder = Path(output_folder)
    filename = build_mix_output_filename(
        first_source_path,
        format_ext,
        at=at,
    )
    candidate = folder / filename
    if not candidate.exists():
        return candidate

    stem_part, dot, ext = filename.rpartition(".")
    suffix = 2
    while True:
        alt = folder / f"{stem_part}_{suffix}{dot}{ext}"
        if not alt.exists():
            return alt
        suffix += 1

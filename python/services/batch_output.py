"""Batch output path helpers (mirrors veo3-pro workflow.media_paths)."""

from __future__ import annotations

import re
from pathlib import Path


def slugify_segment(name: str, *, max_len: int = 120, fallback: str = "batch") -> str:
    clean = re.sub(r'[<>:"/\\|?*]', "", name.strip())
    clean = re.sub(r"\s+", "-", clean)
    clean = re.sub(r"-+", "-", clean).strip("-").strip(".")
    segment = clean[:max_len].strip("-").strip(".")
    return segment or fallback


def resolve_batch_output_dir(input_dir: Path, output_folder: str | None) -> Path:
    out_dir_raw = (output_folder or "").strip()
    if not out_dir_raw:
        return input_dir
    out_root = Path(out_dir_raw).expanduser()
    try:
        out_root = out_root.resolve()
    except OSError:
        pass
    sub_name = slugify_segment(input_dir.name, max_len=120, fallback="batch")
    return out_root / sub_name

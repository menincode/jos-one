"""List input videos with predicted output paths for watermark removal batch."""

from __future__ import annotations

from pathlib import Path

from python.services.batch_output import resolve_batch_output_dir
from python.services.remove_watermark.service import SUPPORTED_VIDEO_SUFFIXES


def list_watermark_video_rows(
    input_folder: str,
    output_folder: str | None = None,
) -> list[dict[str, str | int]]:
    safe_input = (input_folder or "").strip()
    if not safe_input:
        return []

    in_dir = Path(safe_input).expanduser()
    try:
        in_dir = in_dir.resolve()
    except OSError:
        pass
    if not in_dir.exists() or not in_dir.is_dir():
        return []

    out_dir = resolve_batch_output_dir(in_dir, output_folder)
    rows: list[dict[str, str | int]] = []

    for file in sorted(in_dir.iterdir()):
        if not file.is_file():
            continue
        if file.suffix.lower() not in SUPPORTED_VIDEO_SUFFIXES:
            continue
        rows.append(
            {
                "file_name": file.name,
                "input_path": str(file.resolve()),
                "output_path": str((out_dir / file.name).resolve()),
                "status": "pending",
                "progress_pct": 0,
            }
        )

    return rows

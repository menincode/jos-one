"""FFmpeg concat / xfade merge for planned mix rows."""

from __future__ import annotations

import logging
import random
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from python.services.mix_planner import PlannedMixRow
from python.services.plugin_downloader import augment_path_env, get_ffmpeg_path, get_ffprobe_path
from python.services.transition_spec import (
    build_gap_transitions,
    parse_transition_duration_bounds,
    parse_transition_effect,
    transitions_enabled,
)
from python.services.video_duration import probe_duration_ffprobe

logger = logging.getLogger(__name__)


def _subprocess_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "capture_output": True,
        "text": True,
        "timeout": 3600,
        "env": augment_path_env(["ffmpeg"]),
    }
    if sys.platform == "win32":
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
    return kwargs


def _escape_concat_path(path: Path) -> str:
    return str(path.resolve()).replace("'", "'\\''")


def concat_videos_copy(
    sequence_paths: list[str],
    output_path: Path,
    *,
    ffmpeg: Path | None = None,
) -> tuple[bool, str]:
    """Concatenate videos in order without re-encoding (no trim)."""
    exe = ffmpeg or get_ffmpeg_path()
    if not exe or not exe.is_file():
        return False, "FFmpeg chưa sẵn sàng. Chờ tải plugin hoặc thử lại sau."

    for raw in sequence_paths:
        if not Path(raw).is_file():
            return False, f"File không tồn tại: {raw}"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        suffix=".txt",
        delete=False,
    ) as list_file:
        list_path = Path(list_file.name)
        for raw in sequence_paths:
            list_file.write(f"file '{_escape_concat_path(Path(raw))}'\n")

    cmd = [
        str(exe),
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(list_path),
        "-c",
        "copy",
        str(output_path),
    ]

    try:
        proc = subprocess.run(cmd, **_subprocess_kwargs())
    finally:
        try:
            list_path.unlink(missing_ok=True)
        except OSError:
            logger.warning("Could not remove concat list file %s", list_path)

    if proc.returncode != 0:
        stderr = (proc.stderr or proc.stdout or "").strip()
        tail = stderr[-800:] if len(stderr) > 800 else stderr
        return False, tail or f"FFmpeg thoát với mã {proc.returncode}"

    if not output_path.is_file():
        return False, "Không tạo được file đầu ra."

    return True, ""


def _concat_two_copy(
    left: Path,
    right: Path,
    output_path: Path,
    *,
    ffmpeg: Path,
) -> tuple[bool, str]:
    return concat_videos_copy([str(left), str(right)], output_path, ffmpeg=ffmpeg)


def _xfade_two(
    left: Path,
    right: Path,
    output_path: Path,
    *,
    transition_sec: float,
    transition_name: str,
    ffmpeg: Path,
    ffprobe: Path,
) -> tuple[bool, str]:
    left_dur = probe_duration_ffprobe(str(left), ffprobe)
    if left_dur is None or left_dur <= 0:
        return False, f"Không đọc được thời lượng: {left.name}"

    duration = max(0.1, min(transition_sec, left_dur * 0.9))
    offset = max(0.0, left_dur - duration)
    filter_v = (
        f"[0:v][1:v]xfade=transition={transition_name}:duration={duration:.3f}:offset={offset:.3f}[v]"
    )
    cmd = [
        str(ffmpeg),
        "-y",
        "-i",
        str(left),
        "-i",
        str(right),
        "-filter_complex",
        filter_v,
        "-map",
        "[v]",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-an",
        str(output_path),
    ]

    proc = subprocess.run(cmd, **_subprocess_kwargs())
    if proc.returncode != 0:
        stderr = (proc.stderr or proc.stdout or "").strip()
        tail = stderr[-800:] if len(stderr) > 800 else stderr
        return False, tail or f"xfade thất bại (mã {proc.returncode})"
    if not output_path.is_file():
        return False, "xfade không tạo được file đầu ra."
    return True, ""


def merge_sequence(
    sequence_paths: list[str],
    output_path: Path,
    *,
    gap_durations: list[float],
    gap_types: list[str],
    format_ext: str = "mp4",
    ffmpeg: Path | None = None,
    ffprobe: Path | None = None,
) -> tuple[bool, str]:
    """Merge clips; xfade on gaps where duration > 0 and type is set."""
    if not sequence_paths:
        return False, "Danh sách video trống."

    exe = ffmpeg or get_ffmpeg_path()
    if not exe or not exe.is_file():
        return False, "FFmpeg chưa sẵn sàng."

    probe = ffprobe or get_ffprobe_path()
    if not probe or not probe.is_file():
        return False, "FFprobe chưa sẵn sàng."

    output_path.parent.mkdir(parents=True, exist_ok=True)
    ext = format_ext.lstrip(".").lower() or "mp4"
    if output_path.suffix.lower() != f".{ext}":
        output_path = output_path.with_suffix(f".{ext}")

    if len(sequence_paths) == 1:
        shutil.copy2(sequence_paths[0], output_path)
        return True, ""

    use_xfade = transitions_enabled(gap_durations, gap_types)
    if not use_xfade:
        return concat_videos_copy(sequence_paths, output_path, ffmpeg=exe)

    temp_dir = Path(tempfile.mkdtemp(prefix="jos-merge-"))
    try:
        current = Path(sequence_paths[0]).resolve()
        for index in range(1, len(sequence_paths)):
            next_path = Path(sequence_paths[index]).resolve()
            step_out = temp_dir / f"step_{index:03d}.{ext}"
            gap_index = index - 1
            t_sec = gap_durations[gap_index] if gap_index < len(gap_durations) else 0.0
            t_type = gap_types[gap_index] if gap_index < len(gap_types) else ""

            if t_sec > 0 and t_type:
                ok, err = _xfade_two(
                    current,
                    next_path,
                    step_out,
                    transition_sec=t_sec,
                    transition_name=t_type,
                    ffmpeg=exe,
                    ffprobe=probe,
                )
            else:
                ok, err = _concat_two_copy(current, next_path, step_out, ffmpeg=exe)

            if not ok:
                return False, err

            if index > 1 and current.parent == temp_dir:
                try:
                    current.unlink(missing_ok=True)
                except OSError:
                    pass
            current = step_out

        shutil.copy2(current, output_path)
        return True, ""
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def parse_concurrency(export_settings: dict[str, Any] | None) -> int:
    """Max parallel row exports from export settings (default 4, clamp 1–16)."""
    settings = export_settings or {}
    try:
        value = int(str(settings.get("concurrency", "4")).strip())
    except ValueError:
        value = 4
    return max(1, min(value, 16))


def export_planned_row(
    row: PlannedMixRow,
    output_dir: Path,
    *,
    format_ext: str = "mp4",
    export_settings: dict[str, Any] | None = None,
    seed: int | None = None,
) -> dict[str, str | bool]:
    """Export a single planned row to mix-{row_id}.{ext}."""
    ext = format_ext.lstrip(".").lower() or "mp4"
    settings = export_settings or {}
    min_t, max_t, t_err = parse_transition_duration_bounds(settings)
    if t_err:
        return {
            "row_id": str(row["id"]),
            "ok": False,
            "path": "",
            "message": t_err,
        }

    row_id = str(row["id"])
    out_path = output_dir / f"mix-{row_id}.{ext}"
    sequence = row["sequence_paths"]
    leading_count = len(row.get("leading_paths", []))
    effect = parse_transition_effect(settings)
    rng = random.Random(seed)
    gap_durations, gap_types = build_gap_transitions(
        leading_count=leading_count,
        sequence_len=len(sequence),
        min_sec=min_t,
        max_sec=max_t,
        effect=effect,
        rng=rng,
    )

    ok, err = merge_sequence(
        sequence,
        out_path,
        gap_durations=gap_durations,
        gap_types=gap_types,
        format_ext=ext,
    )
    return {
        "row_id": row_id,
        "ok": ok,
        "path": str(out_path) if ok else "",
        "message": err,
    }


def run_planned_rows(
    planned_rows: list[PlannedMixRow],
    output_dir: Path,
    *,
    format_ext: str = "mp4",
    export_settings: dict[str, Any] | None = None,
    cancel_check: Any | None = None,
    seed: int | None = None,
    stop_on_first_error: bool = True,
) -> dict[str, Any]:
    """Export one file per planned row: mix-{row_id}.{ext}."""
    results: list[dict[str, str | bool]] = []
    ext = format_ext.lstrip(".").lower() or "mp4"
    rng = random.Random(seed)

    for index, row in enumerate(planned_rows):
        if cancel_check and cancel_check():
            return {
                "ok": False,
                "message": "Đã hủy ghép video.",
                "outputs": results,
            }

        row_seed = seed + index if seed is not None else None
        result = export_planned_row(
            row,
            output_dir,
            format_ext=ext,
            export_settings=export_settings,
            seed=row_seed if row_seed is not None else None,
        )
        results.append(result)
        if not result["ok"] and stop_on_first_error:
            return {
                "ok": False,
                "message": str(result.get("message") or "Ghép video thất bại."),
                "outputs": results,
            }

    failed = [item for item in results if not item["ok"]]
    if failed:
        return {
            "ok": False,
            "message": str(failed[0].get("message") or "Ghép video thất bại."),
            "outputs": results,
        }

    return {"ok": True, "message": "", "outputs": results}

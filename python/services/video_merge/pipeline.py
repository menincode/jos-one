"""Video merge pipeline: planner, per-clip render, concat join."""

from __future__ import annotations

import logging
import random
import re
import shlex
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any, Callable

from python.path_display import relativize_ffmpeg_cmd_for_log
from python.services.plugin_downloader import get_ffmpeg_path, get_ffprobe_path
from python.services.video_merge.io import ExportRenderConfig, probe_media
from python.services.video_merge import chapter_timestamps, mix_filter_graph, transition_spec

logger = logging.getLogger(__name__)
_ffmpeg_log = logging.getLogger("ffmpeg")

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".wmv"}
_X264_ARGS_FAST = [
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-crf",
    "20",
]
# Strip/override source metadata on every exported file (legacy JOS ffmpeg.json parity).
OUTPUT_METADATA_ARGS = [
    "-metadata",
    "album_artist=",
    "-metadata",
    "album=",
    "-metadata",
    "date=",
    "-metadata",
    "track=",
    "-metadata",
    "genre=",
    "-metadata",
    "publisher=",
    "-metadata",
    "encoded_by=",
    "-metadata",
    "copyright=",
    "-metadata",
    "composer=",
    "-metadata",
    "performer=",
    "-metadata",
    "TIT1=",
    "-metadata",
    "TIT3=",
    "-metadata",
    "disc=",
    "-metadata",
    "TKEY=",
    "-metadata",
    "TBPM=",
    "-metadata",
    "language=eng",
    "-metadata",
    "encoder=",
]
AAC_ARGS = ["-c:a", "aac", "-b:a", "192k"]

_TIME_RE = re.compile(r"time=(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)")
_DURATION_RE = re.compile(
    r"Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)",
    re.IGNORECASE,
)
_SPEED_RE = re.compile(r"speed=\s*([\d.]+)x")

# Per-row pipeline phases (bridge `row_states[].phase` + UI state machine).
ROW_PHASE_PROCESSING = "processing"
ROW_PHASE_MIX_VIDEO = "mix_video"
ROW_PHASE_NORMALIZE = "normalize"
ROW_PHASE_CONCAT = "concat"

_FPS_MATCH_EPSILON = 0.05

_LOGO_OVERLAY = {
    "top_left": "10:10",
    "top_center": "(W-w)/2:10",
    "top_right": "W-w-10:10",
    "center_left": "10:(H-h)/2",
    "center": "(W-w)/2:(H-h)/2",
    "center_right": "W-w-10:(H-h)/2",
    "bottom_left": "10:H-h-10",
    "bottom_center": "(W-w)/2:H-h-10",
    "bottom_right": "W-w-10:H-h-10",
}


def _hms_to_seconds(h: str, m: str, s: str) -> float:
    return int(h) * 3600 + int(m) * 60 + float(s)


def _parse_duration_from_log(log: str) -> float | None:
    render_times = _TIME_RE.findall(log)
    if render_times:
        h, m, s = render_times[-1]
        return _hms_to_seconds(h, m, s)
    for match in _DURATION_RE.finditer(log):
        h, m, s = match.groups()
        return _hms_to_seconds(h, m, s)
    return None


def _parse_speed_from_log(log: str) -> float | None:
    speeds = _SPEED_RE.findall(log)
    if not speeds:
        return None
    try:
        return float(speeds[-1])
    except ValueError:
        return None


def _get_binaries() -> tuple[Path, Path] | tuple[None, None]:
    ffmpeg_path = get_ffmpeg_path()
    ffprobe_path = get_ffprobe_path()
    if ffmpeg_path is None or ffprobe_path is None:
        return None, None
    return ffmpeg_path, ffprobe_path


def _probe_media(path: str, ffprobe: Path) -> dict[str, Any] | None:
    return probe_media(path, ffprobe)


def _register_proc(proc: subprocess.Popen[Any]) -> None:
    try:
        from python.services.video_merge import job as merge_job

        merge_job.register_proc(proc)
    except Exception:
        pass


def _win_creationflags() -> int:
    if sys.platform != "win32":
        return 0
    return subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]


def _format_ffmpeg_cmd(cmd: list[str]) -> str:
    return shlex.join(relativize_ffmpeg_cmd_for_log(cmd))


def log_ffmpeg_command_before_render(label: str, cmd: list[str]) -> None:
    """Log the full FFmpeg argv immediately before starting a render/concat."""
    formatted = _format_ffmpeg_cmd(cmd)
    message = f"{label} — FFmpeg command: {formatted}"
    logger.info(message)
    _ffmpeg_log.info(message)


def _video_codec_args(ffmpeg_bin: Path) -> list[str]:
    """H.264 encoder args (CPU libx264 only)."""
    _ffmpeg_log.info("Using CPU encoder (libx264 preset=veryfast)")
    return list(_X264_ARGS_FAST)


def _even_dimension(value: int) -> int:
    """libx264/yuv420p requires even width and height."""
    n = max(2, int(value))
    return n if n % 2 == 0 else n - 1


def _summarize_ffmpeg_stderr(log: str) -> str:
    lines = [line.strip() for line in log.splitlines() if line.strip()]
    for line in reversed(lines):
        lower = line.lower()
        if (
            "error" in lower
            or "invalid" in lower
            or "failed" in lower
            or "not divisible" in lower
        ):
            return line[:400]
    if lines:
        return lines[-1][:400]
    return ""


def _run_ffmpeg(
    cmd: list[str],
    *,
    on_stderr_line: Callable[[str], None] | None = None,
    cancel_check: Callable[[], bool] | None = None,
) -> tuple[bool, str, str]:
    if cancel_check and cancel_check():
        return False, "Đã hủy.", ""

    _ffmpeg_log.debug("Starting FFmpeg subprocess")

    stderr_chunks: list[str] = []
    stdout_chunks: list[str] = []
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=_win_creationflags(),
        )
    except OSError as exc:
        _ffmpeg_log.error("FFmpeg failed to start: %s", exc)
        return False, f"Không chạy được FFmpeg: {exc}", ""

    _register_proc(proc)
    assert proc.stderr is not None
    assert proc.stdout is not None

    def read_stderr() -> None:
        for line in proc.stderr:
            stderr_chunks.append(line)
            if on_stderr_line:
                on_stderr_line(line)
            stripped = line.rstrip("\n\r")
            if stripped:
                _ffmpeg_log.debug("FFmpeg stderr: %s", stripped)

    def read_stdout() -> None:
        for line in proc.stdout:
            stdout_chunks.append(line)
            stripped = line.rstrip("\n\r")
            if stripped:
                _ffmpeg_log.info("FFmpeg stdout: %s", stripped)

    stderr_reader = threading.Thread(target=read_stderr, daemon=True)
    stdout_reader = threading.Thread(target=read_stdout, daemon=True)
    stderr_reader.start()
    stdout_reader.start()

    while proc.poll() is None:
        if cancel_check and cancel_check():
            _terminate_proc(proc)
            stderr_reader.join(timeout=2)
            stdout_reader.join(timeout=2)
            return False, "Đã hủy.", "".join(stderr_chunks)
        stderr_reader.join(timeout=0.05)

    stderr_reader.join(timeout=5)
    stdout_reader.join(timeout=5)

    stdout_text = "".join(stdout_chunks)
    if stdout_text.strip():
        _ffmpeg_log.info("FFmpeg stdout (complete): %s", stdout_text.rstrip())

    log = "".join(stderr_chunks)
    if proc.returncode != 0:
        _ffmpeg_log.warning(
            "FFmpeg exited with code %s (stderr tail): %s",
            proc.returncode,
            log[-4000:].rstrip() or "(empty)",
        )
        hint = _summarize_ffmpeg_stderr(log)
        message = f"FFmpeg lỗi (mã {proc.returncode})."
        if hint:
            message = f"{message} {hint}"
        return False, message, log
    _ffmpeg_log.info("FFmpeg finished successfully (exit 0)")
    return True, "", log


def _terminate_proc(proc: subprocess.Popen[Any]) -> None:
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                capture_output=True,
                check=False,
            )
        else:
            proc.terminate()
    except OSError:
        pass


def plan_mix_rows(
    mix_rows: list[dict],
    videos: list[dict],
    *,
    duration_min_sec: float,
    duration_max_sec: float,
    seed: int | None = None,
) -> dict[str, Any]:
    rng = random.Random(seed)
    duration_by_path: dict[str, float] = {}
    video_paths: list[str] = []
    for video in videos:
        path = str(video.get("path", "")).strip()
        if not path:
            continue
        video_paths.append(path)
        dur = video.get("duration_sec")
        if dur is not None:
            try:
                duration_by_path[path] = float(dur)
            except (TypeError, ValueError):
                pass

    for row in mix_rows:
        for path in row.get("leading_paths", []):
            p = str(path).strip()
            if not p:
                continue
            if p not in duration_by_path:
                return {"ok": False, "message": f"Không có thời lượng cho video: {p}"}

    n_rows = len(mix_rows)
    future_leading: list[set[str]] = []
    for i in range(n_rows):
        reserved = {
            str(p).strip()
            for j in range(i + 1, n_rows)
            for p in mix_rows[j].get("leading_paths", [])
        }
        future_leading.append(reserved)

    used_tail: set[str] = set()
    result_rows: list[dict[str, Any]] = []

    for i, row in enumerate(mix_rows):
        row_id = str(row.get("id", "")).strip()
        leading = [str(p).strip() for p in row.get("leading_paths", []) if str(p).strip()]
        if not leading:
            return {"ok": False, "message": "Thiếu video đầu cho một dòng mix."}

        leading_dur = sum(duration_by_path[p] for p in leading)
        if leading_dur > duration_max_sec:
            return {
                "ok": False,
                "message": "Tổng thời lượng video đầu vượt quá giới hạn tối đa.",
            }

        leading_set = set(leading)
        pool = [
            p
            for p in video_paths
            if p not in leading_set
            and p not in future_leading[i]
            and p not in used_tail
            and p in duration_by_path
        ]
        pool_shuffled = list(pool)
        rng.shuffle(pool_shuffled)

        tail = _pick_tail_paths(
            leading_dur,
            pool_shuffled,
            duration_by_path,
            duration_min_sec,
            duration_max_sec,
        )
        for p in tail:
            used_tail.add(p)

        sequence = leading + tail
        total = sum(duration_by_path[p] for p in sequence)
        result_rows.append(
            {
                "id": row_id,
                "leading_paths": leading,
                "tail_paths": tail,
                "sequence_paths": sequence,
                "total_duration_sec": total,
            }
        )

    return {"ok": True, "rows": result_rows}


def _pick_tail_paths(
    leading_dur: float,
    pool: list[str],
    duration_by_path: dict[str, float],
    min_sec: float,
    max_sec: float,
) -> list[str]:
    if min_sec <= leading_dur <= max_sec:
        return []

    need_min = min_sec - leading_dur
    need_max = max_sec - leading_dur

    if need_min <= 0:
        return []

    found = _find_tail_subset(pool, duration_by_path, need_min, need_max)
    if found is not None:
        return found

    for path in pool:
        if leading_dur + duration_by_path[path] >= min_sec:
            return [path]

    return list(pool)


def _find_tail_subset(
    pool: list[str],
    duration_by_path: dict[str, float],
    target_min: float,
    target_max: float,
    start: int = 0,
    current: list[str] | None = None,
) -> list[str] | None:
    chosen = current or []
    total = sum(duration_by_path[p] for p in chosen)
    if total >= target_min and total <= target_max:
        return chosen
    if total > target_max:
        return None
    for idx in range(start, len(pool)):
        result = _find_tail_subset(
            pool,
            duration_by_path,
            target_min,
            target_max,
            idx + 1,
            chosen + [pool[idx]],
        )
        if result is not None:
            return result
    return None


def _parse_stream_fps(stream: dict[str, Any]) -> float | None:
    rate = stream.get("avg_frame_rate") or stream.get("r_frame_rate")
    if not rate or rate in ("0/0", "N/A"):
        return None
    text = str(rate)
    if "/" in text:
        num_s, den_s = text.split("/", 1)
        try:
            num = float(num_s)
            den = float(den_s)
            return num / den if den else None
        except ValueError:
            return None
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def _probe_video_stream(path: str, ffprobe: Path) -> tuple[int, int, float] | None:
    meta = _probe_media(path, ffprobe)
    if not meta:
        return None
    for stream in meta.get("streams") or []:
        if stream.get("codec_type") != "video":
            continue
        try:
            width = int(stream.get("width") or 0)
            height = int(stream.get("height") or 0)
        except (TypeError, ValueError):
            continue
        if width <= 0 or height <= 0:
            continue
        fps = _parse_stream_fps(stream)
        if fps is None:
            return None
        return width, height, fps
    return None


def _source_matches_export(
    source_width: int,
    source_height: int,
    source_fps: float,
    target_width: int,
    target_height: int,
    target_fps: int,
) -> bool:
    return (
        source_width == target_width
        and source_height == target_height
        and abs(source_fps - float(target_fps)) <= _FPS_MATCH_EPSILON
    )


def _build_video_filter_chain(
    width: int,
    height: int,
    fps: int,
    zoom: float,
    speed: float,
    *,
    source_width: int | None = None,
    source_height: int | None = None,
    source_fps: float | None = None,
    force_fps: bool = False,
) -> str:
    """Build per-clip filter chain.

    When source resolution and fps already match export targets, skip ``scale`` to
    target size and ``fps`` — only random zoom (scale by factor) and speed remain.

    Set ``force_fps`` when clip outputs feed ``xfade``/``concat`` in one graph so
    every branch shares the same CFR timebase (avoids xfade timebase mismatch).
    """
    speed_div = f"{speed:.6f}" if speed > 0 else "1.0"
    skip_target_scale = (
        source_width is not None
        and source_height is not None
        and source_fps is not None
        and _source_matches_export(
            source_width, source_height, source_fps, width, height, fps
        )
    )
    base_w = source_width if skip_target_scale else width
    base_h = source_height if skip_target_scale else height
    scale_w = _even_dimension(int(base_w * zoom))
    scale_h = _even_dimension(int(base_h * zoom))
    parts = [
        "setpts=PTS-STARTPTS",
        f"scale={scale_w}:{scale_h}",
    ]
    # Every segment must share export W×H for concat demuxer -c copy (DS004).
    if scale_w >= width and scale_h >= height:
        parts.append(f"crop={width}:{height}:(iw-{width})/2:(ih-{height})/2")
    else:
        parts.append(f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black")
    if force_fps or not skip_target_scale:
        parts.append(f"fps={fps}")
    parts.extend([f"setpts=PTS/{speed_div}", "format=yuv420p"])
    return ",".join(parts)


def _build_audio_chain(
    speed: float,
    source_dur: float | None,
    *,
    audio_in: str = "0:a",
    audio_out: str = "a",
) -> str:
    inner: list[str] = []
    if source_dur and source_dur > 0:
        out_dur = source_dur / speed if speed > 0 else source_dur
        inner.append(f"atrim=duration={out_dur:.3f}")
    if abs(speed - 1.0) > 0.001:
        inner.append(f"atempo={speed:.6f}")
    inner.append("asetpts=PTS-STARTPTS")
    if inner:
        return f"[{audio_in}]{','.join(inner)}[{audio_out}]"
    return f"[{audio_in}]asetpts=PTS-STARTPTS[{audio_out}]"


def _probe_source_duration(path: str, ffprobe: Path) -> float | None:
    meta = _probe_media(path, ffprobe)
    if not meta:
        return None
    fmt = meta.get("format") or {}
    try:
        return float(fmt.get("duration", 0))
    except (TypeError, ValueError):
        return None


def _probe_has_audio(path: str, ffprobe: Path) -> bool:
    meta = _probe_media(path, ffprobe)
    if not meta:
        return False
    for stream in meta.get("streams") or []:
        if stream.get("codec_type") == "audio":
            return True
    return False


def _render_segment(
    src: Path,
    dest: Path,
    config: ExportRenderConfig,
    zoom: float,
    speed: float,
    ffmpeg_bin: Path,
    ffprobe_bin: Path,
    *,
    on_progress: Callable[[float | None, float | None], None] | None = None,
    cancel_check: Callable[[], bool] | None = None,
) -> tuple[bool, str]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Probing clip: %s", src.name)
    source_dur = _probe_source_duration(str(src), ffprobe_bin)
    has_audio = _probe_has_audio(str(src), ffprobe_bin)
    logger.info(
        "Probe result clip=%s duration=%s has_audio=%s",
        src.name,
        f"{source_dur:.3f}s" if source_dur is not None else "unknown",
        has_audio,
    )
    stream = _probe_video_stream(str(src), ffprobe_bin)
    src_w, src_h, src_fps = stream if stream else (None, None, None)
    if stream:
        logger.info(
            "Clip stream clip=%s %sx%s @ %.3ffps match_export=%s",
            src.name,
            src_w,
            src_h,
            src_fps,
            _source_matches_export(
                src_w, src_h, src_fps, config.width, config.height, config.fps
            ),
        )
    vfilter = _build_video_filter_chain(
        config.width,
        config.height,
        config.fps,
        zoom,
        speed,
        source_width=src_w,
        source_height=src_h,
        source_fps=src_fps,
    )

    logo_file = config.logo_path
    use_logo = bool(logo_file and Path(logo_file).is_file())
    overlay_pos = _LOGO_OVERLAY.get(
        config.logo_position, _LOGO_OVERLAY["bottom_right"]
    )

    stderr_acc: list[str] = []

    def on_line(line: str) -> None:
        stderr_acc.append(line)
        if on_progress:
            chunk = "".join(stderr_acc[-20:])
            on_progress(
                _parse_duration_from_log(chunk),
                _parse_speed_from_log(chunk),
            )

    if use_logo:
        vchain = (
            f"[0:v]{vfilter}[vnorm];[1:v]format=rgba[logo];"
            f"[vnorm][logo]overlay={overlay_pos}[vout]"
        )
    else:
        vchain = f"[0:v]{vfilter}[vout]"
    if has_audio:
        achain = _build_audio_chain(speed, source_dur)
        filter_complex = f"{vchain};{achain}"
        maps = ["-map", "[vout]", "-map", "[a]"]
    else:
        filter_complex = vchain
        maps = ["-map", "[vout]"]

    def build_cmd(codec_args: list[str]) -> list[str]:
        out = [
            str(ffmpeg_bin),
            "-y",
            "-i",
            str(src),
        ]
        if use_logo:
            out.extend(["-i", str(Path(logo_file).resolve())])
        out.extend(
            [
                "-filter_complex",
                filter_complex,
                *maps,
                *codec_args,
            ]
        )
        if has_audio:
            out.extend(AAC_ARGS)
        else:
            out.append("-an")
        out.extend(OUTPUT_METADATA_ARGS)
        out.append(str(dest))
        return out

    cmd = build_cmd(_video_codec_args(ffmpeg_bin))
    log_ffmpeg_command_before_render(
        f"Render segment {src.name} → {dest.name}",
        cmd,
    )
    ok, msg, _log = _run_ffmpeg(cmd, on_stderr_line=on_line, cancel_check=cancel_check)
    return ok, msg


def _write_concat_list(segment_paths: list[Path], list_path: Path) -> None:
    lines = [f"file '{p.resolve().as_posix().replace(chr(39), chr(39) * 2)}'" for p in segment_paths]
    list_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _concat_segments(
    segment_paths: list[Path],
    output_path: Path,
    ffmpeg_bin: Path,
    *,
    on_progress: Callable[[float | None, float | None], None] | None = None,
    cancel_check: Callable[[], bool] | None = None,
) -> tuple[bool, str, str]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    list_file = output_path.parent / "concat_list.txt"
    _write_concat_list(segment_paths, list_file)

    cmd = [
        str(ffmpeg_bin),
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(list_file),
        "-c",
        "copy",
        *OUTPUT_METADATA_ARGS,
        str(output_path),
    ]

    stderr_acc: list[str] = []

    def on_line(line: str) -> None:
        stderr_acc.append(line)
        if on_progress:
            chunk = "".join(stderr_acc[-20:])
            on_progress(
                _parse_duration_from_log(chunk),
                _parse_speed_from_log(chunk),
            )

    log_ffmpeg_command_before_render(
        f"Concat {len(segment_paths)} segments → {output_path.name}",
        cmd,
    )
    ok, msg, log = _run_ffmpeg(cmd, on_stderr_line=on_line, cancel_check=cancel_check)
    return ok, msg, log


def _xfade_segments(
    segment_paths: list[Path],
    output_path: Path,
    export_config: ExportRenderConfig,
    ffmpeg_bin: Path,
    ffprobe_bin: Path,
    join_plan: chapter_timestamps.JoinTransitionPlan,
    *,
    on_progress: Callable[[float | None, float | None], None] | None = None,
    cancel_check: Callable[[], bool] | None = None,
) -> tuple[bool, str, str]:
    """Join normalized segments with chained xfade / acrossfade (re-encode once)."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    durations: list[float] = []
    for path in segment_paths:
        probed = _probe_source_duration(str(path), ffprobe_bin)
        if probed is None or probed <= 0:
            return False, f"Không đọc được thời lượng segment: {path.name}", ""
        durations.append(probed)

    has_audio_flags = [_probe_has_audio(str(path), ffprobe_bin) for path in segment_paths]
    include_audio = all(has_audio_flags)
    if not include_audio and any(has_audio_flags):
        logger.info(
            "Mixed audio segments; joining with video xfade only (no audio track)."
        )

    transitions = list(join_plan.transitions)
    transition_durations = list(join_plan.overlaps)
    if len(transitions) != max(0, len(segment_paths) - 1):
        return False, "Lỗi cấu hình xfade (số transition không khớp).", ""

    filter_complex = transition_spec.build_xfade_filter_complex(
        segment_count=len(segment_paths),
        durations=durations,
        transitions=transitions,
        transition_durations=transition_durations,
        include_audio=include_audio,
    )

    stderr_acc: list[str] = []

    def on_line(line: str) -> None:
        stderr_acc.append(line)
        if on_progress:
            chunk = "".join(stderr_acc[-20:])
            on_progress(
                _parse_duration_from_log(chunk),
                _parse_speed_from_log(chunk),
            )

    def build_cmd(codec_args: list[str]) -> list[str]:
        cmd = [str(ffmpeg_bin), "-y"]
        for path in segment_paths:
            cmd.extend(["-i", str(path.resolve())])
        cmd.extend(["-filter_complex", filter_complex, "-map", "[vout]"])
        if include_audio:
            cmd.extend(["-map", "[aout]", *AAC_ARGS])
        else:
            cmd.append("-an")
        cmd.extend(codec_args)
        cmd.extend(OUTPUT_METADATA_ARGS)
        cmd.append(str(output_path))
        return cmd

    cmd = build_cmd(_video_codec_args(ffmpeg_bin))
    log_ffmpeg_command_before_render(
        f"Xfade join {len(segment_paths)} segments → {output_path.name}",
        cmd,
    )
    ok, msg, log = _run_ffmpeg(cmd, on_stderr_line=on_line, cancel_check=cancel_check)
    return ok, msg, log


def _join_segments(
    segment_paths: list[Path],
    output_path: Path,
    export_config: ExportRenderConfig,
    ffmpeg_bin: Path,
    ffprobe_bin: Path,
    rng: random.Random,
    *,
    join_plan: chapter_timestamps.JoinTransitionPlan | None = None,
    on_progress: Callable[[float | None, float | None], None] | None = None,
    cancel_check: Callable[[], bool] | None = None,
) -> tuple[bool, str, str]:
    """Join rendered segments — xfade when configured, otherwise concat copy."""
    if not segment_paths:
        return False, "Không có segment để nối.", ""
    if len(segment_paths) == 1:
        return _concat_segments(
            segment_paths,
            output_path,
            ffmpeg_bin,
            on_progress=on_progress,
            cancel_check=cancel_check,
        )

    if join_plan is None:
        durations: list[float] = []
        for path in segment_paths:
            probed = _probe_source_duration(str(path), ffprobe_bin)
            if probed is None or probed <= 0:
                return False, f"Không đọc được thời lượng segment: {path.name}", ""
            durations.append(probed)
        join_plan = chapter_timestamps.resolve_join_plan(durations, export_config, rng)

    if not join_plan.use_xfade:
        return _concat_segments(
            segment_paths,
            output_path,
            ffmpeg_bin,
            on_progress=on_progress,
            cancel_check=cancel_check,
        )
    return _xfade_segments(
        segment_paths,
        output_path,
        export_config,
        ffmpeg_bin,
        ffprobe_bin,
        join_plan,
        on_progress=on_progress,
        cancel_check=cancel_check,
    )


def _parallel_clip_display_index(
    *,
    total: int,
    started: set[int],
    done: set[int],
) -> int:
    from python.services.video_merge.ffmpeg_pool import parallel_clip_display_index

    return parallel_clip_display_index(total=total, started=started, done=done)


def _assign_clip_effects(
    paths: list[str],
    config: ExportRenderConfig,
    rng: random.Random,
) -> list[tuple[float, float]]:
    effects: list[tuple[float, float]] = []
    for _ in paths:
        zoom = rng.uniform(config.zoom_min, config.zoom_max)
        speed = rng.uniform(config.speed_min, config.speed_max)
        effects.append((zoom, speed))
    return effects


def _probe_clip_for_mix(path: str, ffprobe_bin: Path) -> mix_filter_graph.ClipProbe:
    source_dur = _probe_source_duration(path, ffprobe_bin)
    has_audio = _probe_has_audio(path, ffprobe_bin)
    stream = _probe_video_stream(path, ffprobe_bin)
    src_w, src_h, src_fps = stream if stream else (None, None, None)
    return mix_filter_graph.ClipProbe(
        path=path,
        source_duration=source_dur,
        has_audio=has_audio,
        source_width=src_w,
        source_height=src_h,
        source_fps=src_fps,
    )


def _render_mix_unified(
    *,
    sequence_paths: list[str],
    effects: list[tuple[float, float]],
    export_config: ExportRenderConfig,
    output_path: Path,
    ffmpeg_bin: Path,
    ffprobe_bin: Path,
    join_plan: chapter_timestamps.JoinTransitionPlan,
    segment_durations: list[float],
    probes: list[mix_filter_graph.ClipProbe],
    on_progress: Callable[[float | None, float | None], None] | None = None,
    cancel_check: Callable[[], bool] | None = None,
) -> tuple[bool, str, str]:
    """Run one FFmpeg command: normalize + logo + join for all clips."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    stderr_acc: list[str] = []

    def on_line(line: str) -> None:
        stderr_acc.append(line)
        if on_progress:
            chunk = "".join(stderr_acc[-20:])
            on_progress(
                _parse_duration_from_log(chunk),
                _parse_speed_from_log(chunk),
            )

    def build_cmd(codec_args: list[str]) -> list[str]:
        return mix_filter_graph.build_unified_mix_command(
            sequence_paths=sequence_paths,
            effects=effects,
            export_config=export_config,
            output_path=output_path,
            ffmpeg_bin=ffmpeg_bin,
            join_plan=join_plan,
            segment_durations=segment_durations,
            probes=probes,
            codec_args=codec_args,
            build_video_filter_chain=_build_video_filter_chain,
            build_audio_chain=_build_audio_chain,
            aac_args=AAC_ARGS,
            output_metadata_args=OUTPUT_METADATA_ARGS,
        )

    clip_names = ", ".join(Path(path).name for path in sequence_paths[:3])
    if len(sequence_paths) > 3:
        clip_names += f", +{len(sequence_paths) - 3}"
    label = f"Mix {len(sequence_paths)} clips ({clip_names}) → {output_path.name}"

    cmd = build_cmd(_video_codec_args(ffmpeg_bin))
    log_ffmpeg_command_before_render(label, cmd)
    ok, msg, log = _run_ffmpeg(cmd, on_stderr_line=on_line, cancel_check=cancel_check)
    return ok, msg, log


def render_mix_row(
    *,
    row_id: str,
    sequence_paths: list[str],
    export_config: ExportRenderConfig,
    output_path: Path,
    temp_dir: Path,
    on_progress: Callable[[float, float, str, str], None] | None = None,
    cancel_check: Callable[[], bool],
) -> tuple[bool, str, float | None, float | None, str]:
    binaries = _get_binaries()
    if binaries[0] is None or binaries[1] is None:
        return False, "Chưa cài FFmpeg/ffprobe. Vui lòng tải plugin trong ứng dụng.", None, None, ""

    ffmpeg_bin, ffprobe_bin = binaries
    temp_dir.mkdir(parents=True, exist_ok=True)
    rng = random.Random()
    effects = _assign_clip_effects(sequence_paths, export_config, rng)
    n = len(sequence_paths)
    last_duration: float | None = None
    last_speed: float | None = None

    def emit_progress(
        dur: float | None,
        speed: float | None,
        message: str,
        phase: str,
    ) -> None:
        nonlocal last_duration, last_speed
        if dur is not None:
            last_duration = dur
        if speed is not None:
            last_speed = speed
        if on_progress:
            on_progress(last_duration or 0.0, last_speed or 0.0, message, phase)

    emit_progress(None, None, "Mix video", ROW_PHASE_MIX_VIDEO)

    if cancel_check():
        return False, "Đã hủy.", last_duration, last_speed, ""

    probes: list[mix_filter_graph.ClipProbe] = []
    for path in sequence_paths:
        if cancel_check():
            return False, "Đã hủy.", last_duration, last_speed, ""
        probes.append(_probe_clip_for_mix(path, ffprobe_bin))

    segment_durations = [
        mix_filter_graph.effective_segment_duration(probe.source_duration, effects[i][1])
        for i, probe in enumerate(probes)
    ]
    if any(duration <= 0 for duration in segment_durations):
        return False, "Không đọc được thời lượng clip.", last_duration, last_speed, ""

    join_plan = chapter_timestamps.resolve_join_plan(
        segment_durations,
        export_config,
        rng,
    )
    chaptime = chapter_timestamps.build_chapter_text(
        sequence_paths,
        segment_durations,
        join_plan,
    )

    join_label = "Ghép video"
    emit_progress(None, None, join_label, ROW_PHASE_CONCAT)

    def on_join_progress(dur: float | None, speed: float | None) -> None:
        speed_s = f"{speed:.1f}x" if speed is not None else "—"
        mm = int((dur or 0) // 60)
        ss = int((dur or 0) % 60)
        emit_progress(
            dur,
            speed,
            f"{join_label} · {speed_s} · {mm:02d}:{ss:02d}",
            ROW_PHASE_CONCAT,
        )

    ok, msg, log = _render_mix_unified(
        sequence_paths=sequence_paths,
        effects=effects,
        export_config=export_config,
        output_path=output_path,
        ffmpeg_bin=ffmpeg_bin,
        ffprobe_bin=ffprobe_bin,
        join_plan=join_plan,
        segment_durations=segment_durations,
        probes=probes,
        on_progress=on_join_progress,
        cancel_check=cancel_check,
    )
    if not ok:
        return False, msg, last_duration, last_speed, ""

    final_dur = _parse_duration_from_log(log) or last_duration
    final_speed = _parse_speed_from_log(log) or last_speed
    if final_dur is None:
        probed = _probe_source_duration(str(output_path), ffprobe_bin)
        if probed is not None:
            final_dur = probed

    if on_progress and final_dur is not None:
        speed_s = f"{final_speed:.1f}x" if final_speed is not None else "—"
        on_progress(
            final_dur,
            final_speed or 0.0,
            f"Thời lượng xuất (FFmpeg): {final_dur:.1f}s · speed {speed_s}",
            ROW_PHASE_CONCAT,
        )

    return True, "", final_dur, final_speed, chaptime

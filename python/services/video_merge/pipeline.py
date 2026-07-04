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
from python.services.settings_service import get_app_settings
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

def _audio_codec_args(target_a_kbps: int | None = None) -> list[str]:
    if target_a_kbps is not None:
        return ["-c:a", "aac", "-b:a", f"{target_a_kbps}k"]
    return list(AAC_ARGS)


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

# Unified mix opens every source in one filter graph — fast for short rows, OOM on long ones.
_UNIFIED_MAX_CLIPS = 4
_UNIFIED_MAX_TOTAL_DURATION_SEC = 90 * 60
# Chunked mix: unified pass per batch of clips, then join chunk files (long rows).
_CHUNK_BATCH_SIZE = _UNIFIED_MAX_CLIPS
# Pre-normalized segment joins: single-pass xfade is one libx264 pass; pairwise re-encodes
# the growing partial output each step (O(n^2) wall time on 3h mixes — see app.log 2026-06-17).
_XFADE_SINGLE_PASS_MAX_SEGMENTS = 20
# Pairwise xfade keeps at most two decoded inputs in memory (vs N inputs in one graph).
_XFADE_PAIRWISE_MIN_SEGMENTS = 3
_FFMPEG_JOIN_RESOURCE_ARGS = ["-threads", "2", "-filter_threads", "1"]

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


def _probe_bitrates(path: str, ffprobe: Path) -> tuple[int, int]:
    meta = probe_media(path, ffprobe)
    if not meta:
        return 0, 0
    v_br = 0
    a_br = 0
    for stream in meta.get("streams") or []:
        codec_type = stream.get("codec_type")
        br = stream.get("bit_rate")
        if br:
            try:
                val = int(br) // 1000
                if codec_type == "video":
                    v_br = max(v_br, val)
                elif codec_type == "audio":
                    a_br = max(a_br, val)
            except (ValueError, TypeError):
                pass
    if v_br == 0:
        fmt = meta.get("format") or {}
        fmt_br = fmt.get("bit_rate")
        if fmt_br:
            try:
                v_br = int(fmt_br) // 1000
            except (ValueError, TypeError):
                pass
    return v_br, a_br


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


def _resolve_target_bitrates(detected_v: int, detected_a: int) -> tuple[int, int]:
    app_settings = get_app_settings()
    if app_settings.get("enable_custom_bitrate"):
        return app_settings["custom_video_bitrate"], app_settings["custom_audio_bitrate"]
    return max(5000, detected_v), max(192, detected_a)

def _video_codec_args(ffmpeg_bin: Path, target_v_kbps: int | None = None) -> list[str]:
    """H.264 encoder args (CPU libx264 only)."""
    if target_v_kbps is not None:
        _ffmpeg_log.info(f"Using CPU encoder (libx264) with target bitrate {target_v_kbps}k")
        return [
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-preset",
            "veryfast",
            "-b:v",
            f"{target_v_kbps}k",
            "-maxrate",
            f"{int(target_v_kbps * 1.5)}k",
            "-bufsize",
            f"{target_v_kbps * 2}k",
        ]
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
        # Speed adjustment must come BEFORE fps so the fps filter normalises
        # the already-sped-up stream to a clean CFR timebase.
        # Wrong order (fps → setpts/speed) causes PTS drift → muxer dups.
        parts.extend([f"setpts=PTS/{speed_div}", f"fps={fps}"])
    else:
        parts.append(f"setpts=PTS/{speed_div}")
    parts.extend(["format=yuv420p", "setsar=1"])
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
        force_fps=True,
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

    def build_cmd(codec_args: list[str], a_codec_args: list[str]) -> list[str]:
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
            out.extend(a_codec_args)
        else:
            out.append("-an")
        out.extend(OUTPUT_METADATA_ARGS)
        out.append(str(dest))
        return out

    v_kbps, a_kbps = _probe_bitrates(str(src), ffprobe_bin)
    target_v, target_a = _resolve_target_bitrates(v_kbps, a_kbps)

    cmd = build_cmd(_video_codec_args(ffmpeg_bin, target_v), _audio_codec_args(target_a))
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


_FAST_CONCAT_VIDEO_CODECS = {"h264", "hevc", "h265", "vp9", "av1"}
_FAST_CONCAT_AUDIO_CODECS = {"aac", "mp3", "opus", "vorbis", "flac", "pcm_s16le"}
_FAST_CONCAT_FPS_EPS = 0.5
_FAST_CONCAT_SAR_OK = {(0, 1), (1, 1), (0, 0)}  # unspecified or square


def _can_fast_concat(
    probes: list[mix_filter_graph.ClipProbe],
    export_config: ExportRenderConfig,
    join_plan: chapter_timestamps.JoinTransitionPlan,
    effects: list[tuple[float, float]],
) -> bool:
    """Return True when all source clips can be concatenated with -c copy (no re-encode).

    Fast path conditions:
    - No xfade transition (concat demuxer only works with identical streams)
    - No logo overlay
    - All clips: speed == 1.0, zoom == 1.0
    - All clips: same resolution as export target
    - All clips: fps matches export target (within tolerance)
    - All clips: video codec is a supported passthrough codec
    """
    if join_plan.use_xfade:
        return False

    # No logo
    if export_config.logo_path and Path(export_config.logo_path).is_file():
        return False

    # Config-level check: if speed/zoom ranges exclude 1.0, fast path is impossible
    if (
        abs(export_config.speed_min - 1.0) > 0.001
        or abs(export_config.speed_max - 1.0) > 0.001
        or abs(export_config.zoom_min - 1.0) > 0.001
        or abs(export_config.zoom_max - 1.0) > 0.001
    ):
        return False

    # Per-effect sanity check (effects are drawn from above ranges, but verify)
    for zoom, speed in effects:
        if abs(zoom - 1.0) > 0.001 or abs(speed - 1.0) > 0.001:
            return False

    target_w, target_h, target_fps = export_config.width, export_config.height, export_config.fps

    for probe in probes:
        # Resolution must match export target
        if probe.source_width != target_w or probe.source_height != target_h:
            return False
        # FPS must be close to export target
        if probe.source_fps is None or abs(probe.source_fps - target_fps) > _FAST_CONCAT_FPS_EPS:
            return False

    logger.info("Fast-concat path eligible: %d clips — skipping per-clip encode", len(probes))
    return True


def _should_use_unified_mix(clip_count: int, total_duration_sec: float) -> bool:
    """Single-pass mix is only safe for small rows (few clips, short total duration)."""
    if clip_count <= 1:
        return True
    return (
        clip_count <= _UNIFIED_MAX_CLIPS
        and total_duration_sec <= _UNIFIED_MAX_TOTAL_DURATION_SEC
    )


def _should_use_chunked_mix(clip_count: int, total_duration_sec: float) -> bool:
    """Unified mix per batch of clips, then join chunks — for long rows."""
    if clip_count <= 1:
        return False
    return not _should_use_unified_mix(clip_count, total_duration_sec)


def _clip_batch_ranges(clip_count: int, batch_size: int) -> list[tuple[int, int]]:
    ranges: list[tuple[int, int]] = []
    start = 0
    while start < clip_count:
        end = min(start + batch_size, clip_count)
        ranges.append((start, end))
        start = end
    return ranges


def _join_plan_slice(
    full_plan: chapter_timestamps.JoinTransitionPlan,
    start: int,
    count: int,
) -> chapter_timestamps.JoinTransitionPlan:
    if count < 2 or not full_plan.use_xfade:
        return chapter_timestamps.JoinTransitionPlan(False, (), ())
    end = start + count - 1
    return chapter_timestamps.JoinTransitionPlan(
        True,
        full_plan.transitions[start:end],
        full_plan.overlaps[start:end],
    )


def _join_plan_chunk_boundaries(
    full_plan: chapter_timestamps.JoinTransitionPlan,
    batch_ranges: list[tuple[int, int]],
) -> chapter_timestamps.JoinTransitionPlan:
    if len(batch_ranges) < 2 or not full_plan.use_xfade:
        return chapter_timestamps.JoinTransitionPlan(False, (), ())
    transitions: list[str] = []
    overlaps: list[float] = []
    for index in range(len(batch_ranges) - 1):
        boundary = batch_ranges[index][1] - 1
        transitions.append(full_plan.transitions[boundary])
        overlaps.append(full_plan.overlaps[boundary])
    return chapter_timestamps.JoinTransitionPlan(
        True,
        tuple(transitions),
        tuple(overlaps),
    )


def _render_mix_chunked(
    *,
    row_id: str,
    sequence_paths: list[str],
    effects: list[tuple[float, float]],
    export_config: ExportRenderConfig,
    output_path: Path,
    temp_dir: Path,
    ffmpeg_bin: Path,
    ffprobe_bin: Path,
    join_plan: chapter_timestamps.JoinTransitionPlan,
    segment_durations: list[float],
    probes: list[mix_filter_graph.ClipProbe],
    on_chunk_progress: Callable[[float | None, float | None], None] | None,
    on_join_progress: Callable[[float | None, float | None], None] | None,
    cancel_check: Callable[[], bool],
) -> tuple[bool, str, str]:
    """Normalize + join up to _CHUNK_BATCH_SIZE clips per FFmpeg pass, then join chunks."""
    batch_ranges = _clip_batch_ranges(len(sequence_paths), _CHUNK_BATCH_SIZE)
    chunk_total = len(batch_ranges)
    chunk_paths: list[Path] = []
    last_log = ""

    logger.info(
        "Chunked mix row=%s clips=%s batches=%s batch_size=%s",
        row_id,
        len(sequence_paths),
        chunk_total,
        _CHUNK_BATCH_SIZE,
    )

    for batch_index, (start, end) in enumerate(batch_ranges):
        if cancel_check():
            return False, "Đã hủy.", last_log

        batch_count = end - start
        is_only_batch = chunk_total == 1
        chunk_path = output_path if is_only_batch else temp_dir / f"chunk_{batch_index:04d}.mp4"
        batch_join = _join_plan_slice(join_plan, start, batch_count)

        logger.info(
            "Chunk mix row=%s batch=%s/%s clips=%s..%s → %s",
            row_id,
            batch_index + 1,
            chunk_total,
            start,
            end - 1,
            chunk_path.name,
        )

        ok, msg, log = _render_mix_unified(
            sequence_paths=sequence_paths[start:end],
            effects=effects[start:end],
            export_config=export_config,
            output_path=chunk_path,
            ffmpeg_bin=ffmpeg_bin,
            ffprobe_bin=ffprobe_bin,
            join_plan=batch_join,
            segment_durations=segment_durations[start:end],
            probes=probes[start:end],
            on_progress=on_chunk_progress,
            cancel_check=cancel_check,
        )
        if not ok:
            return False, msg, log
        last_log = log
        chunk_paths.append(chunk_path)

    if chunk_total == 1:
        return True, "", last_log

    chunk_join = _join_plan_chunk_boundaries(join_plan, batch_ranges)
    return _join_segments(
        chunk_paths,
        output_path,
        export_config,
        ffmpeg_bin,
        ffprobe_bin,
        random.Random(0),
        join_plan=chunk_join,
        temp_dir=temp_dir,
        on_progress=on_join_progress,
        cancel_check=cancel_check,
    )


def _xfade_two_segments(
    left_path: Path,
    right_path: Path,
    output_path: Path,
    *,
    left_duration: float,
    transition: str,
    transition_duration: float,
    ffmpeg_bin: Path,
    include_audio: bool,
    v_codec_args: list[str],
    a_codec_args: list[str],
    on_progress: Callable[[float | None, float | None], None] | None = None,
    cancel_check: Callable[[], bool] | None = None,
) -> tuple[bool, str, str]:
    """Join two normalized segments with one xfade / acrossfade (constant memory)."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    offset = max(0.0, left_duration - transition_duration)
    td = transition_duration
    parts = [
        f"[0:v][1:v]xfade=transition={transition}:duration={td:.3f}:offset={offset:.3f}[vout]"
    ]
    if include_audio:
        parts.append(f"[0:a][1:a]acrossfade=d={td:.3f}:c1=tri:c2=tri[aout]")
    filter_complex = ";".join(parts)

    stderr_acc: list[str] = []

    def on_line(line: str) -> None:
        stderr_acc.append(line)
        if on_progress:
            chunk = "".join(stderr_acc[-20:])
            on_progress(
                _parse_duration_from_log(chunk),
                _parse_speed_from_log(chunk),
            )

    cmd = [
        str(ffmpeg_bin),
        "-y",
        "-i",
        str(left_path.resolve()),
        "-i",
        str(right_path.resolve()),
        "-filter_complex",
        filter_complex,
        "-map",
        "[vout]",
    ]
    if include_audio:
        cmd.extend(["-map", "[aout]", *a_codec_args])
    else:
        cmd.append("-an")
    cmd.extend(v_codec_args)
    cmd.extend(_FFMPEG_JOIN_RESOURCE_ARGS)
    cmd.extend(OUTPUT_METADATA_ARGS)
    cmd.append(str(output_path))

    log_ffmpeg_command_before_render(
        f"Xfade pair {left_path.name} + {right_path.name} → {output_path.name}",
        cmd,
    )
    ok, msg, log = _run_ffmpeg(cmd, on_stderr_line=on_line, cancel_check=cancel_check)
    return ok, msg, log


def _xfade_segments_pairwise(
    segment_paths: list[Path],
    output_path: Path,
    ffmpeg_bin: Path,
    ffprobe_bin: Path,
    join_plan: chapter_timestamps.JoinTransitionPlan,
    temp_dir: Path,
    *,
    on_progress: Callable[[float | None, float | None], None] | None = None,
    cancel_check: Callable[[], bool] | None = None,
) -> tuple[bool, str, str]:
    """Chain xfade joins two segments at a time to limit FFmpeg decoder memory."""
    temp_dir.mkdir(parents=True, exist_ok=True)
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
    if len(transitions) != len(segment_paths) - 1:
        return False, "Lỗi cấu hình xfade (số transition không khớp).", ""

    current_path = segment_paths[0]
    current_dur = durations[0]
    last_log = ""

    max_v = 0
    max_a = 0
    for path in segment_paths:
        v, a = _probe_bitrates(str(path), ffprobe_bin)
        max_v = max(max_v, v)
        max_a = max(max_a, a)
    target_v, target_a = _resolve_target_bitrates(max_v, max_a)
    v_codec_args = _video_codec_args(ffmpeg_bin, target_v)
    a_codec_args = _audio_codec_args(target_a)

    for index in range(1, len(segment_paths)):
        if cancel_check and cancel_check():
            return False, "Đã hủy.", last_log

        is_last = index == len(segment_paths) - 1
        dest = output_path if is_last else temp_dir / f"xfade_partial_{index:04d}.mp4"
        previous_partial = current_path if index > 1 else None

        ok, msg, log = _xfade_two_segments(
            current_path,
            segment_paths[index],
            dest,
            left_duration=current_dur,
            transition=transitions[index - 1],
            transition_duration=transition_durations[index - 1],
            ffmpeg_bin=ffmpeg_bin,
            include_audio=include_audio,
            v_codec_args=v_codec_args,
            a_codec_args=a_codec_args,
            on_progress=on_progress,
            cancel_check=cancel_check,
        )
        if not ok:
            return False, msg, log
        last_log = log

        if previous_partial is not None and previous_partial.is_file():
            try:
                previous_partial.unlink()
            except OSError:
                pass

        if not is_last:
            current_path = dest
            current_dur = current_dur + durations[index] - transition_durations[index - 1]

    return True, "", last_log


def _xfade_segments(
    segment_paths: list[Path],
    output_path: Path,
    export_config: ExportRenderConfig,
    ffmpeg_bin: Path,
    ffprobe_bin: Path,
    join_plan: chapter_timestamps.JoinTransitionPlan,
    *,
    temp_dir: Path | None = None,
    on_progress: Callable[[float | None, float | None], None] | None = None,
    cancel_check: Callable[[], bool] | None = None,
) -> tuple[bool, str, str]:
    """Join normalized segments with chained xfade / acrossfade."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if len(segment_paths) >= _XFADE_PAIRWISE_MIN_SEGMENTS:
        if len(segment_paths) > _XFADE_SINGLE_PASS_MAX_SEGMENTS:
            work_dir = temp_dir or output_path.parent
            logger.info(
                "Using pairwise xfade join for %s segments (memory-safe)",
                len(segment_paths),
            )
            return _xfade_segments_pairwise(
                segment_paths,
                output_path,
                ffmpeg_bin,
                ffprobe_bin,
                join_plan,
                work_dir,
                on_progress=on_progress,
                cancel_check=cancel_check,
            )
        logger.info(
            "Using single-pass xfade join for %s pre-normalized segments",
            len(segment_paths),
        )
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

    def build_cmd(codec_args: list[str], a_codec_args: list[str]) -> list[str]:
        cmd = [str(ffmpeg_bin), "-y"]
        for path in segment_paths:
            cmd.extend(["-i", str(path.resolve())])
        cmd.extend(["-filter_complex", filter_complex, "-map", "[vout]"])
        if include_audio:
            cmd.extend(["-map", "[aout]", *a_codec_args])
        else:
            cmd.append("-an")
        cmd.extend(codec_args)
        cmd.extend(_FFMPEG_JOIN_RESOURCE_ARGS)
        cmd.extend(OUTPUT_METADATA_ARGS)
        cmd.append(str(output_path))
        return cmd

    max_v = 0
    max_a = 0
    for path in segment_paths:
        v, a = _probe_bitrates(str(path), ffprobe_bin)
        max_v = max(max_v, v)
        max_a = max(max_a, a)
    target_v, target_a = _resolve_target_bitrates(max_v, max_a)
    cmd = build_cmd(_video_codec_args(ffmpeg_bin, target_v), _audio_codec_args(target_a))
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
    temp_dir: Path | None = None,
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
        temp_dir=temp_dir,
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

    def build_cmd(codec_args: list[str], a_codec_args: list[str]) -> list[str]:
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
            aac_args=a_codec_args,
            output_metadata_args=OUTPUT_METADATA_ARGS,
        )

    clip_names = ", ".join(Path(path).name for path in sequence_paths[:3])
    if len(sequence_paths) > 3:
        clip_names += f", +{len(sequence_paths) - 3}"
    label = f"Mix {len(sequence_paths)} clips ({clip_names}) → {output_path.name}"

    max_v = 0
    max_a = 0
    for path in sequence_paths:
        v, a = _probe_bitrates(str(path), ffprobe_bin)
        max_v = max(max_v, v)
        max_a = max(max_a, a)

    target_v, target_a = _resolve_target_bitrates(max_v, max_a)
    cmd = build_cmd(_video_codec_args(ffmpeg_bin, target_v), _audio_codec_args(target_a))
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

    total_duration = sum(segment_durations)
    join_label = "Ghép video"

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

    # ── Fast path: concat source files directly without re-encoding ──────────
    if _can_fast_concat(probes, export_config, join_plan, effects):
        logger.info(
            "Fast-concat row=%s clips=%d (no encode, -c copy)", row_id, n
        )
        emit_progress(None, None, "Ghép nhanh (-c copy)", ROW_PHASE_CONCAT)
        src_paths = [Path(p) for p in sequence_paths]
        ok, msg, log = _concat_segments(
            src_paths,
            output_path,
            ffmpeg_bin,
            on_progress=on_join_progress,
            cancel_check=cancel_check,
        )
        if not ok:
            return False, msg, last_duration, last_speed, ""
        final_dur = _parse_duration_from_log(log) or last_duration
        final_speed = _parse_speed_from_log(log) or last_speed
        if final_dur is None:
            probed_dur = _probe_source_duration(str(output_path), ffprobe_bin)
            if probed_dur is not None:
                final_dur = probed_dur
        return True, "", final_dur, final_speed, chaptime

    # ── Normal encode paths ───────────────────────────────────────────────────
    if _should_use_unified_mix(n, total_duration):
        emit_progress(None, None, "Mix video", ROW_PHASE_MIX_VIDEO)
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
    elif _should_use_chunked_mix(n, total_duration):
        batch_count = len(_clip_batch_ranges(n, _CHUNK_BATCH_SIZE))
        logger.info(
            "Chunked mix row=%s clips=%s total=%.0fs batches=%s",
            row_id,
            n,
            total_duration,
            batch_count,
        )
        emit_progress(None, None, "Mix video", ROW_PHASE_MIX_VIDEO)

        def on_chunk_progress(dur: float | None, speed: float | None) -> None:
            speed_s = f"{speed:.1f}x" if speed is not None else "—"
            mm = int((dur or 0) // 60)
            ss = int((dur or 0) % 60)
            emit_progress(
                dur,
                speed,
                f"Mix batch · {speed_s} · {mm:02d}:{ss:02d}",
                ROW_PHASE_MIX_VIDEO,
            )

        ok, msg, log = _render_mix_chunked(
            row_id=row_id,
            sequence_paths=sequence_paths,
            effects=effects,
            export_config=export_config,
            output_path=output_path,
            temp_dir=temp_dir,
            ffmpeg_bin=ffmpeg_bin,
            ffprobe_bin=ffprobe_bin,
            join_plan=join_plan,
            segment_durations=segment_durations,
            probes=probes,
            on_chunk_progress=on_chunk_progress,
            on_join_progress=on_join_progress,
            cancel_check=cancel_check,
        )
    else:
        from python.services.video_merge.ffmpeg_pool import (
            FfmpegTaskPool,
            RowClipProgress,
            SegmentRenderTask,
        )

        logger.info(
            "Segmented mix row=%s clips=%s total=%.0fs (memory-safe path)",
            row_id,
            n,
            total_duration,
        )
        emit_progress(None, None, "Chuẩn hóa clip", ROW_PHASE_NORMALIZE)

        tasks = [
            SegmentRenderTask(
                row_id=row_id,
                clip_index=i,
                clip_total=n,
                src_path=sequence_paths[i],
                dest_path=temp_dir / f"seg_{i:04d}.mp4",
                zoom=effects[i][0],
                speed=effects[i][1],
            )
            for i in range(n)
        ]
        row_progress = RowClipProgress(n)

        def on_clip_progress(
            clip_idx: int,
            basename: str,
            dur: float | None,
            spd: float | None,
        ) -> None:
            display_idx = row_progress.display_clip_index()
            display_name = row_progress.display_basename(display_idx, basename)
            speed_s = f"{spd:.1f}x" if spd is not None else "—"
            emit_progress(
                dur,
                spd,
                f"Clip {display_idx}/{n} · {display_name} · {speed_s}",
                ROW_PHASE_NORMALIZE,
            )

        with FfmpegTaskPool(max_workers=max(1, export_config.concurrency)) as pool:
            results = pool.render_segments(
                tasks,
                export_config=export_config,
                ffmpeg_bin=ffmpeg_bin,
                ffprobe_bin=ffprobe_bin,
                row_progress=row_progress,
                on_clip_progress=on_clip_progress,
                cancel_check=cancel_check,
            )

        if cancel_check():
            return False, "Đã hủy.", last_duration, last_speed, ""

        if any(path is None for path in results):
            return False, "Lỗi render clip.", last_duration, last_speed, ""

        segment_paths = [path for path in results if path is not None]
        emit_progress(None, None, join_label, ROW_PHASE_CONCAT)
        ok, msg, log = _join_segments(
            segment_paths,
            output_path,
            export_config,
            ffmpeg_bin,
            ffprobe_bin,
            rng,
            join_plan=join_plan,
            temp_dir=temp_dir,
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

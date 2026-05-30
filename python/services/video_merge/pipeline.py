"""Video merge pipeline: planner, per-clip render, concat join."""

from __future__ import annotations

import ctypes
import logging
import os
import random
import re
import shlex
import subprocess
import sys
import threading
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable

from python.services.plugin_downloader import get_ffmpeg_path, get_ffprobe_path
from python.services.video_merge.io import ExportRenderConfig, probe_media

logger = logging.getLogger(__name__)
_ffmpeg_log = logging.getLogger("ffmpeg")

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".wmv"}
_X264_ARGS_FAST = [
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "fast",
    "-crf",
    "20",
]
_NVENC_ARGS_FAST = [
    "-c:v",
    "h264_nvenc",
    "-pix_fmt",
    "yuv420p",
    # NVENC presets are p1..p7 (fastest..best quality). p4 ~= balanced.
    "-preset",
    "p4",
    "-rc",
    "vbr",
    "-cq",
    "20",
    "-b:v",
    "0",
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
    return shlex.join(cmd)


@lru_cache(maxsize=8)
def _ffmpeg_supports_encoder(ffmpeg_bin: str, encoder_name: str) -> bool:
    """Check whether ffmpeg binary lists an encoder (compiled in; not runtime)."""
    try:
        res = subprocess.run(
            [ffmpeg_bin, "-hide_banner", "-encoders"],
            capture_output=True,
            text=True,
            timeout=8,
            check=False,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,  # type: ignore[attr-defined]
        )
    except Exception:
        return False
    out = (res.stdout or "") + "\n" + (res.stderr or "")
    return encoder_name.lower() in out.lower()


def _nvcuda_runtime_available() -> bool:
    """True when NVIDIA CUDA user-mode driver (nvcuda) is present on this machine."""
    if sys.platform == "win32":
        try:
            ctypes.WinDLL("nvcuda.dll")
            return True
        except OSError:
            pass
        sysroot = Path(os.environ.get("SystemRoot", r"C:\Windows"))
        return (sysroot / "System32" / "nvcuda.dll").is_file()
    try:
        ctypes.CDLL("libcuda.so.1")
        return True
    except OSError:
        return False


_nvenc_runtime_disabled = False


def disable_nvenc_runtime() -> None:
    """Force CPU encoder for this process (e.g. after NVENC init failure)."""
    global _nvenc_runtime_disabled
    _nvenc_runtime_disabled = True
    _nvenc_usable.cache_clear()


@lru_cache(maxsize=8)
def _nvenc_usable(ffmpeg_bin: str) -> bool:
    """NVENC needs both encoder in ffmpeg AND a working NVIDIA CUDA runtime."""
    if _nvenc_runtime_disabled:
        return False
    if not _ffmpeg_supports_encoder(ffmpeg_bin, "h264_nvenc"):
        return False
    if not _nvcuda_runtime_available():
        logger.info(
            "NVENC skipped: nvcuda not available (FFmpeg lists h264_nvenc but no NVIDIA GPU/driver)"
        )
        return False
    return True


def _nvenc_failure(stderr_log: str, cmd: list[str]) -> bool:
    joined = " ".join(cmd).lower()
    if "h264_nvenc" not in joined and "nvenc" not in joined:
        return False
    lower = stderr_log.lower()
    return (
        "nvcuda.dll" in lower
        or "cannot load nvcuda" in lower
        or "no nvenc capable devices" in lower
        or "error initializing output stream" in lower
    )


def _video_codec_args(ffmpeg_bin: Path) -> list[str]:
    """Pick the fastest available H.264 encoder (NVENC only when CUDA runtime exists)."""
    if _nvenc_usable(str(ffmpeg_bin)):
        _ffmpeg_log.info("Using NVIDIA NVENC encoder (h264_nvenc)")
        return list(_NVENC_ARGS_FAST)
    _ffmpeg_log.info("Using CPU encoder (libx264 preset=fast)")
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

    _ffmpeg_log.info("FFmpeg command: %s", _format_ffmpeg_cmd(cmd))

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
) -> str:
    """Build per-clip filter chain.

    When source resolution and fps already match export targets, skip ``scale`` to
    target size and ``fps`` — only random zoom (scale by factor) and speed remain.
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
    if not skip_target_scale:
        parts.append(f"fps={fps}")
    parts.extend([f"setpts=PTS/{speed_div}", "format=yuv420p"])
    return ",".join(parts)


def _build_audio_chain(speed: float, source_dur: float | None) -> str:
    inner: list[str] = []
    if source_dur and source_dur > 0:
        out_dur = source_dur / speed if speed > 0 else source_dur
        inner.append(f"atrim=duration={out_dur:.3f}")
    if abs(speed - 1.0) > 0.001:
        inner.append(f"atempo={speed:.6f}")
    inner.append("asetpts=PTS-STARTPTS")
    if inner:
        return f"[0:a]{','.join(inner)}[a]"
    return "[0:a]asetpts=PTS-STARTPTS[a]"


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
        out.append(str(dest))
        return out

    cmd = build_cmd(_video_codec_args(ffmpeg_bin))
    ok, msg, log = _run_ffmpeg(cmd, on_stderr_line=on_line, cancel_check=cancel_check)
    if not ok and _nvenc_failure(log, cmd):
        _ffmpeg_log.warning(
            "NVENC failed (%s); falling back to libx264 for remaining encodes",
            _summarize_ffmpeg_stderr(log) or "nvcuda",
        )
        disable_nvenc_runtime()
        cmd = build_cmd(list(_X264_ARGS_FAST))
        ok, msg, _ = _run_ffmpeg(
            cmd, on_stderr_line=on_line, cancel_check=cancel_check
        )
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

    ok, msg, log = _run_ffmpeg(cmd, on_stderr_line=on_line, cancel_check=cancel_check)
    return ok, msg, log


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


def render_mix_row(
    *,
    row_id: str,
    sequence_paths: list[str],
    export_config: ExportRenderConfig,
    output_path: Path,
    temp_dir: Path,
    on_progress: Callable[[float, float, str, str], None] | None = None,
    cancel_check: Callable[[], bool],
) -> tuple[bool, str, float | None, float | None]:
    binaries = _get_binaries()
    if binaries[0] is None or binaries[1] is None:
        return False, "Chưa cài FFmpeg/ffprobe. Vui lòng tải plugin trong ứng dụng.", None, None

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
        return False, "Đã hủy.", last_duration, last_speed

    from python.services.video_merge.ffmpeg_pool import (
        FfmpegTaskPool,
        RowClipProgress,
        SegmentRenderTask,
    )

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
        mm = int((dur or 0) // 60)
        ss = int((dur or 0) % 60)
        speed_s = f"{spd:.1f}x" if spd is not None else "—"
        emit_progress(
            dur,
            spd,
            f"Chuẩn hóa · Clip {clip_idx}/{n}: {basename} · {speed_s} · {mm:02d}:{ss:02d}",
            ROW_PHASE_NORMALIZE,
        )

    workers = max(1, int(getattr(export_config, "concurrency", 1) or 1))
    with FfmpegTaskPool(max_workers=workers) as pool:
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
        return False, "Đã hủy.", last_duration, last_speed

    if any(path is None for path in results):
        return False, "Lỗi render clip.", last_duration, last_speed

    segment_paths = [path for path in results if path is not None]

    if cancel_check():
        return False, "Đã hủy.", last_duration, last_speed

    join_label = "Nối video"
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

    ok, msg, log = _concat_segments(
        segment_paths,
        output_path,
        ffmpeg_bin,
        on_progress=on_join_progress,
        cancel_check=cancel_check,
    )
    if not ok:
        return False, msg, last_duration, last_speed

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

    return True, "", final_dur, final_speed

"""Remove VEO watermark from videos (ported from veo3-pro remove_logo_service).

Uses the **Strategy** pattern: each :class:`RemoveWatermarkBackend` implements one removal
approach. The default runs the bundled GeminiWatermarkTool / Veo Watermark Remover CLI
(``plugins/ffmpge.exe``) with reverse alpha blending and frame progress from its stdout.
"""

from __future__ import annotations

import logging
import os
import re
import subprocess
import threading
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from python.services.plugin_downloader import get_plugins_dir
from python.services.remove_watermark.binaries import LocalBinariesService

LOGGER = logging.getLogger("jos-desktop.remove-watermark")

SUPPORTED_VIDEO_SUFFIXES = frozenset({".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi", ".flv", ".wmv"})

# Relative bbox tuned from existing worker script (`veo3-plus` remove watermark flow).
DEFAULT_LOGO_BBOX = (0.905, 0.900, 0.092, 0.092)

FFMPEG_DELOGO_BACKEND_ID = "ffmpeg_delogo"
GWT_VEO_BACKEND_ID = "gwt_veo_watermark"
FFMPEG_CROP_BACKEND_ID = "ffmpeg_crop"
DEFAULT_BACKEND_ID = FFMPEG_CROP_BACKEND_ID

DEFAULT_LOGO_ZOOM_PERCENT = 4.0
MIN_LOGO_ZOOM_PERCENT = 1.0
MAX_LOGO_ZOOM_PERCENT = 30.0

# Bundled Veo Watermark Remover / GeminiWatermarkTool-Video (see plugin/ffmpge.exe).
GWT_VEO_BINARY_NAMES = ("ffmpge.exe", "GeminiWatermarkTool-Video.exe", "ffmpge")

BackendFactory = Callable[[], "RemoveLogoBackend"]

_BACKEND_REGISTRY: dict[str, BackendFactory] = {}


def register_remove_logo_backend(backend_id: str, factory: BackendFactory, *, replace: bool = False) -> None:
    """
    Register a removal backend factory.

    Call at app startup or from a plugin module to add a new ``backend_id``.
    """
    if not replace and backend_id in _BACKEND_REGISTRY:
        raise ValueError(f"remove-logo backend already registered: {backend_id!r}")
    _BACKEND_REGISTRY[backend_id] = factory


def get_remove_logo_backend(backend_id: str) -> RemoveLogoBackend:
    factory = _BACKEND_REGISTRY.get(backend_id)
    if factory is None:
        known = ", ".join(sorted(_BACKEND_REGISTRY)) or "(none)"
        raise ValueError(f"unknown remove-logo backend {backend_id!r}; known: {known}")
    return factory()


def compute_delogo_rect_pixels(
    vw: int,
    vh: int,
    bbox_pct: tuple[float, float, float, float] = DEFAULT_LOGO_BBOX,
) -> tuple[int, int, int, int]:
    """
    Convert fractional bbox (x, y, w, h as fractions of frame) to integer delogo rectangle.

    Values are clamped so the rectangle stays inside the frame — avoids ffmpeg error
    "Logo area is outside of the frame" from expression rounding or tiny resolutions.
    """
    if vw < 1 or vh < 1:
        raise ValueError(f"invalid video dimensions: {vw}x{vh}")
    x_pct, y_pct, bw_pct, bh_pct = bbox_pct
    x0 = int(round(vw * x_pct))
    y0 = int(round(vh * y_pct))
    w0 = int(round(vw * bw_pct))
    h0 = int(round(vh * bh_pct))
    return _clamp_rect_to_frame(x0, y0, w0, h0, vw, vh)


def clamp_pixel_bbox(
    bbox_pixels: tuple[int, int, int, int],
    vw: int,
    vh: int,
) -> tuple[int, int, int, int]:
    """Clamp a pixel-based delogo rectangle to ensure it stays inside the frame."""
    if vw < 1 or vh < 1:
        raise ValueError(f"invalid video dimensions: {vw}x{vh}")
    x0, y0, w0, h0 = bbox_pixels
    return _clamp_rect_to_frame(int(x0), int(y0), int(w0), int(h0), vw, vh)


def _clamp_rect_to_frame(x0: int, y0: int, w0: int, h0: int, vw: int, vh: int) -> tuple[int, int, int, int]:
    x0 = max(0, min(x0, vw - 1))
    y0 = max(0, min(y0, vh - 1))
    w0 = max(1, min(w0, vw - x0))
    h0 = max(1, min(h0, vh - y0))
    return x0, y0, w0, h0


def probe_video_size(ffprobe: str, video: Path) -> tuple[int, int] | None:
    """Return ``(width, height)`` of the first video stream, or ``None`` on failure."""
    cmd = [
        ffprobe,
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=p=0:s=x",
        str(video),
    ]
    try:
        proc = subprocess.run(cmd, check=False, capture_output=True, text=True, timeout=45)
    except Exception as exc:  # noqa: BLE001
        LOGGER.warning("remove-logo ffprobe failed to run: %s (%s)", video, exc)
        return None
    if proc.returncode != 0:
        return None
    line = (proc.stdout or "").strip().splitlines()
    if not line:
        return None
    parts = line[0].split("x")
    if len(parts) != 2:
        return None
    try:
        w, h = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    if w < 1 or h < 1:
        return None
    return w, h


def probe_video_duration_seconds(ffprobe: str, video: Path) -> float | None:
    """Return container duration in seconds (best effort), or ``None``."""
    cmd = [
        ffprobe,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(video),
    ]
    try:
        proc = subprocess.run(cmd, check=False, capture_output=True, text=True, timeout=45)
    except Exception as exc:  # noqa: BLE001
        LOGGER.warning("remove-logo ffprobe duration failed: %s (%s)", video, exc)
        return None
    if proc.returncode != 0:
        return None
    raw = (proc.stdout or "").strip().splitlines()
    if not raw:
        return None
    try:
        sec = float(raw[0])
    except ValueError:
        return None
    if sec <= 0 or sec != sec:  # NaN
        return None
    return sec


_FFMPEG_TIME_RE = re.compile(r"\btime=(\d+):(\d+):(\d+(?:\.\d+)?)\b")
# GeminiWatermarkTool-Video progress bar only, e.g. ``[----]   3% (6/192)``.
# Do not match bare ``NN%`` — logs contain unrelated values like ``strength=150%``.
_GWT_PROGRESS_RE = re.compile(r"(\d+)%\s*\(\s*(\d+)\s*/\s*(\d+)\s*\)")


def resolve_veo_watermark_remover_binary(plugin_dir: Path | None = None) -> Path | None:
    """Return the bundled Veo watermark remover executable when present."""
    base = plugin_dir or get_plugins_dir()
    for name in GWT_VEO_BINARY_NAMES:
        candidate = base / name
        if candidate.is_file():
            return candidate.resolve()
    return None


def parse_gwt_progress_percent(text: str) -> int | None:
    """
    Parse frame progress from GWT/Veo remover CLI output.

    Only accepts the progress-bar token ``N% (current/total)`` so unrelated log
    lines (e.g. ``strength=150%`` from NcnnDenoiser) are ignored.
    """
    if not text:
        return None
    frame_matches = list(_GWT_PROGRESS_RE.finditer(text))
    if not frame_matches:
        return None
    match = frame_matches[-1]
    current = int(match.group(2))
    total = int(match.group(3))
    if total > 0:
        return min(100, max(0, int(100 * current / total)))
    return min(100, max(0, int(match.group(1))))


def _time_match_to_seconds(match: re.Match[str]) -> float:
    h, m, s = match.group(1), match.group(2), match.group(3)
    return int(h, 10) * 3600 + int(m, 10) * 60 + float(s)


def _span_map(raw_pct_0_100: int, span_lo: int, span_hi: int) -> int:
    clamped = max(0, min(100, raw_pct_0_100))
    return span_lo + (span_hi - span_lo) * clamped // 100


def _terminate_subprocess(proc: subprocess.Popen[object]) -> None:
    """Best-effort terminate/kill for ffmpeg or GWT child processes."""
    try:
        proc.terminate()
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass
    except Exception:  # noqa: BLE001
        try:
            proc.kill()
        except Exception:  # noqa: BLE001
            pass


def _run_ffmpeg_with_progress(
    cmd: list[str],
    *,
    duration_sec: float | None,
    emit: Callable[[int], None],
    span_lo: int = 0,
    span_hi: int = 99,
    cancel_event: threading.Event | None = None,
    register_subprocess: Callable[[subprocess.Popen[object]], None] | None = None,
    unregister_subprocess: Callable[[subprocess.Popen[object]], None] | None = None,
) -> tuple[int, str]:
    """
    Run ffmpeg, parse stderr for ``time=`` vs duration when known, else pulse ``emit`` slowly.

    Returns ``(returncode, stderr_tail)``.
    """
    proc = subprocess.Popen(
        cmd,
        stderr=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        text=True,
        bufsize=1,
    )
    if register_subprocess is not None:
        register_subprocess(proc)
    assert proc.stderr is not None
    tail_lines: list[str] = []
    stop_pulse = threading.Event()
    cancelled = False

    def pulse_worker() -> None:
        step = max(1, (span_hi - span_lo) // 12)
        n = span_lo
        while not stop_pulse.wait(0.85):
            if cancel_event is not None and cancel_event.is_set():
                return
            n = min(span_hi - 1, n + step)
            emit(n)

    pulse_thread: threading.Thread | None = None
    if duration_sec is None or duration_sec <= 0:
        pulse_thread = threading.Thread(target=pulse_worker, name="jos-ffmpeg-pulse", daemon=True)
        pulse_thread.start()

    try:
        for line in proc.stderr:
            if cancel_event is not None and cancel_event.is_set():
                cancelled = True
                _terminate_subprocess(proc)
                break
            tail_lines.append(line)
            if len(tail_lines) > 120:
                tail_lines.pop(0)
            if duration_sec is not None and duration_sec > 0:
                m = _FFMPEG_TIME_RE.search(line)
                if m:
                    cur = _time_match_to_seconds(m)
                    raw = int(100 * cur / duration_sec)
                    emit(_span_map(raw, span_lo, span_hi))
    finally:
        stop_pulse.set()
        if pulse_thread is not None:
            pulse_thread.join(timeout=2.0)

    if cancelled:
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            _terminate_subprocess(proc)
        if unregister_subprocess is not None:
            unregister_subprocess(proc)
        return -1, "".join(tail_lines[-40:])

    code = proc.wait(timeout=3600)
    if unregister_subprocess is not None:
        unregister_subprocess(proc)
    err_tail = "".join(tail_lines[-40:])
    return code, err_tail


def _run_gwt_remover_with_progress(
    cmd: list[str],
    *,
    emit: Callable[[int], None],
    cancel_event: threading.Event | None = None,
    register_subprocess: Callable[[subprocess.Popen[object]], None] | None = None,
    unregister_subprocess: Callable[[subprocess.Popen[object]], None] | None = None,
) -> tuple[int, str]:
    """
    Run the Veo watermark remover CLI and map its ASCII progress bar to 0–100.

    Returns ``(returncode, output_tail)``.
    """
    creationflags = 0
    if os.name == "nt":
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        creationflags=creationflags,
    )
    if register_subprocess is not None:
        register_subprocess(proc)
    assert proc.stdout is not None
    tail_chars: list[str] = []
    max_tail = 16_000
    last_pct = -1
    cancelled = False

    def note_pct(pct: int) -> None:
        nonlocal last_pct
        safe = min(100, max(0, int(pct)))
        if safe > last_pct:
            last_pct = safe
            emit(safe)

    try:
        while True:
            if cancel_event is not None and cancel_event.is_set():
                cancelled = True
                _terminate_subprocess(proc)
                break
            chunk = proc.stdout.read(1)
            if chunk == "":
                break
            tail_chars.append(chunk)
            if len(tail_chars) > max_tail:
                tail_chars.pop(0)
            parsed = parse_gwt_progress_percent("".join(tail_chars[-512:]))
            if parsed is not None:
                # Reserve 100% for successful process exit (encode may still run after last frame).
                note_pct(min(99, parsed))
    finally:
        code = proc.wait(timeout=7200)
        if unregister_subprocess is not None:
            unregister_subprocess(proc)

    tail = "".join(tail_chars)[-4000:]
    if cancelled:
        return -1, tail
    return code, tail


@dataclass(frozen=True)
class RemoveLogoInput:
    file_name: str
    input_path: str
    output_path: str
    bbox_pixels: tuple[int, int, int, int] | None = None
    """Optional pixel-based delogo rect ``(x, y, w, h)``. Falls back to :data:`DEFAULT_LOGO_BBOX` when ``None``."""
    zoom_percent: float | None = None
    """Optional zoom percent for crop/scale backend. Falls back to :data:`DEFAULT_LOGO_ZOOM_PERCENT` when ``None``."""


@dataclass(frozen=True)
class RemoveLogoResult:
    file_name: str
    input_path: str
    output_path: str
    status: str
    progress_pct: int


@dataclass(frozen=True)
class RemoveLogoExecutionContext:
    """Paths and shared resources passed to each :class:`RemoveLogoBackend` run."""

    ffmpeg_path: str
    ffprobe_path: str
    gwt_binary_path: str | None = None
    report_progress: Callable[[int], None] | None = None
    cancel_event: threading.Event | None = None
    register_subprocess: Callable[[subprocess.Popen[object]], None] | None = None
    unregister_subprocess: Callable[[subprocess.Popen[object]], None] | None = None


def _ctx_is_cancelled(ctx: RemoveLogoExecutionContext) -> bool:
    return ctx.cancel_event is not None and ctx.cancel_event.is_set()


def _cancelled_result(row: RemoveLogoInput, *, progress_pct: int = 0) -> RemoveLogoResult:
    return RemoveLogoResult(
        file_name=row.file_name,
        input_path=row.input_path,
        output_path=row.output_path,
        status="cancelled",
        progress_pct=progress_pct,
    )


class RemoveLogoBackend(ABC):
    """One concrete strategy per removal method (ffmpeg filter chain, external tool, …)."""

    @property
    @abstractmethod
    def backend_id(self) -> str:
        """Stable id used in :func:`register_remove_logo_backend` (e.g. ``ffmpeg_delogo``)."""

    @abstractmethod
    def process(
        self,
        ctx: RemoveLogoExecutionContext,
        row: RemoveLogoInput,
        source: Path,
        target: Path,
    ) -> RemoveLogoResult:
        """Transform ``source`` video into ``target``; row metadata is used for logging/result fields."""


class FfmpegDelogoBackend(RemoveLogoBackend):
    """Default: ffmpeg ``delogo`` in a fixed corner bbox (see :data:`DEFAULT_LOGO_BBOX`)."""

    @property
    def backend_id(self) -> str:
        return FFMPEG_DELOGO_BACKEND_ID

    def process(
        self,
        ctx: RemoveLogoExecutionContext,
        row: RemoveLogoInput,
        source: Path,
        target: Path,
    ) -> RemoveLogoResult:
        if _ctx_is_cancelled(ctx):
            return _cancelled_result(row)

        ffmpeg = ctx.ffmpeg_path
        ffprobe = ctx.ffprobe_path
        emit = ctx.report_progress

        target.parent.mkdir(parents=True, exist_ok=True)

        dims = probe_video_size(ffprobe, source)
        if not dims:
            LOGGER.error("remove-logo: could not read video size via ffprobe (%s)", source)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )
        vw, vh = dims
        try:
            if row.bbox_pixels is not None:
                dx, dy, dw, dh = clamp_pixel_bbox(row.bbox_pixels, vw, vh)
            else:
                dx, dy, dw, dh = compute_delogo_rect_pixels(vw, vh)
        except ValueError:
            LOGGER.error("remove-logo: invalid dimensions from probe (%s) -> %dx%d", source, vw, vh)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )
        duration_sec = probe_video_duration_seconds(ffprobe, source)
        delogo_filter = f"delogo=x={dx}:y={dy}:w={dw}:h={dh}:show=0"
        LOGGER.debug(
            "remove-logo delogo: %s size=%dx%d rect=x=%d y=%d w=%d h=%d",
            source.name,
            vw,
            vh,
            dx,
            dy,
            dw,
            dh,
        )

        def emit_pct(pct: int) -> None:
            if emit is not None:
                emit(pct)

        cmd_copy_audio = [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-stats_period",
            "0.5",
            "-loglevel",
            "info",
            "-i",
            str(source),
            "-vf",
            delogo_filter,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-c:a",
            "copy",
            str(target),
        ]
        cmd_encode_audio = [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-stats_period",
            "0.5",
            "-loglevel",
            "info",
            "-i",
            str(source),
            "-vf",
            delogo_filter,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            str(target),
        ]

        code, copy_tail = _run_ffmpeg_with_progress(
            cmd_copy_audio,
            duration_sec=duration_sec,
            emit=emit_pct,
            span_lo=0,
            span_hi=99,
            cancel_event=ctx.cancel_event,
            register_subprocess=ctx.register_subprocess,
            unregister_subprocess=ctx.unregister_subprocess,
        )
        if _ctx_is_cancelled(ctx):
            if target.exists():
                target.unlink(missing_ok=True)
            return _cancelled_result(row)
        if code == 0:
            emit_pct(100)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="completed",
                progress_pct=100,
            )

        LOGGER.warning(
            "remove-logo ffmpeg copy-audio failed: input=%s output=%s err=%s",
            source,
            target,
            copy_tail[-240:],
        )
        code2, enc_tail = _run_ffmpeg_with_progress(
            cmd_encode_audio,
            duration_sec=duration_sec,
            emit=emit_pct,
            span_lo=0,
            span_hi=99,
            cancel_event=ctx.cancel_event,
            register_subprocess=ctx.register_subprocess,
            unregister_subprocess=ctx.unregister_subprocess,
        )
        if _ctx_is_cancelled(ctx):
            if target.exists():
                target.unlink(missing_ok=True)
            return _cancelled_result(row)
        if code2 != 0:
            LOGGER.error(
                "remove-logo ffmpeg encode-audio failed: input=%s output=%s err=%s",
                source,
                target,
                enc_tail[-240:],
            )
            if target.exists():
                target.unlink(missing_ok=True)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )

        emit_pct(100)
        return RemoveLogoResult(
            file_name=row.file_name,
            input_path=row.input_path,
            output_path=row.output_path,
            status="completed",
            progress_pct=100,
        )


class GwtVeoWatermarkBackend(RemoveLogoBackend):
    """
    Veo Watermark Remover (GeminiWatermarkTool-Video) reverse alpha blending.

    Uses ``plugin/ffmpge.exe`` — mathematically precise removal per
    https://github.com/allenk/VeoWatermarkRemover
    """

    @property
    def backend_id(self) -> str:
        return GWT_VEO_BACKEND_ID

    def process(
        self,
        ctx: RemoveLogoExecutionContext,
        row: RemoveLogoInput,
        source: Path,
        target: Path,
    ) -> RemoveLogoResult:
        if _ctx_is_cancelled(ctx):
            return _cancelled_result(row)

        emit = ctx.report_progress
        raw_binary = (ctx.gwt_binary_path or "").strip()
        if not raw_binary:
            LOGGER.error("remove-logo gwt: binary path not configured")
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )
        binary = Path(raw_binary)
        if not binary.is_file():
            LOGGER.error("remove-logo gwt: binary not found (%s)", binary)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )

        target.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            str(binary),
            "--veo",
            "--no-banner",
            "-i",
            str(source),
            "-o",
            str(target),
        ]
        LOGGER.info("remove-logo gwt: %s -> %s", source.name, target.name)

        def emit_pct(pct: int) -> None:
            if emit is not None:
                emit(pct)

        emit_pct(0)
        try:
            code, tail = _run_gwt_remover_with_progress(
                cmd,
                emit=emit_pct,
                cancel_event=ctx.cancel_event,
                register_subprocess=ctx.register_subprocess,
                unregister_subprocess=ctx.unregister_subprocess,
            )
        except Exception:  # noqa: BLE001
            LOGGER.exception("remove-logo gwt failed to run: input=%s output=%s", source, target)
            if target.exists():
                target.unlink(missing_ok=True)
            if _ctx_is_cancelled(ctx):
                return _cancelled_result(row)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )

        if _ctx_is_cancelled(ctx):
            if target.exists():
                target.unlink(missing_ok=True)
            return _cancelled_result(row)

        if code != 0 or not target.is_file():
            LOGGER.error(
                "remove-logo gwt exited %s: input=%s output=%s tail=%s",
                code,
                source,
                target,
                tail[-400:],
            )
            if target.exists():
                target.unlink(missing_ok=True)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )

        emit_pct(100)
        return RemoveLogoResult(
            file_name=row.file_name,
            input_path=row.input_path,
            output_path=row.output_path,
            status="completed",
            progress_pct=100,
        )


def normalize_logo_zoom_percent(zoom_percent: float | None) -> float:
    if zoom_percent is None or zoom_percent <= 0:
        return DEFAULT_LOGO_ZOOM_PERCENT
    if zoom_percent < MIN_LOGO_ZOOM_PERCENT:
        return MIN_LOGO_ZOOM_PERCENT
    if zoom_percent > MAX_LOGO_ZOOM_PERCENT:
        return MAX_LOGO_ZOOM_PERCENT
    return float(zoom_percent)


def logo_scale_factor_from_zoom_percent(zoom_percent: float | None) -> float:
    return 1.0 + normalize_logo_zoom_percent(zoom_percent) / 100.0


def compute_crop_scale_top_right_plan(
    vw: int,
    vh: int,
    zoom_percent: float | None,
) -> tuple[int, int, int, int, int, int]:
    if vw < 1 or vh < 1:
        raise ValueError(f"invalid video dimensions: {vw}x{vh}")
    scale_factor = logo_scale_factor_from_zoom_percent(zoom_percent)
    scaled_w = max(vw + 1, int(vw * scale_factor + 0.5))
    scaled_h = max(vh + 1, int(vh * scale_factor + 0.5))
    crop_x = max(0, scaled_w - vw)
    return scaled_w, scaled_h, crop_x, 0, vw, vh


def build_crop_scale_video_filter(vw: int, vh: int, zoom_percent: float | None) -> str:
    scaled_w, scaled_h, crop_x, crop_y, out_w, out_h = compute_crop_scale_top_right_plan(vw, vh, zoom_percent)
    return f"scale={scaled_w}:{scaled_h},crop={out_w}:{out_h}:{crop_x}:{crop_y}"


class FfmpegCropBackend(RemoveLogoBackend):
    """Remove watermark via upscale (zoom) and top-right anchored crop, preserving original resolution."""

    @property
    def backend_id(self) -> str:
        return FFMPEG_CROP_BACKEND_ID

    def process(
        self,
        ctx: RemoveLogoExecutionContext,
        row: RemoveLogoInput,
        source: Path,
        target: Path,
    ) -> RemoveLogoResult:
        if _ctx_is_cancelled(ctx):
            return _cancelled_result(row)

        ffmpeg = ctx.ffmpeg_path
        ffprobe = ctx.ffprobe_path
        emit = ctx.report_progress

        target.parent.mkdir(parents=True, exist_ok=True)

        dims = probe_video_size(ffprobe, source)
        if not dims:
            LOGGER.error("remove-logo: could not read video size via ffprobe (%s)", source)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )
        vw, vh = dims
        try:
            crop_filter = build_crop_scale_video_filter(vw, vh, row.zoom_percent)
        except ValueError:
            LOGGER.error("remove-logo: invalid dimensions from probe (%s) -> %dx%d", source, vw, vh)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )
        duration_sec = probe_video_duration_seconds(ffprobe, source)
        LOGGER.info(
            "remove-logo crop: %s size=%dx%d filter=%s zoom=%s",
            source.name,
            vw,
            vh,
            crop_filter,
            normalize_logo_zoom_percent(row.zoom_percent),
        )

        def emit_pct(pct: int) -> None:
            if emit is not None:
                emit(pct)

        def paths_equal(p1: Path, p2: Path) -> bool:
            try:
                return p1.resolve() == p2.resolve()
            except OSError:
                return p1.absolute() == p2.absolute()

        in_place = paths_equal(source, target)
        encode_target = target
        temp_path: Path | None = None
        if in_place:
            temp_path = target.parent / f"{target.stem}.veo3-crop-tmp{target.suffix}"
            encode_target = temp_path
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass
            LOGGER.info("remove-logo crop: in-place output — writing temp file %s", temp_path.name)

        def cleanup_temp() -> None:
            if temp_path and temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass

        def finalize_output() -> bool:
            if not temp_path:
                return True
            try:
                if target.exists():
                    target.unlink()
                temp_path.rename(target)
                return True
            except Exception as exc:
                LOGGER.error("remove-logo crop: finalize output failed from %s to %s: %s", temp_path, target, exc)
                return False

        cmd_copy_audio = [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-stats_period",
            "0.5",
            "-loglevel",
            "info",
            "-i",
            str(source),
            "-vf",
            crop_filter,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-c:a",
            "copy",
            str(encode_target),
        ]
        cmd_encode_audio = [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-stats_period",
            "0.5",
            "-loglevel",
            "info",
            "-i",
            str(source),
            "-vf",
            crop_filter,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            str(encode_target),
        ]

        code, copy_tail = _run_ffmpeg_with_progress(
            cmd_copy_audio,
            duration_sec=duration_sec,
            emit=emit_pct,
            span_lo=0,
            span_hi=99,
            cancel_event=ctx.cancel_event,
            register_subprocess=ctx.register_subprocess,
            unregister_subprocess=ctx.unregister_subprocess,
        )
        if _ctx_is_cancelled(ctx):
            cleanup_temp()
            return _cancelled_result(row)

        if code == 0:
            if finalize_output():
                emit_pct(100)
                return RemoveLogoResult(
                    file_name=row.file_name,
                    input_path=row.input_path,
                    output_path=row.output_path,
                    status="completed",
                    progress_pct=100,
                )
            cleanup_temp()
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )

        LOGGER.warning(
            "remove-logo crop copy-audio failed: input=%s output=%s err=%s",
            source,
            target,
            copy_tail[-240:],
        )
        code2, enc_tail = _run_ffmpeg_with_progress(
            cmd_encode_audio,
            duration_sec=duration_sec,
            emit=emit_pct,
            span_lo=0,
            span_hi=99,
            cancel_event=ctx.cancel_event,
            register_subprocess=ctx.register_subprocess,
            unregister_subprocess=ctx.unregister_subprocess,
        )
        if _ctx_is_cancelled(ctx):
            cleanup_temp()
            return _cancelled_result(row)

        if code2 != 0:
            LOGGER.error(
                "remove-logo crop encode-audio failed: input=%s output=%s err=%s",
                source,
                target,
                enc_tail[-240:],
            )
            cleanup_temp()
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )

        if finalize_output():
            emit_pct(100)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="completed",
                progress_pct=100,
            )
        cleanup_temp()
        return RemoveLogoResult(
            file_name=row.file_name,
            input_path=row.input_path,
            output_path=row.output_path,
            status="failed",
            progress_pct=0,
        )


register_remove_logo_backend(GWT_VEO_BACKEND_ID, lambda: GwtVeoWatermarkBackend(), replace=True)
register_remove_logo_backend(FFMPEG_DELOGO_BACKEND_ID, lambda: FfmpegDelogoBackend(), replace=True)
register_remove_logo_backend(FFMPEG_CROP_BACKEND_ID, lambda: FfmpegCropBackend(), replace=True)


class RemoveWatermarkService:
    """Batch watermark removal with pluggable backend and thread pool."""

    def __init__(
        self,
        binaries_service: LocalBinariesService | None = None,
        *,
        backend: RemoveLogoBackend | None = None,
        default_backend_id: str = DEFAULT_BACKEND_ID,
    ) -> None:
        self._binaries_service = binaries_service or LocalBinariesService()
        self._default_backend = backend or get_remove_logo_backend(default_backend_id)
        self._progress_lock = threading.Lock()
        self._progress: dict[str, int] = {}
        self._cancel_event = threading.Event()
        self._procs_lock = threading.Lock()
        self._active_procs: list[subprocess.Popen[object]] = []

    def request_cancel(self) -> None:
        """Stop the active batch: signal workers and terminate child processes."""
        self._cancel_event.set()
        with self._procs_lock:
            procs = list(self._active_procs)
        for proc in procs:
            _terminate_subprocess(proc)
        LOGGER.info("remove-logo: cancel requested (%d active subprocesses)", len(procs))

    def _register_subprocess(self, proc: subprocess.Popen[object]) -> None:
        with self._procs_lock:
            self._active_procs.append(proc)

    def _unregister_subprocess(self, proc: subprocess.Popen[object]) -> None:
        with self._procs_lock:
            try:
                self._active_procs.remove(proc)
            except ValueError:
                pass

    def _set_progress(self, input_key: str, pct: int) -> None:
        safe = min(100, max(0, int(pct)))
        with self._progress_lock:
            self._progress[input_key] = safe

    def get_progress_snapshot(self) -> list[dict[str, str | int]]:
        """Latest per-input progress for UI polling (keys are resolved ``input_path`` strings)."""
        with self._progress_lock:
            return [
                {"input_path": key, "progress_pct": int(val)}
                for key, val in sorted(self._progress.items())
            ]

    def process_batch(
        self,
        rows: list[RemoveLogoInput],
        thread_count: int,
        *,
        backend_id: str | None = None,
    ) -> list[RemoveLogoResult]:
        if not rows:
            return []

        self._cancel_event.clear()
        with self._procs_lock:
            self._active_procs.clear()

        backend = get_remove_logo_backend(backend_id) if backend_id is not None else self._default_backend

        worker_count = max(1, min(int(thread_count or 1), 32))
        LOGGER.info(
            "remove-logo: preparing batch (%d files, backend=%s)",
            len(rows),
            backend.backend_id,
        )

        gwt_binary_path: str | None = None
        ffmpeg_path = ""
        ffprobe_path = ""

        if backend.backend_id == GWT_VEO_BACKEND_ID:
            plugin_dir = Path(self._binaries_service.plugin_paths().plugin_dir)
            gwt_binary = resolve_veo_watermark_remover_binary(plugin_dir)
            if gwt_binary is None:
                LOGGER.error(
                    "remove-logo: Veo watermark remover not found in plugin folder (%s); "
                    "expected one of: %s",
                    plugin_dir,
                    ", ".join(GWT_VEO_BINARY_NAMES),
                )
                return [
                    RemoveLogoResult(
                        file_name=row.file_name,
                        input_path=row.input_path,
                        output_path=row.output_path,
                        status="failed",
                        progress_pct=0,
                    )
                    for row in rows
                ]
            gwt_binary_path = str(gwt_binary)
        else:
            ensured = self._binaries_service.ensure_required()
            if not ensured.ffmpeg.available or not ensured.ffprobe.available:
                LOGGER.error(
                    "remove-logo: binaries unavailable after ensure "
                    "(ffmpeg_ok=%s ffprobe_ok=%s last_error=%s ffmpeg_detail=%s ffprobe_detail=%s)",
                    ensured.ffmpeg.available,
                    ensured.ffprobe.available,
                    ensured.last_error,
                    ensured.ffmpeg.error,
                    ensured.ffprobe.error,
                )
                return [
                    RemoveLogoResult(
                        file_name=row.file_name,
                        input_path=row.input_path,
                        output_path=row.output_path,
                        status="failed",
                        progress_pct=0,
                    )
                    for row in rows
                ]
            ffmpeg_path = ensured.ffmpeg.path
            ffprobe_path = ensured.ffprobe.path

        with self._progress_lock:
            self._progress.clear()
            for row in rows:
                raw_in = (row.input_path or "").strip()
                if not raw_in:
                    continue
                try:
                    key = str(Path(raw_in).expanduser().resolve())
                except OSError:
                    key = raw_in
                self._progress[key] = 0

        results: list[RemoveLogoResult | None] = [None] * len(rows)
        with ThreadPoolExecutor(
            max_workers=worker_count,
            thread_name_prefix="jos-remove-watermark",
        ) as executor:
            future_map = {
                executor.submit(
                    self._process_one,
                    backend,
                    ffmpeg_path,
                    ffprobe_path,
                    row,
                    gwt_binary_path,
                ): index
                for index, row in enumerate(rows)
            }
            for future in as_completed(future_map):
                index = future_map[future]
                row = rows[index]
                try:
                    results[index] = future.result()
                except Exception:  # noqa: BLE001 - keep batch running
                    LOGGER.exception("remove-logo failed for %s", row.input_path)
                    if self._cancel_event.is_set():
                        results[index] = _cancelled_result(row)
                    else:
                        results[index] = RemoveLogoResult(
                            file_name=row.file_name,
                            input_path=row.input_path,
                            output_path=row.output_path,
                            status="failed",
                            progress_pct=0,
                        )

        if self._cancel_event.is_set():
            for index, row in enumerate(rows):
                if results[index] is None:
                    results[index] = _cancelled_result(row)

        return [item for item in results if item is not None]

    def _process_one(
        self,
        backend: RemoveLogoBackend,
        ffmpeg_path: str,
        ffprobe_path: str,
        row: RemoveLogoInput,
        gwt_binary_path: str | None = None,
    ) -> RemoveLogoResult:
        if self._cancel_event.is_set():
            return _cancelled_result(row)

        source = Path((row.input_path or "").strip()).expanduser()
        target = Path((row.output_path or "").strip()).expanduser()

        if not source.exists() or not source.is_file():
            LOGGER.error("remove-logo validation failed: input not found (%s)", source)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )
        if source.suffix.lower() not in SUPPORTED_VIDEO_SUFFIXES:
            LOGGER.error("remove-logo validation failed: unsupported format (%s)", source.suffix.lower())
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )
        if not str(target).strip():
            LOGGER.error("remove-logo validation failed: output path required for input=%s", source)
            return RemoveLogoResult(
                file_name=row.file_name,
                input_path=row.input_path,
                output_path=row.output_path,
                status="failed",
                progress_pct=0,
            )

        try:
            progress_key = str(source.resolve())
        except OSError:
            progress_key = str(source)

        def reporter(pct: int) -> None:
            self._set_progress(progress_key, pct)

        row_ctx = RemoveLogoExecutionContext(
            ffmpeg_path=ffmpeg_path,
            ffprobe_path=ffprobe_path,
            gwt_binary_path=gwt_binary_path,
            report_progress=reporter,
            cancel_event=self._cancel_event,
            register_subprocess=self._register_subprocess,
            unregister_subprocess=self._unregister_subprocess,
        )
        return backend.process(row_ctx, row, source, target)

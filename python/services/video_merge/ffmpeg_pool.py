"""Per-row FFmpeg segment pool (one pool per ``render_mix_row`` invocation)."""

from __future__ import annotations

import logging
import threading
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from python.services.video_merge.io import ExportRenderConfig

logger = logging.getLogger(__name__)


def parallel_clip_display_index(
    *,
    total: int,
    started: set[int],
    done: set[int],
) -> int:
    """Lowest clip index still rendering (stable label under parallel workers)."""
    pending = sorted(started - done)
    return pending[0] if pending else total


@dataclass(frozen=True)
class SegmentRenderTask:
    """One FFmpeg normalize/render invocation for a single source clip."""

    row_id: str
    clip_index: int
    clip_total: int
    src_path: str
    dest_path: Path
    zoom: float
    speed: float

    @property
    def basename(self) -> str:
        return Path(self.src_path).name


class RowClipProgress:
    """Stable row status label while multiple segment tasks run in parallel."""

    def __init__(self, clip_total: int) -> None:
        self._total = clip_total
        self._lock = threading.Lock()
        self._started: set[int] = set()
        self._done: set[int] = set()
        self._names: dict[int, str] = {}

    def _display_clip_index_unlocked(self) -> int:
        return parallel_clip_display_index(
            total=self._total,
            started=set(self._started),
            done=set(self._done),
        )

    def mark_started(self, clip_idx: int, basename: str) -> None:
        with self._lock:
            self._started.add(clip_idx)
            self._names[clip_idx] = basename

    def mark_done(self, clip_idx: int) -> None:
        with self._lock:
            self._done.add(clip_idx)

    def display_clip_index(self) -> int:
        with self._lock:
            return self._display_clip_index_unlocked()

    def display_basename(self, clip_idx: int, fallback: str) -> str:
        with self._lock:
            return self._names.get(self._display_clip_index_unlocked(), fallback)


class FfmpegTaskPool:
    """Thread pool sized by ``export_config.concurrency``; not shared across rows."""

    def __init__(self, max_workers: int) -> None:
        self._max_workers = max(1, max_workers)
        self._executor: ThreadPoolExecutor | None = None

    def __enter__(self) -> FfmpegTaskPool:
        self._executor = ThreadPoolExecutor(
            max_workers=self._max_workers,
            thread_name_prefix="ffmpeg-task",
        )
        logger.info("FFmpeg task pool started (workers=%s)", self._max_workers)
        return self

    def __exit__(self, *args: object) -> None:
        if self._executor is not None:
            self._executor.shutdown(wait=True, cancel_futures=False)
            self._executor = None
            logger.info("FFmpeg task pool shut down")

    def render_segments(
        self,
        tasks: list[SegmentRenderTask],
        *,
        export_config: ExportRenderConfig,
        ffmpeg_bin: Path,
        ffprobe_bin: Path,
        row_progress: RowClipProgress,
        on_clip_progress: Callable[[int, str, float | None, float | None], None],
        cancel_check: Callable[[], bool],
    ) -> list[Path | None]:
        """Run segment tasks; returns segment paths in clip_index order."""
        from python.services.video_merge.pipeline import _render_segment

        if not tasks:
            return []

        executor = self._executor
        if executor is None:
            raise RuntimeError("FfmpegTaskPool is not active; use as context manager.")

        n = len(tasks)
        results: list[Path | None] = [None] * n

        def run_task(task: SegmentRenderTask) -> tuple[int, Path | None, str]:
            if cancel_check():
                return task.clip_index, None, "Đã hủy."
            clip_idx = task.clip_index + 1
            row_progress.mark_started(clip_idx, task.basename)
            on_clip_progress(clip_idx, task.basename, None, None)

            def prog(dur: float | None, spd: float | None) -> None:
                on_clip_progress(clip_idx, task.basename, dur, spd)

            ok, msg = _render_segment(
                Path(task.src_path),
                task.dest_path,
                export_config,
                task.zoom,
                task.speed,
                ffmpeg_bin,
                ffprobe_bin,
                on_progress=prog,
                cancel_check=cancel_check,
            )
            if not ok:
                return task.clip_index, None, msg
            row_progress.mark_done(clip_idx)
            return task.clip_index, task.dest_path, ""

        futures: dict[Future[tuple[int, Path | None, str]], int] = {
            executor.submit(run_task, task): task.clip_index for task in tasks
        }
        errors: list[str] = []
        for future in as_completed(futures):
            idx, seg, err = future.result()
            if seg is None:
                errors.append(err or "Lỗi render clip.")
            else:
                results[idx] = seg

        if errors and any(path is None for path in results):
            return results
        return results

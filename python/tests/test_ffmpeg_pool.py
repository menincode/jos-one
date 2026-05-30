"""Tests for per-row FFmpeg task pool."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

from python.services.video_merge.ffmpeg_pool import (
    FfmpegTaskPool,
    RowClipProgress,
    SegmentRenderTask,
    parallel_clip_display_index,
)


def test_parallel_clip_display_index_order() -> None:
    assert parallel_clip_display_index(total=3, started={1, 2, 3}, done=set()) == 1
    assert parallel_clip_display_index(total=3, started={1, 2, 3}, done={1}) == 2
    assert parallel_clip_display_index(total=3, started={1, 2, 3}, done={1, 2, 3}) == 3


def test_row_clip_progress_display_basename() -> None:
    progress = RowClipProgress(2)
    progress.mark_started(1, "a.mp4")
    progress.mark_started(2, "b.mp4")
    assert progress.display_clip_index() == 1
    assert progress.display_basename(2, "fallback") == "a.mp4"
    progress.mark_done(1)
    assert progress.display_clip_index() == 2
    assert progress.display_basename(2, "fallback") == "b.mp4"


def test_parallel_progress_label_stays_on_earliest_pending() -> None:
    """Regression: parallel workers must not flip UI between Clip 1/N and 2/N."""
    progress = RowClipProgress(16)
    progress.mark_started(1, "clip-01.mp4")
    progress.mark_started(2, "clip-02.mp4")
    assert progress.display_clip_index() == 1
    # Worker 2 reports progress while worker 1 still running — label stays on clip 1.
    assert progress.display_clip_index() == 1
    progress.mark_done(1)
    assert progress.display_clip_index() == 2


def test_render_segments_dispatches_to_pool_workers() -> None:
    calls: list[int] = []

    def fake_render(src, dest, config, zoom, speed, ffmpeg_bin, ffprobe_bin, **kwargs):
        calls.append(zoom)
        Path(dest).parent.mkdir(parents=True, exist_ok=True)
        Path(dest).write_bytes(b"x")
        return True, ""

    tasks = [
        SegmentRenderTask(
            row_id="r1",
            clip_index=0,
            clip_total=2,
            src_path="/in/a.mp4",
            dest_path=Path("/tmp/seg_0000.mp4"),
            zoom=1.0,
            speed=1.0,
        ),
        SegmentRenderTask(
            row_id="r1",
            clip_index=1,
            clip_total=2,
            src_path="/in/b.mp4",
            dest_path=Path("/tmp/seg_0001.mp4"),
            zoom=2.0,
            speed=1.0,
        ),
    ]
    progress = RowClipProgress(2)
    tick: list[int] = []

    with patch(
        "python.services.video_merge.pipeline._render_segment",
        side_effect=fake_render,
    ):
        with FfmpegTaskPool(max_workers=2) as pool:
            results = pool.render_segments(
                tasks,
                export_config=MagicMock(),
                ffmpeg_bin=Path("ffmpeg"),
                ffprobe_bin=Path("ffprobe"),
                row_progress=progress,
                on_clip_progress=lambda *_a, **_k: tick.append(1),
                cancel_check=lambda: False,
            )

    assert len(results) == 2
    assert all(path is not None for path in results)
    assert sorted(calls) == [1.0, 2.0]


def test_render_segments_aborts_row_on_clip_failure() -> None:
    def fake_render(src, dest, config, zoom, speed, ffmpeg_bin, ffprobe_bin, **kwargs):
        if zoom == 2.0:
            return False, "encode failed"
        Path(dest).parent.mkdir(parents=True, exist_ok=True)
        Path(dest).write_bytes(b"x")
        return True, ""

    tasks = [
        SegmentRenderTask(
            row_id="r1",
            clip_index=0,
            clip_total=2,
            src_path="/in/a.mp4",
            dest_path=Path("/tmp/seg_0000.mp4"),
            zoom=1.0,
            speed=1.0,
        ),
        SegmentRenderTask(
            row_id="r1",
            clip_index=1,
            clip_total=2,
            src_path="/in/b.mp4",
            dest_path=Path("/tmp/seg_0001.mp4"),
            zoom=2.0,
            speed=1.0,
        ),
    ]
    progress = RowClipProgress(2)

    with patch(
        "python.services.video_merge.pipeline._render_segment",
        side_effect=fake_render,
    ):
        with FfmpegTaskPool(max_workers=2) as pool:
            results = pool.render_segments(
                tasks,
                export_config=MagicMock(),
                ffmpeg_bin=Path("ffmpeg"),
                ffprobe_bin=Path("ffprobe"),
                row_progress=progress,
                on_clip_progress=lambda *_a, **_k: None,
                cancel_check=lambda: False,
            )

    assert results[0] is not None
    assert results[1] is None

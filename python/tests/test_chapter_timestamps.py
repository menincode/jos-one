"""Tests for YouTube-style chapter timestamp helpers."""

from __future__ import annotations

import random

from python.services.video_merge.chapter_timestamps import (
    JoinTransitionPlan,
    build_chapter_text,
    chapter_title_from_video_path,
    format_youtube_timestamp,
    resolve_join_plan,
    segment_start_times,
)
from python.services.video_merge.io import ExportRenderConfig


def test_format_youtube_timestamp() -> None:
    assert format_youtube_timestamp(0) == "00:00"
    assert format_youtube_timestamp(65) == "01:05"
    assert format_youtube_timestamp(325) == "05:25"
    assert format_youtube_timestamp(3661) == "1:01:01"


def test_segment_start_times_concat_copy() -> None:
    starts = segment_start_times([10.0, 20.0, 5.0], None)
    assert starts == [0.0, 10.0, 30.0]


def test_segment_start_times_with_xfade_overlap() -> None:
    starts = segment_start_times([10.0, 20.0, 5.0], [1.0, 0.5])
    assert starts[0] == 0.0
    assert starts[1] == 9.0
    assert starts[2] == 28.5


def test_chapter_title_from_video_path_uses_file_name() -> None:
    assert chapter_title_from_video_path(r"D:\in\Hoàng tử Oliver.mp4") == "Hoàng tử Oliver.mp4"
    assert chapter_title_from_video_path("/videos/part-two.mkv") == "part-two.mkv"


def test_build_chapter_text_uses_video_file_names() -> None:
    plan = JoinTransitionPlan(False, (), ())
    text = build_chapter_text(
        ["/videos/intro.mp4", "/videos/part-two.mp4", "/videos/tail.mp4"],
        segment_durations=[10.0, 20.0, 5.0],
        join_plan=plan,
    )
    assert text.splitlines() == [
        "00:00 intro.mp4",
        "00:10 part-two.mp4",
        "00:30 tail.mp4",
    ]


def test_resolve_join_plan_none_when_transitions_disabled() -> None:
    config = ExportRenderConfig(
        format_ext="mp4",
        width=320,
        height=240,
        fps=15,
        zoom_min=1.0,
        zoom_max=1.0,
        speed_min=1.0,
        speed_max=1.0,
        logo_path=None,
        logo_position="bottom_right",
        duration_min_sec=10,
        duration_max_sec=120,
        concurrency=1,
        scene_transition="none",
    )
    plan = resolve_join_plan([10.0, 12.0], config, random.Random(0))
    assert plan.use_xfade is False
    assert plan.overlaps == ()


def test_resolve_join_plan_picks_overlaps_for_fade() -> None:
    config = ExportRenderConfig(
        format_ext="mp4",
        width=320,
        height=240,
        fps=15,
        zoom_min=1.0,
        zoom_max=1.0,
        speed_min=1.0,
        speed_max=1.0,
        logo_path=None,
        logo_position="bottom_right",
        duration_min_sec=10,
        duration_max_sec=120,
        concurrency=1,
        scene_transition="fade",
        transition_duration_min_sec=0.5,
        transition_duration_max_sec=1.0,
    )
    plan = resolve_join_plan([10.0, 12.0, 8.0], config, random.Random(42))
    assert plan.use_xfade is True
    assert len(plan.overlaps) == 2
    assert all(overlap > 0 for overlap in plan.overlaps)

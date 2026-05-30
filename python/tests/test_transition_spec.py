"""Tests for video_merge.transition_spec."""

from __future__ import annotations

import random

from python.services.video_merge import transition_spec


def test_resolve_transition_effect_none() -> None:
    rng = random.Random(1)
    assert transition_spec.resolve_transition_effect("none", rng) is None
    assert transition_spec.resolve_transition_effect("", rng) is None


def test_resolve_transition_effect_random_is_valid_xfade() -> None:
    rng = random.Random(42)
    effect = transition_spec.resolve_transition_effect("random", rng)
    assert effect in transition_spec.XFADE_TRANSITIONS


def test_build_xfade_filter_complex_two_clips() -> None:
    graph = transition_spec.build_xfade_filter_complex(
        segment_count=2,
        durations=[10.0, 8.0],
        transitions=["fade"],
        transition_durations=[0.5],
        include_audio=True,
    )
    assert "[0:v][1:v]xfade=transition=fade:duration=0.500:offset=9.500[vout]" in graph
    assert "[0:a][1:a]acrossfade=d=0.500:c1=tri:c2=tri[aout]" in graph


def test_build_xfade_filter_complex_three_clips_offset() -> None:
    graph = transition_spec.build_xfade_filter_complex(
        segment_count=3,
        durations=[5.0, 5.0, 5.0],
        transitions=["fade", "fadeblack"],
        transition_durations=[1.0, 1.0],
        include_audio=False,
    )
    assert "xfade=transition=fade:duration=1.000:offset=4.000[v01]" in graph
    assert "[v01][2:v]xfade=transition=fadeblack:duration=1.000:offset=8.000[vout]" in graph
    assert "acrossfade" not in graph


def test_build_concat_chain_two_clips() -> None:
    graph = transition_spec.build_concat_chain(
        video_labels=["[v0]", "[v1]"],
        audio_labels=["[a0]", "[a1]"],
    )
    assert graph == "[v0][a0][v1][a1]concat=n=2:v=1:a=1[vout][aout]"


def test_pick_transition_duration_caps_to_clip_length() -> None:
    rng = random.Random(0)
    duration = transition_spec.pick_transition_duration(
        0.4,
        0.8,
        rng,
        left_duration=0.6,
        right_duration=10.0,
    )
    assert duration <= 0.6 * 0.45 + 1e-6

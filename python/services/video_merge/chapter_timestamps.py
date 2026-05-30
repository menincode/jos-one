"""YouTube-style chapter timestamps for merged mix rows (full sequence)."""

from __future__ import annotations

import random
from dataclasses import dataclass
from pathlib import Path

from python.services.video_merge.io import ExportRenderConfig
from python.services.video_merge import transition_spec


@dataclass(frozen=True)
class JoinTransitionPlan:
    """Precomputed xfade overlaps between normalized segments."""

    use_xfade: bool
    transitions: tuple[str, ...]
    overlaps: tuple[float, ...]


def format_youtube_timestamp(seconds: float) -> str:
    """Format seconds as YouTube chapter time (M:SS or H:MM:SS)."""
    total = max(0, int(seconds))
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def chapter_title_from_video_path(path: str) -> str:
    """Chapter title = video file name (same as folder listing / UI ``video.name``)."""
    clean = path.strip()
    if not clean:
        return ""
    name = Path(clean).name
    if name:
        return name
    stem = Path(clean).stem
    return stem or clean


def segment_start_times(
    durations: list[float],
    transition_overlaps: list[float] | None,
) -> list[float]:
    """Start time (seconds) of each segment in the final joined output."""
    if not durations:
        return []
    if transition_overlaps is None:
        starts = [0.0]
        cumulative = 0.0
        for index in range(1, len(durations)):
            cumulative += durations[index - 1]
            starts.append(cumulative)
        return starts

    starts: list[float] = [0.0]
    for index in range(1, len(durations)):
        offset = sum(durations[:index]) - sum(transition_overlaps[:index])
        starts.append(max(0.0, offset))
    return starts


def resolve_join_plan(
    segment_durations: list[float],
    export_config: ExportRenderConfig,
    rng: random.Random,
) -> JoinTransitionPlan:
    """Mirror join transition planning (single rng pass shared with segment join)."""
    if len(segment_durations) < 2:
        return JoinTransitionPlan(False, (), ())

    gate = transition_spec.resolve_transition_effect(export_config.scene_transition, rng)
    if gate is None:
        return JoinTransitionPlan(False, (), ())

    transitions: list[str] = []
    overlaps: list[float] = []
    for index in range(len(segment_durations) - 1):
        effect = transition_spec.resolve_transition_effect(export_config.scene_transition, rng)
        transitions.append(effect or "fade")
        overlaps.append(
            transition_spec.pick_transition_duration(
                export_config.transition_duration_min_sec,
                export_config.transition_duration_max_sec,
                rng,
                left_duration=segment_durations[index],
                right_duration=segment_durations[index + 1],
            )
        )
    return JoinTransitionPlan(True, tuple(transitions), tuple(overlaps))


def build_chapter_text(
    sequence_paths: list[str],
    segment_durations: list[float],
    join_plan: JoinTransitionPlan,
) -> str:
    """Build multiline chapter text for all clips in the mix (YouTube description format)."""
    if not sequence_paths:
        return ""

    clip_count = min(len(sequence_paths), len(segment_durations))
    overlaps = list(join_plan.overlaps) if join_plan.use_xfade else None
    starts = segment_start_times(segment_durations, overlaps)
    lines: list[str] = []
    for index in range(clip_count):
        title = chapter_title_from_video_path(sequence_paths[index])
        lines.append(f"{format_youtube_timestamp(starts[index])} {title}")
    return "\n".join(lines)

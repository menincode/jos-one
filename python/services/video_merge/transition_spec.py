"""Scene transition helpers for xfade segment join."""

from __future__ import annotations

import random

# FFmpeg xfade transition names exposed in the UI (video-merge-export-types.ts).
XFADE_TRANSITIONS: tuple[str, ...] = (
    "fade",
    "fadeblack",
    "fadewhite",
    "dissolve",
    "wipeleft",
    "wiperight",
    "wipeup",
    "wipedown",
    "slideleft",
    "slideright",
    "slideup",
    "slidedown",
    "circlecrop",
    "distance",
    "radial",
)


def resolve_transition_effect(name: str, rng: random.Random) -> str | None:
    """Return FFmpeg xfade name, or ``None`` when transitions are disabled."""
    clean = name.strip().lower()
    if clean in ("", "none"):
        return None
    if clean == "random":
        return rng.choice(XFADE_TRANSITIONS)
    if clean in XFADE_TRANSITIONS:
        return clean
    return "fade"


def pick_transition_duration(
    min_sec: float,
    max_sec: float,
    rng: random.Random,
    *,
    left_duration: float,
    right_duration: float,
) -> float:
    """Pick overlap duration capped so both clips stay long enough."""
    lo = max(0.05, min(min_sec, max_sec))
    hi = max(lo, max(min_sec, max_sec))
    picked = rng.uniform(lo, hi)
    cap = max(0.05, min(left_duration, right_duration) * 0.45)
    return min(picked, cap)


def build_xfade_filter_complex(
    *,
    segment_count: int,
    durations: list[float],
    transitions: list[str],
    transition_durations: list[float],
    include_audio: bool,
) -> str:
    """Build chained ``xfade`` / ``acrossfade`` graph for N normalized segments."""
    if segment_count < 2:
        raise ValueError("need at least 2 segments for xfade")
    if len(durations) != segment_count:
        raise ValueError("durations length mismatch")
    if len(transitions) != segment_count - 1:
        raise ValueError("transitions length mismatch")
    if len(transition_durations) != segment_count - 1:
        raise ValueError("transition_durations length mismatch")

    parts: list[str] = []
    video_label = "[0:v]"
    audio_label = "[0:a]" if include_audio else None

    for index in range(1, segment_count):
        td = transition_durations[index - 1]
        trans = transitions[index - 1]
        offset = sum(durations[:index]) - sum(transition_durations[:index])
        offset = max(0.0, offset)

        next_video = f"[{index}:v]"
        out_video = "[vout]" if index == segment_count - 1 else f"[v{index:02d}]"
        parts.append(
            f"{video_label}{next_video}xfade=transition={trans}:duration={td:.3f}:offset={offset:.3f}{out_video}"
        )
        video_label = out_video

        if include_audio:
            next_audio = f"[{index}:a]"
            out_audio = "[aout]" if index == segment_count - 1 else f"[a{index:02d}]"
            parts.append(
                f"{audio_label}{next_audio}acrossfade=d={td:.3f}:c1=tri:c2=tri{out_audio}"
            )
            audio_label = out_audio

    return ";".join(parts)


def build_xfade_chain(
    *,
    video_labels: list[str],
    audio_labels: list[str] | None,
    durations: list[float],
    transitions: list[str],
    transition_durations: list[float],
    video_out: str = "[vout]",
    audio_out: str = "[aout]",
) -> str:
    """Build chained xfade/acrossfade between pre-normalized segment labels."""
    segment_count = len(video_labels)
    if segment_count < 2:
        raise ValueError("need at least 2 segments for xfade")
    if len(durations) != segment_count:
        raise ValueError("durations length mismatch")
    if len(transitions) != segment_count - 1:
        raise ValueError("transitions length mismatch")
    if len(transition_durations) != segment_count - 1:
        raise ValueError("transition_durations length mismatch")
    if audio_labels is not None and len(audio_labels) != segment_count:
        raise ValueError("audio_labels length mismatch")

    parts: list[str] = []
    video_label = video_labels[0]
    audio_label = audio_labels[0] if audio_labels else None

    for index in range(1, segment_count):
        td = transition_durations[index - 1]
        trans = transitions[index - 1]
        offset = sum(durations[:index]) - sum(transition_durations[:index])
        offset = max(0.0, offset)

        next_video = video_labels[index]
        out_video = video_out if index == segment_count - 1 else f"[vx{index:02d}]"
        parts.append(
            f"{video_label}{next_video}xfade=transition={trans}:duration={td:.3f}:offset={offset:.3f}{out_video}"
        )
        video_label = out_video

        if audio_labels is not None and audio_label is not None:
            next_audio = audio_labels[index]
            out_audio = audio_out if index == segment_count - 1 else f"[ax{index:02d}]"
            parts.append(
                f"{audio_label}{next_audio}acrossfade=d={td:.3f}:c1=tri:c2=tri{out_audio}"
            )
            audio_label = out_audio

    return ";".join(parts)


def build_concat_chain(
    *,
    video_labels: list[str],
    audio_labels: list[str] | None,
    video_out: str = "[vout]",
    audio_out: str = "[aout]",
) -> str:
    """Concat normalized segment labels (single re-encode join, no demuxer copy)."""
    segment_count = len(video_labels)
    if segment_count < 2:
        raise ValueError("need at least 2 segments for concat filter")
    if audio_labels is not None and len(audio_labels) != segment_count:
        raise ValueError("audio_labels length mismatch")

    if audio_labels is not None:
        inputs = "".join(f"{video_labels[i]}{audio_labels[i]}" for i in range(segment_count))
        return f"{inputs}concat=n={segment_count}:v=1:a=1{video_out}{audio_out}"
    inputs = "".join(video_labels)
    return f"{inputs}concat=n={segment_count}:v=1:a=0{video_out}"

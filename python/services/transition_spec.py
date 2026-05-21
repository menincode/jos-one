"""Scene transition helpers for tail-clip xfade merges."""

from __future__ import annotations

import random
from typing import Any

XFADE_EFFECTS: tuple[str, ...] = (
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

_VALID_EFFECTS = frozenset((*XFADE_EFFECTS, "none", "random"))


def parse_transition_effect(settings: dict[str, Any]) -> str:
    raw = str(settings.get("sceneTransition", "none")).strip().lower()
    if raw in _VALID_EFFECTS:
        return raw
    return "none"


def parse_transition_duration_bounds(
    settings: dict[str, Any],
) -> tuple[float, float, str | None]:
    try:
        min_sec = float(str(settings.get("transitionDurationMinSec", "0")).strip())
        max_sec = float(str(settings.get("transitionDurationMaxSec", "0")).strip())
    except ValueError:
        return 0.0, 0.0, "Thời lượng chuyển cảnh min/max không hợp lệ."
    if min_sec < 0 or max_sec < 0:
        return 0.0, 0.0, "Thời lượng chuyển cảnh phải ≥ 0."
    if min_sec > max_sec:
        return 0.0, 0.0, "Thời lượng chuyển cảnh tối thiểu không được lớn hơn tối đa."
    return min_sec, max_sec, None


def transitions_enabled(gap_durations: list[float], gap_types: list[str]) -> bool:
    for duration, name in zip(gap_durations, gap_types, strict=False):
        if duration > 0 and name:
            return True
    return False


def _pick_effect(effect: str, rng: random.Random) -> str:
    if effect == "random":
        return rng.choice(XFADE_EFFECTS)
    return effect


def build_gap_transitions(
    *,
    leading_count: int,
    sequence_len: int,
    min_sec: float,
    max_sec: float,
    effect: str,
    rng: random.Random,
) -> tuple[list[float], list[str]]:
    """One entry per gap between sequence[i] and sequence[i+1]; xfade only between tail clips."""
    gap_count = max(0, sequence_len - 1)
    durations: list[float] = []
    types: list[str] = []
    use_effect = effect not in ("", "none")

    for gap_index in range(gap_count):
        if gap_index < max(0, leading_count):
            durations.append(0.0)
            types.append("")
            continue
        if not use_effect or min_sec <= 0:
            durations.append(0.0)
            types.append("")
            continue
        hi = max_sec if max_sec > min_sec else min_sec
        durations.append(rng.uniform(min_sec, hi))
        types.append(_pick_effect(effect, rng))

    return durations, types

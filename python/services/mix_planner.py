"""Build per-row video sequences: fixed leading clips + random tail within duration bounds."""

from __future__ import annotations

import random
from typing import TypedDict


class MixRowInput(TypedDict):
    id: str
    leading_paths: list[str]


class PlannedMixRow(TypedDict):
    id: str
    leading_paths: list[str]
    tail_paths: list[str]
    sequence_paths: list[str]
    total_duration_sec: float


class MixPlanResult(TypedDict):
    ok: bool
    message: str
    rows: list[PlannedMixRow]


_MAX_SHUFFLE_ATTEMPTS = 80


def _duration_map(videos: list[dict[str, str | int | float | None]]) -> dict[str, float]:
    out: dict[str, float] = {}
    for item in videos:
        path = str(item.get("path", "")).strip()
        if not path:
            continue
        raw = item.get("duration_sec")
        if raw is None:
            raise ValueError(f"Thiếu thời lượng cho video: {item.get('name', path)}")
        duration = float(raw)
        if duration <= 0:
            raise ValueError(f"Thời lượng không hợp lệ: {item.get('name', path)}")
        out[path] = duration
    return out


def _leading_duration(paths: list[str], durations: dict[str, float]) -> float:
    return sum(durations[p] for p in paths)


def _plan_tail(
    *,
    leading_paths: list[str],
    pool_paths: list[str],
    durations: dict[str, float],
    min_sec: float,
    max_sec: float,
    rng: random.Random,
) -> tuple[list[str], str | None]:
    leading_total = _leading_duration(leading_paths, durations)
    if leading_total > max_sec:
        return [], "Video đầu vượt quá thời lượng tối đa."

    if leading_total >= min_sec:
        return [], None

    need_min = min_sec - leading_total
    remaining = list(pool_paths)
    if not remaining:
        return [], "Không còn video để mix sau phần đầu."

    for _ in range(_MAX_SHUFFLE_ATTEMPTS):
        rng.shuffle(remaining)
        tail: list[str] = []
        tail_total = 0.0
        for path in remaining:
            clip = durations[path]
            if leading_total + tail_total + clip > max_sec:
                continue
            tail.append(path)
            tail_total += clip
            if tail_total >= need_min:
                return tail, None

    return [], (
        "Không ghép được phần mix ngẫu nhiên trong khoảng thời lượng min–max "
        "(không cắt video)."
    )


def plan_mix_rows(
    rows: list[MixRowInput],
    videos: list[dict[str, str | int | float | None]],
    *,
    duration_min_sec: float,
    duration_max_sec: float,
    seed: int | None = None,
) -> MixPlanResult:
    """Plan sequences for each row; tail clips are unique across rows."""
    if duration_min_sec <= 0 or duration_max_sec <= 0:
        return {"ok": False, "message": "Thời lượng min/max phải lớn hơn 0.", "rows": []}
    if duration_min_sec > duration_max_sec:
        return {
            "ok": False,
            "message": "Thời lượng tối thiểu không được lớn hơn tối đa.",
            "rows": [],
        }
    if not rows:
        return {"ok": False, "message": "Thêm ít nhất một dòng mix.", "rows": []}

    try:
        durations = _duration_map(videos)
    except ValueError as exc:
        return {"ok": False, "message": str(exc), "rows": []}

    rng = random.Random(seed)
    used_paths: set[str] = set()
    planned: list[PlannedMixRow] = []

    for index, row in enumerate(rows):
        row_id = str(row.get("id", "")).strip() or f"row-{index + 1}"
        leading = [str(p).strip() for p in row.get("leading_paths", []) if str(p).strip()]

        if len(leading) < 1 or len(leading) > 5:
            return {
                "ok": False,
                "message": f"Dòng {index + 1}: chọn từ 1 đến 5 video đầu.",
                "rows": [],
            }

        for path in leading:
            if path not in durations:
                return {
                    "ok": False,
                    "message": f"Dòng {index + 1}: video không có trong thư mục đầu vào.",
                    "rows": [],
                }
            if path in used_paths:
                return {
                    "ok": False,
                    "message": (
                        f"Dòng {index + 1}: video đã được dùng ở dòng khác "
                        f"({path})."
                    ),
                    "rows": [],
                }

        leading_total = _leading_duration(leading, durations)
        if leading_total > duration_max_sec:
            return {
                "ok": False,
                "message": f"Dòng {index + 1}: video đầu vượt quá thời lượng tối đa.",
                "rows": [],
            }

        pool = [
            p
            for p in durations
            if p not in set(leading) and p not in used_paths
        ]

        tail, err = _plan_tail(
            leading_paths=leading,
            pool_paths=pool,
            durations=durations,
            min_sec=duration_min_sec,
            max_sec=duration_max_sec,
            rng=rng,
        )
        if err:
            return {"ok": False, "message": f"Dòng {index + 1}: {err}", "rows": []}

        sequence = [*leading, *tail]
        total = sum(durations[p] for p in sequence)
        if total < duration_min_sec or total > duration_max_sec:
            return {
                "ok": False,
                "message": f"Dòng {index + 1}: tổng thời lượng ngoài khoảng cho phép.",
                "rows": [],
            }

        for path in tail:
            used_paths.add(path)
        for path in leading:
            used_paths.add(path)

        planned.append(
            {
                "id": row_id,
                "leading_paths": leading,
                "tail_paths": tail,
                "sequence_paths": sequence,
                "total_duration_sec": total,
            }
        )

    return {"ok": True, "message": "", "rows": planned}

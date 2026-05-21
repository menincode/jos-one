"""Tests for mix row planning."""

from __future__ import annotations

from python.services.mix_planner import plan_mix_rows


def _videos(*items: tuple[str, float]) -> list[dict]:
    return [
        {
            "name": path.split("/")[-1],
            "path": path,
            "size_bytes": 100,
            "duration_sec": duration,
        }
        for path, duration in items
    ]


def test_plan_single_row_leading_only_in_range() -> None:
    rows = [{"id": "r1", "leading_paths": ["/v/a.mp4", "/v/b.mp4"]}]
    videos = _videos(("/v/a.mp4", 30.0), ("/v/b.mp4", 40.0), ("/v/c.mp4", 20.0))
    result = plan_mix_rows(rows, videos, duration_min_sec=60, duration_max_sec=90, seed=1)
    assert result["ok"] is True
    assert len(result["rows"]) == 1
    assert result["rows"][0]["sequence_paths"] == ["/v/a.mp4", "/v/b.mp4"]
    assert result["rows"][0]["tail_paths"] == []


def test_plan_adds_tail_to_reach_min_duration() -> None:
    rows = [{"id": "r1", "leading_paths": ["/v/a.mp4"]}]
    videos = _videos(
        ("/v/a.mp4", 20.0),
        ("/v/b.mp4", 25.0),
        ("/v/c.mp4", 30.0),
    )
    result = plan_mix_rows(rows, videos, duration_min_sec=60, duration_max_sec=90, seed=42)
    assert result["ok"] is True
    row = result["rows"][0]
    assert row["leading_paths"] == ["/v/a.mp4"]
    assert len(row["tail_paths"]) >= 1
    assert 60 <= row["total_duration_sec"] <= 90


def test_plan_tail_unique_across_rows() -> None:
    rows = [
        {"id": "r1", "leading_paths": ["/v/a.mp4"]},
        {"id": "r2", "leading_paths": ["/v/d.mp4"]},
    ]
    videos = _videos(
        ("/v/a.mp4", 15.0),
        ("/v/b.mp4", 20.0),
        ("/v/c.mp4", 25.0),
        ("/v/d.mp4", 15.0),
        ("/v/e.mp4", 20.0),
        ("/v/f.mp4", 25.0),
    )
    result = plan_mix_rows(rows, videos, duration_min_sec=50, duration_max_sec=80, seed=7)
    assert result["ok"] is True
    used_tails: set[str] = set()
    for row in result["rows"]:
        for path in row["tail_paths"]:
            assert path not in used_tails
            used_tails.add(path)


def test_plan_rejects_duplicate_leading_across_rows() -> None:
    rows = [
        {"id": "r1", "leading_paths": ["/v/a.mp4"]},
        {"id": "r2", "leading_paths": ["/v/a.mp4"]},
    ]
    videos = _videos(("/v/a.mp4", 30.0), ("/v/b.mp4", 30.0))
    result = plan_mix_rows(rows, videos, duration_min_sec=30, duration_max_sec=120, seed=1)
    assert result["ok"] is False
    assert "dòng khác" in result["message"].lower() or "đã được" in result["message"].lower()


def test_plan_rejects_leading_over_max() -> None:
    rows = [{"id": "r1", "leading_paths": ["/v/a.mp4", "/v/b.mp4"]}]
    videos = _videos(("/v/a.mp4", 50.0), ("/v/b.mp4", 50.0))
    result = plan_mix_rows(rows, videos, duration_min_sec=10, duration_max_sec=60, seed=1)
    assert result["ok"] is False

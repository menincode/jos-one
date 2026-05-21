from python.services.video_merge_runner import parse_concurrency


def test_parse_concurrency_default() -> None:
    assert parse_concurrency({}) == 4


def test_parse_concurrency_clamps() -> None:
    assert parse_concurrency({"concurrency": "0"}) == 1
    assert parse_concurrency({"concurrency": "99"}) == 16
    assert parse_concurrency({"concurrency": "8"}) == 8


def test_parse_concurrency_invalid_falls_back() -> None:
    assert parse_concurrency({"concurrency": "abc"}) == 4

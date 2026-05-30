"""Tests for log path shortening in logging setup."""

from __future__ import annotations

import logging

import pytest

from python import log_paths


def test_shorten_paths_in_log_message_strips_repo_root(
    tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(log_paths, "use_relative_paths_in_logs", lambda: True)
    monkeypatch.setattr(log_paths, "path_display_base", lambda: tmp_path)

    nested = tmp_path / "test" / "input_folder" / "clip.mp4"
    message = f"Render segment — FFmpeg command: '{nested}'"

    result = log_paths.shorten_paths_in_log_message(message)
    assert result.startswith("Render segment")
    assert result.endswith("clip.mp4'")
    assert "test" in result and "input_folder" in result
    assert str(tmp_path) not in result


def test_configure_log_paths_adds_filter_once(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(log_paths, "use_relative_paths_in_logs", lambda: True)

    root = logging.getLogger()
    handler = logging.StreamHandler()
    root.addHandler(handler)
    try:
        log_paths.configure_log_paths()
        log_paths.configure_log_paths()
        filters = [f for f in handler.filters if isinstance(f, log_paths.RelativePathLogFilter)]
        assert len(filters) == 1
    finally:
        root.removeHandler(handler)
        handler.close()


def test_setup_logging_calls_configure_log_paths(monkeypatch: pytest.MonkeyPatch) -> None:
    from python import logging_config

    called: list[bool] = []

    def fake_configure() -> None:
        called.append(True)

    monkeypatch.setattr(log_paths, "configure_log_paths", fake_configure)

    # Reset root handlers so setup_logging runs fully once.
    root = logging.getLogger()
    for handler in list(root.handlers):
        root.removeHandler(handler)
        handler.close()

    logging_config.setup_logging(debug=False)
    assert called

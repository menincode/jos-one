"""Tests for path_display helpers."""

from __future__ import annotations

from pathlib import Path

import pytest

from python import path_display


def test_to_display_path_relative_to_base(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(path_display, "use_relative_paths_in_logs", lambda: True)
    base = tmp_path / "repo"
    base.mkdir()
    nested = base / "test" / "input_folder" / "clip.mp4"
    nested.parent.mkdir(parents=True)
    nested.write_bytes(b"x")

    assert path_display.to_display_path(nested, base=base) == "test/input_folder/clip.mp4"


def test_to_display_path_keeps_absolute_when_disabled(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(path_display, "use_relative_paths_in_logs", lambda: False)
    file_path = tmp_path / "clip.mp4"
    file_path.write_bytes(b"x")

    assert path_display.to_display_path(file_path, base=tmp_path) == str(file_path)


def test_to_display_path_outside_base_unchanged(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(path_display, "use_relative_paths_in_logs", lambda: True)
    base = tmp_path / "repo"
    base.mkdir()
    outside = tmp_path / "elsewhere" / "clip.mp4"
    outside.parent.mkdir()
    outside.write_bytes(b"x")

    assert path_display.to_display_path(outside, base=base) == str(outside.resolve())


def test_relativize_ffmpeg_cmd_for_log(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(path_display, "use_relative_paths_in_logs", lambda: True)
    monkeypatch.setattr(path_display, "path_display_base", lambda: tmp_path)

    ffmpeg = tmp_path / "plugins" / "ffmpeg.exe"
    ffmpeg.parent.mkdir(parents=True)
    ffmpeg.write_bytes(b"x")
    src = tmp_path / "test" / "input_folder" / "in.mp4"
    src.parent.mkdir(parents=True)
    src.write_bytes(b"x")
    dest = tmp_path / "temp" / "seg_0001.mp4"
    dest.parent.mkdir(parents=True)

    cmd = [
        str(ffmpeg),
        "-y",
        "-i",
        str(src),
        "-filter_complex",
        "[0:v]scale=1920:1080[vout]",
        "-map",
        "[vout]",
        str(dest),
    ]
    display = path_display.relativize_ffmpeg_cmd_for_log(cmd)

    assert display[0] == "plugins/ffmpeg.exe"
    assert display[3] == "test/input_folder/in.mp4"
    assert display[4] == "-filter_complex"
    assert display[5] == "[0:v]scale=1920:1080[vout]"
    assert display[-1] == "temp/seg_0001.mp4"


def test_use_relative_paths_respects_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("FFMPEG_LOG_RELATIVE_PATHS", raising=False)
    assert path_display.use_relative_paths_in_logs() is True

    monkeypatch.setenv("FFMPEG_LOG_RELATIVE_PATHS", "0")
    assert path_display.use_relative_paths_in_logs() is False

    monkeypatch.setenv("FFMPEG_LOG_RELATIVE_PATHS", "true")
    assert path_display.use_relative_paths_in_logs() is True

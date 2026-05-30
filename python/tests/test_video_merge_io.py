"""Tests for video_merge.io."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from python.services.settings_service import DEFAULT_VIDEO_EXPORT
from python.services.video_merge.io import (
    IMAGE_FILE_TYPES,
    VIDEO_FILE_TYPES,
    _resolve_initial_directory,
    enrich_videos_with_duration,
    filter_folder_videos_in_directory,
    list_videos_in_folder,
    open_folder_in_explorer,
    open_media_file,
    open_image_file_dialog,
    open_input_folder_dialog,
    parse_export_settings,
    probe_duration_ffprobe,
    validate_merge_folders,
)


def test_parse_export_settings_ok() -> None:
    config, err = parse_export_settings(dict(DEFAULT_VIDEO_EXPORT))
    assert err is None
    assert config is not None
    assert config.width == 1920
    assert config.height == 1080
    assert config.fps == 30
    assert config.zoom_min == 1.0
    assert config.speed_max == 1.1
    assert config.duration_min_sec == 3600.0
    assert config.duration_max_sec == 5400.0


def test_parse_export_settings_invalid_resolution() -> None:
    config, err = parse_export_settings({"resolution": ""})
    assert config is None
    assert err is not None


def test_validate_merge_folders_requires_both_paths(tmp_path: Path) -> None:
    in_dir = tmp_path / "in"
    out_dir = tmp_path / "out"
    in_dir.mkdir()
    out_dir.mkdir()

    missing = validate_merge_folders(str(in_dir), "")
    assert missing["ok"] is False
    assert missing["output_ok"] is False

    ok = validate_merge_folders(str(in_dir), str(out_dir))
    assert ok["ok"] is True
    assert ok["input_ok"] is True
    assert ok["output_ok"] is True

    bad_in = validate_merge_folders(str(tmp_path / "nope"), str(out_dir))
    assert bad_in["ok"] is False
    assert bad_in["input_ok"] is False


def test_parse_export_settings_min_gt_max_duration() -> None:
    config, err = parse_export_settings(
        {
            "resolution": "1920x1080",
            "fps": "30",
            "durationMinSec": "100",
            "durationMaxSec": "60",
        }
    )
    assert config is None
    assert err is not None
    assert "tối thiểu" in err.lower() or "tối đa" in err.lower()


def test_list_videos_in_folder_empty_when_no_videos() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        result = list_videos_in_folder(tmp)
    assert result["ok"] is True
    assert result["videos"] == []


def test_list_videos_in_folder_finds_supported_extensions() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "a.mp4").write_bytes(b"x" * 100)
        (root / "b.txt").write_text("skip", encoding="utf-8")
        (root / "c.MOV").write_bytes(b"y" * 200)

        result = list_videos_in_folder(tmp)

    assert result["ok"] is True
    names = [v["name"] for v in result["videos"]]
    assert names == ["a.mp4", "c.MOV"]
    assert result["videos"][0]["size_bytes"] == 100
    assert result["videos"][0]["duration_sec"] is None
    assert result["videos"][1]["size_bytes"] == 200


def test_list_videos_in_folder_invalid_path(tmp_path: Path) -> None:
    missing = tmp_path / "definitely-missing-folder-9f3c2a1b"
    assert not missing.exists()
    result = list_videos_in_folder(str(missing))
    assert result["ok"] is False
    assert result["videos"] == []


def test_list_videos_in_folder_rejects_empty_string() -> None:
    with pytest.raises(ValueError, match="trống"):
        list_videos_in_folder("   ")


def test_open_folder_in_explorer_invalid_path(tmp_path: Path) -> None:
    missing = tmp_path / "definitely-missing-folder-9f3c2a1b"
    assert not missing.exists()
    result = open_folder_in_explorer(str(missing))
    assert result["ok"] is False
    assert "message" in result


def test_open_media_file_missing_file(tmp_path: Path) -> None:
    missing = tmp_path / "no-such-output.mp4"
    result = open_media_file(str(missing))
    assert result["ok"] is False
    assert "không tồn tại" in str(result["message"]).lower()


def test_open_media_file_opens_existing_file(tmp_path: Path) -> None:
    media = tmp_path / "mix-preview.mp4"
    media.write_bytes(b"\x00\x00\x00\x18ftypmp42")
    with patch("python.services.video_merge.io.os.startfile") as startfile:
        result = open_media_file(str(media))
    assert result["ok"] is True
    startfile.assert_called_once()


def test_resolve_initial_directory_from_existing_folder(tmp_path: Path) -> None:
    folder = tmp_path / "clips"
    folder.mkdir()
    assert _resolve_initial_directory(str(folder)) == str(folder.resolve())


def test_resolve_initial_directory_from_file_uses_parent(tmp_path: Path) -> None:
    folder = tmp_path / "clips"
    folder.mkdir()
    video = folder / "a.mp4"
    video.write_bytes(b"x")
    assert _resolve_initial_directory(str(video)) == str(folder.resolve())


def test_resolve_initial_directory_empty_falls_back_to_tool_root() -> None:
    from python.config import get_tool_root

    assert _resolve_initial_directory("") == str(get_tool_root().resolve())


def test_file_type_filters_match_pywebview_format() -> None:
    import re

    pattern = re.compile(r"^.+\s\(\*\.[^)]+\)$")
    for group in (*VIDEO_FILE_TYPES, *IMAGE_FILE_TYPES):
        assert pattern.match(group), group


def test_open_input_folder_dialog_cancel() -> None:
    class FakeWindow:
        def create_file_dialog(self, *_args, **_kwargs):
            return None

    class FakeBridge:
        window = FakeWindow()

    result = open_input_folder_dialog(FakeBridge(), "")
    assert result["ok"] is False
    assert "hủy" in result["message"].lower()


def test_open_input_folder_dialog_returns_parent_of_video(tmp_path: Path) -> None:
    folder = tmp_path / "in"
    folder.mkdir()
    video = folder / "clip.mp4"
    video.write_bytes(b"x")

    class FakeWindow:
        def create_file_dialog(self, *_args, **_kwargs):
            return (str(video),)

    class FakeBridge:
        window = FakeWindow()

    result = open_input_folder_dialog(FakeBridge(), str(folder))
    assert result["ok"] is True
    assert result["path"] == str(folder.resolve())


def test_open_image_file_dialog_cancel() -> None:
    class FakeWindow:
        def create_file_dialog(self, *_args, **_kwargs):
            return None

    class FakeBridge:
        window = FakeWindow()

    result = open_image_file_dialog(FakeBridge(), "")
    assert result["ok"] is False


def test_probe_duration_ffprobe_parses_stdout() -> None:
    ffprobe = Path("C:/tools/ffprobe.exe")
    with patch(
        "python.services.video_merge.io.probe_media",
        return_value={"format": {"duration": "123.456"}},
    ):
        assert probe_duration_ffprobe("C:/v/a.mp4", ffprobe) == 123.456


def test_probe_duration_ffprobe_returns_none_on_failure() -> None:
    ffprobe = Path("C:/tools/ffprobe.exe")
    with patch("python.services.video_merge.io.probe_media", return_value=None):
        assert probe_duration_ffprobe("C:/v/a.mp4", ffprobe) is None


def test_enrich_videos_without_ffprobe_sets_null() -> None:
    videos = [{"name": "a.mp4", "path": "/a.mp4", "size_bytes": 1, "duration_sec": None}]
    with patch("python.services.video_merge.io.get_ffprobe_path", return_value=None):
        enriched = enrich_videos_with_duration(videos)
    assert enriched[0]["duration_sec"] is None


def test_enrich_videos_parallel_probe() -> None:
    videos = [
        {"name": "a.mp4", "path": "/a.mp4", "size_bytes": 1, "duration_sec": None},
        {"name": "b.mp4", "path": "/b.mp4", "size_bytes": 2, "duration_sec": None},
    ]
    ffprobe = Path("/ffprobe")

    def fake_media(path: str, _probe: Path) -> dict:
        if path == "/a.mp4":
            return {
                "format": {"duration": "10.0"},
                "streams": [{"codec_type": "video", "width": 1920, "height": 1080}],
            }
        return {
            "format": {"duration": "20.0"},
            "streams": [{"codec_type": "video", "width": 1280, "height": 720}],
        }

    with patch("python.services.video_merge.io.get_ffprobe_path", return_value=ffprobe):
        with patch(
            "python.services.video_merge.io.probe_media",
            side_effect=fake_media,
        ):
            enriched = enrich_videos_with_duration(videos, max_workers=2)

    assert enriched[0]["duration_sec"] == 10.0
    assert enriched[0]["width"] == 1920
    assert enriched[0]["height"] == 1080
    assert enriched[1]["duration_sec"] == 20.0
    assert enriched[1]["width"] == 1280
    assert enriched[1]["height"] == 720


def test_enrich_videos_skips_complete_metadata() -> None:
    videos = [
        {
            "name": "cached.mp4",
            "path": "/cached.mp4",
            "size_bytes": 1,
            "duration_sec": 12.0,
            "width": 1920,
            "height": 1080,
        },
        {"name": "b.mp4", "path": "/b.mp4", "size_bytes": 2, "duration_sec": None},
    ]
    ffprobe = Path("/ffprobe")

    def fake_media(path: str, _probe: Path) -> dict:
        assert path == "/b.mp4"
        return {
            "format": {"duration": "20.0"},
            "streams": [{"codec_type": "video", "width": 1280, "height": 720}],
        }

    with patch("python.services.video_merge.io.get_ffprobe_path", return_value=ffprobe):
        with patch("python.services.video_merge.io.probe_media", side_effect=fake_media):
            enriched = enrich_videos_with_duration(videos, max_workers=2)

    assert enriched[0]["duration_sec"] == 12.0
    assert enriched[1]["duration_sec"] == 20.0


def test_filter_folder_videos_in_directory(tmp_path: Path) -> None:
    root = tmp_path / "in"
    root.mkdir()
    video = root / "a.mp4"
    video.write_bytes(b"x")
    kept = filter_folder_videos_in_directory(
        [{"name": "a.mp4", "path": str(video), "size_bytes": 1, "duration_sec": 5.0}],
        str(root),
    )
    assert kept is not None
    assert kept[0]["duration_sec"] == 5.0
    assert filter_folder_videos_in_directory(
        [{"name": "a.mp4", "path": str(tmp_path / "other" / "a.mp4"), "size_bytes": 1}],
        str(root),
    ) is None

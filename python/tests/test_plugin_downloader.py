"""Tests for plugin downloader."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from python.services import plugin_downloader as pd


class TestPlatformInfo:
    def test_windows_64bit(self) -> None:
        with patch.object(pd.platform, "system", return_value="Windows"):
            with patch.object(pd.platform, "machine", return_value="AMD64"):
                assert pd.get_platform_info() == ("Windows", "64bit")


class TestPaths:
    def test_get_plugin_dir_ffmpeg_dev(self) -> None:
        with patch.object(pd.sys, "frozen", False, create=True):
            assert pd.get_plugin_dir("ffmpeg") == pd.REPO_ROOT / "plugins"

    def test_get_ffmpeg_path_uses_plugin_dir(self, tmp_path: Path) -> None:
        plugin_dir = tmp_path / "plugins"
        plugin_dir.mkdir()
        binary = plugin_dir / "ffmpeg.exe"
        binary.write_bytes(b"")
        with patch.object(pd, "get_plugin_dir", return_value=plugin_dir):
            assert pd.get_ffmpeg_path() == binary.resolve()

    def test_get_ffmpeg_path_ignores_system_path(self, tmp_path: Path) -> None:
        plugin_dir = tmp_path / "plugins"
        plugin_dir.mkdir()
        bundled = plugin_dir / "ffmpeg.exe"
        bundled.write_bytes(b"bundled")
        system_ffmpeg = tmp_path / "system" / "ffmpeg.exe"
        system_ffmpeg.parent.mkdir(parents=True)
        system_ffmpeg.write_bytes(b"system")
        with patch.object(pd, "get_plugin_dir", return_value=plugin_dir):
            with patch.object(pd.shutil, "which", return_value=str(system_ffmpeg)):
                assert pd.get_ffmpeg_path() == bundled.resolve()

    def test_get_ffmpeg_path_none_without_plugin_binary(self, tmp_path: Path) -> None:
        plugin_dir = tmp_path / "plugins"
        plugin_dir.mkdir()
        with patch.object(pd, "get_plugin_dir", return_value=plugin_dir):
            with patch.object(
                pd.shutil, "which", return_value=str(tmp_path / "ffmpeg.exe")
            ):
                assert pd.get_ffmpeg_path() is None


class TestDownload:
    def test_skips_when_binaries_exist(self, tmp_path: Path) -> None:
        plugins_root = tmp_path / "plugins"
        plugin_dir = plugins_root  # ffmpeg/ffprobe now live directly under plugins/
        plugin_dir.mkdir(parents=True)
        (plugin_dir / "ffmpeg.exe").write_bytes(b"")
        (plugin_dir / "ffprobe.exe").write_bytes(b"")

        with patch.object(pd, "get_plugins_dir", return_value=plugins_root):
            with patch.object(pd, "get_platform_info", return_value=("Windows", "64bit")):
                with patch.object(pd, "download_file") as download:
                    assert pd.download_ffbinaries_plugin(pd.FFMPEG_PLUGIN) is True
                    download.assert_not_called()

    def test_status_not_ready_when_missing(self) -> None:
        with patch.object(pd, "get_plugin_executable", return_value=None):
            status = pd.get_ffmpeg_status()
            assert status["ready"] is False

    def test_unknown_plugin_returns_false(self) -> None:
        assert pd.download_plugin("unknown") is False

    def test_download_plugins_in_background_uses_thread_pool(self) -> None:
        mock_executor = MagicMock()
        with patch.object(pd, "get_plugin_download_executor", return_value=mock_executor):
            pd.download_plugins_in_background(["ffmpeg"])
        mock_executor.submit.assert_called_once()
        assert mock_executor.submit.call_args[0][0].__name__ == "_run"

    def test_migrate_legacy_ffmpeg_dir(self, tmp_path: Path) -> None:
        # v1 layout: <root>/ffmpeg/ → should land at plugins/ (via v1→v2→current)
        legacy = tmp_path / "ffmpeg"
        legacy.mkdir()
        (legacy / "ffmpeg.exe").write_bytes(b"")
        plugins = tmp_path / "plugins"
        with patch.object(pd, "REPO_ROOT", tmp_path):
            with patch.object(pd.sys, "frozen", False, create=True):
                pd.migrate_legacy_ffmpeg_dir()
        assert not legacy.exists()
        assert (plugins / "ffmpeg.exe").is_file()

    def test_migrate_v2_ffmpeg_dir(self, tmp_path: Path) -> None:
        # v2 layout: plugins/ffmpeg/ → should migrate to plugins/
        plugins = tmp_path / "plugins"
        v2_dir = plugins / "ffmpeg"
        v2_dir.mkdir(parents=True)
        (v2_dir / "ffmpeg.exe").write_bytes(b"")
        (v2_dir / "ffprobe.exe").write_bytes(b"")
        with patch.object(pd, "REPO_ROOT", tmp_path):
            with patch.object(pd.sys, "frozen", False, create=True):
                pd.migrate_legacy_ffmpeg_dir()
        assert (plugins / "ffmpeg.exe").is_file()
        assert (plugins / "ffprobe.exe").is_file()

"""Resolve ffmpeg/ffprobe and plugin directory for watermark removal."""

from __future__ import annotations

from dataclasses import dataclass

from python.services.plugin_downloader import (
    download_plugin,
    get_ffmpeg_path,
    get_ffprobe_path,
    get_plugins_dir,
)


@dataclass(frozen=True)
class BinaryState:
    available: bool
    path: str
    error: str


@dataclass(frozen=True)
class BinaryStatus:
    ffmpeg: BinaryState
    ffprobe: BinaryState
    last_error: str = ""


@dataclass(frozen=True)
class PluginPaths:
    plugin_dir: str
    ffmpeg_path: str
    ffprobe_path: str


class LocalBinariesService:
    """Thin adapter over jos-desktop plugin_downloader (replaces veo3-pro BinariesService)."""

    def plugin_paths(self) -> PluginPaths:
        plugin_dir = get_plugins_dir()
        ffmpeg = get_ffmpeg_path()
        ffprobe = get_ffprobe_path()
        return PluginPaths(
            plugin_dir=str(plugin_dir.resolve()),
            ffmpeg_path=str(ffmpeg.resolve()) if ffmpeg else "",
            ffprobe_path=str(ffprobe.resolve()) if ffprobe else "",
        )

    def ensure_required(self) -> BinaryStatus:
        plugin_dir = get_plugins_dir()
        if not get_ffmpeg_path() or not get_ffprobe_path():
            download_plugin("ffmpeg")
        ffmpeg = get_ffmpeg_path()
        ffprobe = get_ffprobe_path()
        ffmpeg_state = BinaryState(
            available=ffmpeg is not None and ffmpeg.is_file(),
            path=str(ffmpeg.resolve()) if ffmpeg else "",
            error="" if ffmpeg else f"FFmpeg not found in {plugin_dir}",
        )
        ffprobe_state = BinaryState(
            available=ffprobe is not None and ffprobe.is_file(),
            path=str(ffprobe.resolve()) if ffprobe else "",
            error="" if ffprobe else f"FFprobe not found in {plugin_dir}",
        )
        return BinaryStatus(ffmpeg=ffmpeg_state, ffprobe=ffprobe_state)

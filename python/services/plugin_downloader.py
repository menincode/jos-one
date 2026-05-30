"""Download optional executable plugins (ffmpeg, ffprobe, …) into local storage.

Downloads run on a dedicated :class:`~concurrent.futures.ThreadPoolExecutor` so the
pywebview main thread is never blocked by network I/O or zip extraction.
"""

from __future__ import annotations

import logging
import os
import platform
import shutil
import sys
import tempfile
import threading
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from python.config import REPO_ROOT

logger = logging.getLogger(__name__)

FFBINARIES_BASE_URL = (
    "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1"
)

PLATFORM_MAP: dict[str, dict[str, str]] = {
    "Windows": {"32bit": "win-32", "64bit": "win-64"},
    "Linux": {
        "32bit": "linux-32",
        "64bit": "linux-64",
        "arm": "linux-armhf-32",
        "arm64": "linux-arm-64",
    },
    "Darwin": {"64bit": "macos-64"},
}

DEFAULT_STARTUP_PLUGINS: tuple[str, ...] = ("ffmpeg",)

# Room for parallel plugins × executables without starving the pool.
PLUGIN_DOWNLOAD_MAX_WORKERS = 8

_PLUGIN_EXECUTOR: ThreadPoolExecutor | None = None
_PLUGIN_EXECUTOR_LOCK = threading.Lock()


@dataclass(frozen=True)
class PluginExecutable:
    """One binary inside a plugin bundle."""

    key: str
    win_filename: str
    unix_filename: str

    def filename(self) -> str:
        return self.win_filename if sys.platform == "win32" else self.unix_filename


@dataclass(frozen=True)
class FfbinariesPlugin:
    """Plugin fetched as separate zips from ffbinaries prebuilt releases."""

    id: str
    version: str
    executables: tuple[PluginExecutable, ...]
    required_keys: frozenset[str]
    base_url: str = FFBINARIES_BASE_URL
    # subdir: name of subdirectory under plugins/; None → use plugin id; "" → plugins/ root
    subdir: str | None = None

    def resolve_dir(self) -> Path:
        name = self.id if self.subdir is None else self.subdir
        return get_plugins_dir() / name if name else get_plugins_dir()


FFMPEG_PLUGIN = FfbinariesPlugin(
    id="ffmpeg",
    version="4.4.1",
    executables=(
        PluginExecutable("ffmpeg", "ffmpeg.exe", "ffmpeg"),
        PluginExecutable("ffprobe", "ffprobe.exe", "ffprobe"),
    ),
    required_keys=frozenset({"ffmpeg", "ffprobe"}),
    subdir="",  # install directly under plugins/, not plugins/ffmpeg/
)

REGISTERED_PLUGINS: dict[str, FfbinariesPlugin] = {
    FFMPEG_PLUGIN.id: FFMPEG_PLUGIN,
}


def get_plugin_download_executor() -> ThreadPoolExecutor:
    """Shared pool for plugin downloads (never run on the UI / main thread)."""
    global _PLUGIN_EXECUTOR
    if _PLUGIN_EXECUTOR is None:
        with _PLUGIN_EXECUTOR_LOCK:
            if _PLUGIN_EXECUTOR is None:
                _PLUGIN_EXECUTOR = ThreadPoolExecutor(
                    max_workers=PLUGIN_DOWNLOAD_MAX_WORKERS,
                    thread_name_prefix="PluginDownload",
                )
    return _PLUGIN_EXECUTOR


def get_platform_info() -> Optional[tuple[str, str]]:
    system = platform.system()
    machine = platform.machine().lower()

    if system == "Windows":
        if "64" in machine or machine in ("x86_64", "amd64"):
            return ("Windows", "64bit")
        return ("Windows", "32bit")
    if system == "Linux":
        if "arm" in machine or "aarch64" in machine:
            if "64" in machine or machine == "aarch64":
                return ("Linux", "arm64")
            return ("Linux", "arm")
        if "64" in machine or machine in ("x86_64", "amd64"):
            return ("Linux", "64bit")
        return ("Linux", "32bit")
    if system == "Darwin":
        return ("Darwin", "64bit")
    return None


def get_plugins_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent / "plugins"
    return REPO_ROOT / "plugins"


def _migrate_dir_files(src: Path, dest: Path) -> None:
    """Move every file from src/ into dest/, then remove src/ if empty."""
    dest.mkdir(parents=True, exist_ok=True)
    for entry in src.iterdir():
        if entry.is_file():
            target = dest / entry.name
            if not target.exists():
                shutil.move(str(entry), str(target))
    try:
        src.rmdir()
    except OSError:
        pass  # not empty — leave it


def migrate_legacy_ffmpeg_dir() -> None:
    """Migrate old binary layouts to current plugins/ root layout.

    v1: <root>/ffmpeg/           → plugins/ffmpeg/  (very old)
    v2: plugins/ffmpeg/          → plugins/          (current)
    """
    plugins_dir = get_plugins_dir()
    if getattr(sys, "frozen", False):
        base = Path(sys.executable).resolve().parent
    else:
        base = REPO_ROOT

    # v1 → v2: root-level ffmpeg/ folder
    v1_src = base / "ffmpeg"
    v1_dest = plugins_dir / "ffmpeg"
    if v1_src.is_dir() and not v1_dest.exists():
        try:
            v1_dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(v1_src), str(v1_dest))
            logger.info("Migrated v1 plugin dir %s -> %s", v1_src, v1_dest)
        except OSError as exc:
            logger.warning("Could not migrate v1 plugin dir: %s", exc)

    # v2 → current: plugins/ffmpeg/ → plugins/
    v2_src = plugins_dir / "ffmpeg"
    if v2_src.is_dir():
        try:
            _migrate_dir_files(v2_src, plugins_dir)
            logger.info("Migrated v2 plugin dir %s -> %s", v2_src, plugins_dir)
        except OSError as exc:
            logger.warning("Could not migrate v2 plugin dir: %s", exc)


def get_plugin_dir(plugin_id: str) -> Path:
    plugin = REGISTERED_PLUGINS.get(plugin_id)
    if plugin is None:
        return get_plugins_dir() / plugin_id
    return plugin.resolve_dir()


def get_plugin_executable(plugin_id: str, executable_key: str) -> Optional[Path]:
    plugin = REGISTERED_PLUGINS.get(plugin_id)
    if plugin is None:
        return None

    spec = next((e for e in plugin.executables if e.key == executable_key), None)
    if spec is None:
        return None

    found = shutil.which(spec.filename())
    if found:
        return Path(found)

    candidate = get_plugin_dir(plugin_id) / spec.filename()
    if candidate.is_file():
        return candidate
    return None


def get_ffmpeg_dir() -> Path:
    return get_plugin_dir("ffmpeg")


def get_ffmpeg_path() -> Optional[Path]:
    return get_plugin_executable("ffmpeg", "ffmpeg")


def get_ffprobe_path() -> Optional[Path]:
    return get_plugin_executable("ffmpeg", "ffprobe")


def augment_path_env(
    plugin_ids: Optional[list[str]] = None,
    env: Optional[dict[str, str]] = None,
) -> dict[str, str]:
    """Prepend plugin binary directories to PATH for subprocess calls."""
    merged = dict(env if env is not None else os.environ)
    ids = plugin_ids if plugin_ids is not None else list(REGISTERED_PLUGINS)
    prefix_parts: list[str] = []
    for plugin_id in ids:
        plugin_dir = get_plugin_dir(plugin_id)
        if plugin_dir.is_dir():
            prefix_parts.append(str(plugin_dir))
    if not prefix_parts:
        return merged
    current = merged.get("PATH", "")
    prefix = os.pathsep.join(prefix_parts)
    merged["PATH"] = f"{prefix}{os.pathsep}{current}" if current else prefix
    return merged


def download_file(url: str, dest_path: Path) -> bool:
    try:
        logger.info("Downloading %s -> %s", url, dest_path)
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, dest_path)
        logger.info("Downloaded %s", dest_path.name)
        return True
    except urllib.error.URLError as exc:
        logger.error("Download failed %s: %s", url, exc)
        return False
    except OSError as exc:
        logger.error("Unexpected download error %s: %s", url, exc)
        return False


def extract_zip(zip_path: Path, extract_dir: Path) -> bool:
    try:
        logger.info("Extracting %s -> %s", zip_path.name, extract_dir)
        extract_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zip_path, "r") as archive:
            archive.extractall(extract_dir)
        return True
    except zipfile.BadZipFile:
        logger.error("Invalid zip: %s", zip_path)
        return False
    except OSError as exc:
        logger.error("Extract failed %s: %s", zip_path, exc)
        return False


def _make_executable(path: Path) -> None:
    if sys.platform != "win32" and path.is_file():
        try:
            path.chmod(0o755)
        except OSError as exc:
            logger.warning("Could not chmod %s: %s", path, exc)


def _download_ffbinaries_executable(
    plugin: FfbinariesPlugin,
    executable: PluginExecutable,
    platform_key: str,
    dest_dir: Path,
    temp_dir: Path,
) -> bool:
    zip_name = f"{executable.key}-{plugin.version}-{platform_key}.zip"
    url = f"{plugin.base_url}/{zip_name}"
    zip_path = temp_dir / zip_name

    if not download_file(url, zip_path):
        return False
    if not extract_zip(zip_path, dest_dir):
        return False

    target = dest_dir / executable.filename()
    _make_executable(target)

    try:
        zip_path.unlink(missing_ok=True)
    except OSError as exc:
        logger.warning("Could not remove temp zip %s: %s", zip_path, exc)
    return target.is_file()


def _all_present(plugin: FfbinariesPlugin) -> bool:
    dest = plugin.resolve_dir()
    return all((dest / exe.filename()).is_file() for exe in plugin.executables)


def download_ffbinaries_plugin(plugin: FfbinariesPlugin) -> bool:
    platform_info = get_platform_info()
    if not platform_info:
        logger.warning("Unsupported platform: %s", platform.system())
        return False

    system, arch = platform_info
    platform_key = PLATFORM_MAP.get(system, {}).get(arch)
    if not platform_key:
        logger.warning("Unsupported architecture: %s %s", system, arch)
        return False

    if _all_present(plugin):
        logger.info("Plugin %s already present at %s", plugin.id, plugin.resolve_dir())
        return True

    dest_dir = plugin.resolve_dir()
    temp_dir = Path(tempfile.gettempdir()) / f"jos_toolkit_plugin_{plugin.id}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    results: dict[str, bool] = {
        exe.key: True
        for exe in plugin.executables
        if (dest_dir / exe.filename()).is_file()
    }
    pending = [
        exe
        for exe in plugin.executables
        if not results.get(exe.key, False)
    ]
    if pending:
        executor = get_plugin_download_executor()
        futures: dict[Future[bool], str] = {
            executor.submit(
                _download_ffbinaries_executable,
                plugin,
                executable,
                platform_key,
                dest_dir,
                temp_dir,
            ): executable.key
            for executable in pending
        }
        for future in as_completed(futures):
            key = futures[future]
            try:
                results[key] = future.result()
            except Exception:
                logger.exception(
                    "Plugin %s executable %s download error",
                    plugin.id,
                    key,
                )
                results[key] = False

    ok = all(results.get(key, False) for key in plugin.required_keys)
    if ok:
        logger.info("Plugin %s ready at %s", plugin.id, dest_dir)
    else:
        logger.error("Plugin %s incomplete: %s", plugin.id, results)
    return ok


def download_plugin(plugin_id: str) -> bool:
    plugin = REGISTERED_PLUGINS.get(plugin_id)
    if plugin is None:
        logger.error("Unknown plugin: %s", plugin_id)
        return False
    return download_ffbinaries_plugin(plugin)


def _collect_plugin_download_results(
    futures: list[Future[bool]],
) -> bool:
    outcomes: list[bool] = []
    for future in as_completed(futures):
        try:
            outcomes.append(future.result())
        except Exception:
            logger.exception("Plugin download task failed")
            outcomes.append(False)
    return all(outcomes)


def download_plugins(plugin_ids: Optional[list[str]] = None) -> bool:
    """Download plugins in parallel on the plugin thread pool (blocks caller thread)."""
    ids = plugin_ids if plugin_ids is not None else list(REGISTERED_PLUGINS)
    executor = get_plugin_download_executor()
    futures = [executor.submit(download_plugin, plugin_id) for plugin_id in ids]
    return _collect_plugin_download_results(futures)


def _run_startup_plugin_downloads(plugin_ids: list[str]) -> None:
    migrate_legacy_ffmpeg_dir()
    logger.info("Background plugin download started: %s", ", ".join(plugin_ids))
    success = download_plugins(plugin_ids)
    if not success:
        logger.warning(
            "Some plugins failed to download; check PATH or retry on next launch"
        )


def get_plugin_status(plugin_id: str) -> dict[str, str | bool]:
    plugin = REGISTERED_PLUGINS.get(plugin_id)
    if plugin is None:
        return {"ready": False, "plugin_id": plugin_id, "storage_dir": ""}

    paths = {
        exe.key: get_plugin_executable(plugin_id, exe.key) for exe in plugin.executables
    }
    ready = all(
        paths.get(key) is not None for key in plugin.required_keys
    )
    payload: dict[str, str | bool] = {
        "ready": ready,
        "plugin_id": plugin_id,
        "storage_dir": str(get_plugin_dir(plugin_id)),
    }
    for key, path in paths.items():
        payload[f"{key}_path"] = str(path) if path else ""
    return payload


def get_ffmpeg_status() -> dict[str, str | bool]:
    status = get_plugin_status("ffmpeg")
    return {
        "ready": status.get("ready", False),
        "ffmpeg_path": str(status.get("ffmpeg_path", "")),
        "ffprobe_path": str(status.get("ffprobe_path", "")),
        "storage_dir": str(status.get("storage_dir", "")),
    }


def download_plugins_in_background(
    plugin_ids: Optional[list[str]] = None,
) -> None:
    """Schedule plugin downloads on the thread pool without blocking the main thread."""
    ids = list(plugin_ids if plugin_ids is not None else DEFAULT_STARTUP_PLUGINS)
    executor = get_plugin_download_executor()

    def _run() -> None:
        try:
            _run_startup_plugin_downloads(ids)
        except Exception:
            logger.exception("Background plugin download error")

    executor.submit(_run)


def download_ffmpeg_in_background() -> None:
    """Backward-compatible alias for startup hook."""
    download_plugins_in_background(["ffmpeg"])


def download_ffmpeg_binaries() -> bool:
    return download_plugin("ffmpeg")


def ensure_ffprobe_available() -> bool:
    if get_ffprobe_path():
        return True
    logger.info("ffprobe not found; downloading plugin ffmpeg synchronously…")
    return download_plugin("ffmpeg")


def register_ffbinaries_plugin(plugin: FfbinariesPlugin) -> None:
    """Register an additional ffbinaries-style plugin at runtime."""
    REGISTERED_PLUGINS[plugin.id] = plugin

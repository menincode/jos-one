"""pywebview desktop host entry point."""

from __future__ import annotations

import logging
import os

# Reduce pywebview console noise (bridge walk errors still logged at ERROR).
os.environ.setdefault("PYWEBVIEW_LOG", "warning")

from python.logging_config import setup_logging

import webview

from python.api.js_api import JsApi
from python.bridge.window_bridge import WindowBridge
from python.config import (
    APP_TITLE,
    WINDOW_HEIGHT,
    WINDOW_WIDTH,
    get_app_env,
    is_development,
    resolve_app_icon,
    resolve_url,
    webview_debug,
    window_start_maximized,
)
from python.db.settings_repository import init_database
from python.services.app_shutdown import register_app_shutdown_hooks, shutdown_ffmpeg_workers
from python.services.plugin_downloader import download_plugins_in_background

logger = logging.getLogger(__name__)


def main() -> None:
    setup_logging(debug=is_development())
    logger.info("Starting %s (env=%s)", APP_TITLE, get_app_env())

    init_database()
    download_plugins_in_background()
    register_app_shutdown_hooks()

    url = resolve_url()
    api = JsApi()

    window = webview.create_window(
        APP_TITLE,
        url=url,
        js_api=api,
        width=WINDOW_WIDTH,
        height=WINDOW_HEIGHT,
        maximized=window_start_maximized(),
    )

    def on_loaded() -> None:
        # After DOM/bridge init — avoids introspecting window.native too early on Windows.
        api._set_bridge(WindowBridge(window))
        logger.debug("Window bridge ready")

    window.events.loaded += on_loaded
    window.events.closing += lambda: shutdown_ffmpeg_workers()
    debug_port = os.getenv("WEBVIEW2_DEBUG_PORT", "").strip()
    if debug_port.isdigit():
        webview.settings["REMOTE_DEBUGGING_PORT"] = int(debug_port)
        logger.info("WebView2 remote debugging on port %s", debug_port)
    app_icon = resolve_app_icon()
    if app_icon:
        logger.debug("Window icon: %s", app_icon)
    else:
        logger.warning("App icon .ico not found; using default Python/exe icon")
    logger.debug("Launching webview (url=%s)", url)
    webview.start(debug=webview_debug(), icon=app_icon)
    shutdown_ffmpeg_workers()
    logger.info("Application exited")


if __name__ == "__main__":
    main()

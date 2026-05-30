"""Base class for pywebview js_api with validation and safe errors."""

from __future__ import annotations

import traceback
from typing import TYPE_CHECKING, Any

from python.bridge.serialization import to_bridge_value

if TYPE_CHECKING:
    from python.bridge.window_bridge import WindowBridge


class JsApiBase:
    """Base for methods exposed as pywebview.api.* from JavaScript."""

    _serializable = True

    def __init__(self) -> None:
        self._bridge: WindowBridge | None = None

    def _set_bridge(self, bridge: WindowBridge) -> None:
        """Bind after window.events.loaded — do not expose to JS (no set_ prefix skip)."""
        self._bridge = bridge

    def _safe_return(self, value: Any) -> Any:
        return to_bridge_value(value)

    def _safe_error(self, exc: BaseException) -> dict[str, str]:
        return {
            "error": str(exc),
            "type": type(exc).__name__,
            "traceback": traceback.format_exc(),
        }

    def _wrap(self, fn, *args, **kwargs):
        try:
            result = fn(*args, **kwargs)
            return self._safe_return(result)
        except Exception as exc:  # noqa: BLE001 — bridge must return JSON-safe errors
            return self._safe_error(exc)

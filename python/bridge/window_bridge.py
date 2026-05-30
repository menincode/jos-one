"""Window-level bridge helpers: evaluate_js, expose, shared state."""

from __future__ import annotations

from typing import Any, Callable

from python.bridge.serialization import to_bridge_value


class WindowBridge:
    """Wraps pywebview Window for controlled JS interop."""

    # Prevent pywebview inject_pywebview from walking .window → .native (WinForms
    # AccessibilityObject.Empty recursion on Windows). See pywebview util.get_functions.
    _serializable = False

    def __init__(self, window: Any | None = None) -> None:
        self._window = window

    def bind_window(self, window: Any) -> None:
        self._window = window

    @property
    def window(self) -> Any:
        if self._window is None:
            raise RuntimeError("WindowBridge: window not bound")
        return self._window

    def evaluate_js(self, code: str, callback: Callable[..., Any] | None = None) -> Any:
        return self.window.evaluate_js(code, callback)

    def run_js(self, code: str) -> None:
        self.window.run_js(code)

    def expose(self, func: Callable[..., Any]) -> None:
        self.window.expose(func)

    def set_state(self, key: str, value: Any) -> None:
        safe = to_bridge_value(value)
        setattr(self.window.state, key, safe)

    def get_state(self, key: str, default: Any = None) -> Any:
        return getattr(self.window.state, key, default)

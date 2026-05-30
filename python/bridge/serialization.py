"""JSON-safe serialization for bridge return values."""

from __future__ import annotations

from typing import Any


def to_bridge_value(value: Any) -> Any:
    """Convert a value to a JSON-serializable structure for JS."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): to_bridge_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_bridge_value(item) for item in value]
    raise TypeError(
        f"Bridge return type not JSON-serializable: {type(value).__name__}"
    )

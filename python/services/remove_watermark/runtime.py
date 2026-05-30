"""Shared RemoveWatermarkService instance for JsApi."""

from __future__ import annotations

from python.services.remove_watermark.service import RemoveWatermarkService

_service: RemoveWatermarkService | None = None


def get_remove_watermark_service() -> RemoveWatermarkService:
    global _service
    if _service is None:
        _service = RemoveWatermarkService()
    return _service

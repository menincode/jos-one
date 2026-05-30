"""Tests for JsApi and bridge serialization."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from python.api.js_api import JsApi
from python.bridge.serialization import to_bridge_value
from python.bridge.window_bridge import WindowBridge


class TestSerialization:
    def test_primitives(self) -> None:
        assert to_bridge_value("x") == "x"
        assert to_bridge_value(1) == 1
        assert to_bridge_value(None) is None

    def test_nested(self) -> None:
        assert to_bridge_value({"a": [1, 2]}) == {"a": [1, 2]}

    def test_rejects_custom_class(self) -> None:
        class Foo:
            pass

        with pytest.raises(TypeError):
            to_bridge_value(Foo())


class TestBridgeIntrospection:
    """Regression: public bridge/window must not be walked by pywebview get_functions."""

    def test_window_bridge_marked_not_serializable(self) -> None:
        assert getattr(WindowBridge, "_serializable", True) is False

    def test_js_api_has_no_public_bridge_accessor(self) -> None:
        api = JsApi()
        assert "bridge" not in dir(api)
        assert "set_bridge" not in dir(api)


class TestJsApi:
    def test_ping_ok(self) -> None:
        api = JsApi()
        result = api.ping("world")
        assert result == {"message": "pong, world!"}

    def test_ping_empty_rejected(self) -> None:
        api = JsApi()
        with pytest.raises(ValueError):
            api.ping("   ")

    def test_get_app_info(self) -> None:
        api = JsApi()
        info = api.get_app_info()
        assert "bridge_api_version" in info
        assert "title" in info

    def test_login_delegates_to_service(self) -> None:
        api = JsApi()
        user_row = {
            "id": 2,
            "username": "alice",
            "role": None,
            "status": True,
            "notes": None,
            "created_at": "2026-02-01T00:00:00Z",
        }
        with patch(
            "python.api.js_api.sign_in_with_username",
            return_value=user_row,
        ) as sign_in:
            result = api.login("alice", "secret")

        sign_in.assert_called_once_with("alice", "secret")
        assert result == user_row

    def test_login_returns_failure_envelope_without_raising(self) -> None:
        api = JsApi()
        with patch(
            "python.api.js_api.sign_in_with_username",
            side_effect=ValueError("Username or password is incorrect."),
        ):
            result = api.login("test", "wrong")

        assert result == {"ok": False, "message": "Username or password is incorrect."}

    def test_start_video_merge_job_accepts_folder_videos_cache(self) -> None:
        """Regression: FE passes folder_videos as 5th bridge arg after metadata cache."""
        api = JsApi()
        cached = [{"file_name": "clip.mp4", "duration_sec": 12.0}]
        with patch(
            "python.api.js_api.start_video_merge_job",
            return_value={"ok": True, "message": ""},
        ) as start_job:
            result = api.start_video_merge_job(
                "/in",
                "/out",
                [{"id": "1", "name": "mix"}],
                {"codec": "h264"},
                cached,
            )

        start_job.assert_called_once_with(
            "/in",
            "/out",
            [{"id": "1", "name": "mix"}],
            {"codec": "h264"},
            cached,
        )
        assert result == {"ok": True, "message": ""}

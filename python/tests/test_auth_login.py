"""Tests for auth login service."""

from __future__ import annotations

import json
from io import BytesIO
from unittest.mock import patch

import pytest

from python.services.auth_login import sign_in_with_username


def _mock_response(status: int, body: dict | str) -> BytesIO:
    payload = json.dumps(body).encode("utf-8") if isinstance(body, dict) else body.encode("utf-8")

    class FakeResponse:
        def __init__(self) -> None:
            self.status = status

        def read(self) -> bytes:
            return payload

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

    return FakeResponse()  # type: ignore[return-value]


class TestSignInWithUsername:
    def test_maps_successful_user_payload(self) -> None:
        body = {
            "status": "success",
            "user": {
                "id": 1,
                "username": "test",
                "role": "admin",
                "status": True,
                "notes": None,
                "created_at": "2026-01-01T00:00:00Z",
                "scopes": ["video_editor:write", "remove_watermark:write"],
            },
        }

        with patch(
            "python.services.auth_login.urllib.request.urlopen",
            return_value=_mock_response(200, body),
        ):
            user = sign_in_with_username("test", "123456")

        assert user == {
            "id": 1,
            "username": "test",
            "role": "admin",
            "status": True,
            "notes": None,
            "created_at": "2026-01-01T00:00:00Z",
            "scopes": ["video_editor:write", "remove_watermark:write"],
        }

    def test_surfaces_api_error_messages(self) -> None:
        body = {
            "statusCode": 401,
            "status": "error",
            "message": "invalid credentials",
        }

        with patch(
            "python.services.auth_login.urllib.request.urlopen",
            return_value=_mock_response(200, body),
        ):
            with pytest.raises(ValueError, match="Username or password is incorrect"):
                sign_in_with_username("test", "wrong")

    def test_rejects_empty_credentials(self) -> None:
        with pytest.raises(ValueError, match="Enter username and password"):
            sign_in_with_username("  ", "x")

    def test_decrypts_google_apps_script_payload(self) -> None:
        plain = json.dumps(
            {
                "id": 2,
                "username": "gas-user",
                "role": "Content",
                "scopes": ["video_editor:write"],
            }
        )
        hex_parts = [f"{ord(char):x}" for char in plain]
        encoded = __import__("base64").b64encode("-".join(hex_parts).encode("ascii")).decode(
            "ascii"
        )
        body = {"statusCode": 200, "status": "success", "data": encoded}

        with patch(
            "python.services.auth_login.urllib.request.urlopen",
            return_value=_mock_response(200, body),
        ):
            user = sign_in_with_username("gas-user", "secret")

        assert user["username"] == "gas-user"
        assert user["role"] == "Content"
        assert user["scopes"] == ["video_editor:write"]

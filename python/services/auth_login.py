"""Authenticate via external auth API (Google Apps Script JSON POST)."""

from __future__ import annotations

import base64
import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any

from python.config import auth_api_config_error, get_auth_api_url

logger = logging.getLogger(__name__)

def _decrypt_data_payload(encoded: str) -> str:
    """Reverse Google Apps Script `encryptDataPayload` in `google_apps_script/route.js`."""
    trimmed = encoded.strip()
    if not trimmed:
        return ""

    try:
        decoded = base64.b64decode(trimmed).decode("ascii")
        chars: list[str] = []
        for part in decoded.split("-"):
            if not part:
                continue
            chars.append(chr(int(part, 16)))
        return "".join(chars)
    except (ValueError, UnicodeDecodeError):
        return trimmed


def _maybe_decrypt_payload(value: Any) -> dict[str, Any] | None:
    if _is_record(value):
        return value
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        plain = _decrypt_data_payload(value)
        parsed = json.loads(plain)
    except (json.JSONDecodeError, TypeError, ValueError):
        return None
    return parsed if _is_record(parsed) else None


def _parse_scopes(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    text = str(raw).strip()
    if not text:
        return []
    return [part.strip() for part in re.split(r"[,;\s]+", text) if part.strip()]

def _format_login_api_message(message: str) -> str:
    if re.search(
        r"incorrect|invalid|wrong|not found|không đúng|sai mật khẩu",
        message,
        re.IGNORECASE,
    ):
        return "Username or password is incorrect."
    if re.search(r"disabled|inactive|vô hiệu", message, re.IGNORECASE):
        return "This account is disabled."
    return message or "Sign in failed."


def _format_login_error(exc: BaseException) -> str:
    if isinstance(exc, ValueError):
        return str(exc)
    return str(exc) or "Sign in failed. Try again."


def _is_record(value: Any) -> bool:
    return isinstance(value, dict)


def _is_api_error_envelope(data: dict[str, Any]) -> bool:
    if data.get("status") == "error":
        return True
    status_code = data.get("statusCode")
    return isinstance(status_code, int) and status_code >= 400


def _extract_user_payload(data: dict[str, Any]) -> dict[str, Any] | None:
    if _is_api_error_envelope(data):
        return None

    nested = data.get("user") or data.get("data") or data.get("result")
    decrypted = _maybe_decrypt_payload(nested)
    if decrypted:
        return decrypted

    if _is_record(nested):
        return nested

    if data.get("username") is not None or data.get("id") is not None:
        return data

    if (
        data.get("success") is True
        or data.get("status") == "success"
        or data.get("statusCode") == 200
    ):
        return {"username": str(data.get("username") or "")}

    return None


def _map_row(row: dict[str, Any], fallback_username: str) -> dict[str, Any]:
    raw_username = str(row.get("username") or "").strip()
    username = raw_username or fallback_username
    raw_role = str(row.get("role") or "").strip()
    created_at = row.get("created_at")
    return {
        "id": int(row["id"]) if row.get("id") is not None else 0,
        "username": username,
        "role": raw_role or None,
        "status": True if row.get("status") is None else bool(row["status"]),
        "notes": None if row.get("notes") is None else str(row["notes"]),
        "created_at": (
            str(created_at) if created_at is not None else ""
        ) or _default_created_at(),
        "scopes": _parse_scopes(row.get("scopes")),
    }


def _default_created_at() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


def _parse_login_response(data: Any, username: str) -> dict[str, Any]:
    if not _is_record(data):
        raise ValueError("Invalid response from auth API.")

    if _is_api_error_envelope(data):
        message = data.get("message")
        msg = message if isinstance(message, str) else "Sign in failed."
        raise ValueError(_format_login_api_message(msg))

    row = _extract_user_payload(data)
    if not row:
        raise ValueError("Sign in failed. Unexpected response from auth API.")

    return _map_row(row, username)


def _post_login(username: str, password: str) -> tuple[int, str]:
    url = get_auth_api_url()
    body = json.dumps({"username": username, "password": password}).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8") if exc.fp else ""
        return exc.code, payload


def sign_in_with_username(username: str, password: str) -> dict[str, Any]:
    """Return normalized user dict for the JS bridge."""
    trimmed = username.strip()
    if not trimmed or not password:
        raise ValueError("Enter username and password.")

    config_err = auth_api_config_error()
    if config_err:
        raise ValueError(config_err)

    logger.info("Sign-in attempt: username=%s", trimmed)
    try:
        status, text = _post_login(trimmed, password)
        try:
            data: Any = json.loads(text) if text else None
        except json.JSONDecodeError as exc:
            if 200 <= status < 300:
                raise ValueError("Invalid response from auth API.") from exc
            raise ValueError(f"Sign in failed ({status}).") from exc

        if _is_record(data) and _is_api_error_envelope(data):
            message = data.get("message")
            msg = (
                message
                if isinstance(message, str)
                else f"Sign in failed ({status})."
            )
            raise ValueError(_format_login_api_message(msg))

        if status < 200 or status >= 300:
            raise ValueError(f"Sign in failed ({status}).")

        user = _parse_login_response(data, trimmed)
        logger.info("Sign-in success: username=%s role=%s", trimmed, user.get("role"))
        return user
    except ValueError as exc:
        logger.warning("Sign-in failed: username=%s reason=%s", trimmed, exc)
        raise
    except Exception as exc:  # noqa: BLE001 — surface as login failure
        logger.warning("Sign-in error: username=%s error=%s", trimmed, exc)
        raise ValueError(_format_login_error(exc)) from exc

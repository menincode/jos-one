"""Persist login and video-merge preferences in SQLite."""

from __future__ import annotations

import json
import logging
from typing import Any

from cryptography.fernet import Fernet, InvalidToken

from python.config import get_app_data_dir
from python.db import delete_setting, get_setting, set_setting
logger = logging.getLogger(__name__)


def _normalize_scene_transition(value: str) -> str:
    clean = value.strip().lower()
    if clean in ("fade", "none", "wipe", "slide", "dissolve"):
        return clean
    return "fade"

KEY_LOGIN_REMEMBER = "login.remember_account"
KEY_LOGIN_USERNAME = "login.username"
KEY_LOGIN_PASSWORD = "login.password_enc"

KEY_VIDEO_INPUT = "video_merge.input_folder"
KEY_VIDEO_OUTPUT = "video_merge.output_folder"
KEY_VIDEO_EXPORT = "video_merge.export_settings"
KEY_VIDEO_MIX_ROWS = "video_merge.mix_rows"

KEY_WATERMARK_INPUT = "remove_watermark.input_folder"
KEY_WATERMARK_OUTPUT = "remove_watermark.output_folder"
KEY_WATERMARK_THREADS = "remove_watermark.thread_count"

DEFAULT_VIDEO_EXPORT: dict[str, str] = {
    "format": "mp4",
    "resolution": "1920x1080",
    "fps": "30",
    "durationMinSec": "3600",
    "durationMaxSec": "5400",
    "zoomMin": "1",
    "zoomMax": "1.2",
    "speedMin": "0.9",
    "speedMax": "1.1",
    "concurrency": "4",
    "logoPath": "",
    "logoPosition": "bottom_right",
    "sceneTransition": "fade",
    "transitionDurationMinSec": "0.4",
    "transitionDurationMaxSec": "0.8",
}

_EXPORT_STRING_KEYS = frozenset(DEFAULT_VIDEO_EXPORT.keys())


def _fernet_key_path() -> Any:
    return get_app_data_dir() / ".fernet.key"


def _get_fernet() -> Fernet:
    path = _fernet_key_path()
    if path.is_file():
        return Fernet(path.read_bytes())
    key = Fernet.generate_key()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(key)
    return Fernet(key)


def _encrypt_secret(plain: str) -> str:
    if not plain:
        return ""
    return _get_fernet().encrypt(plain.encode("utf-8")).decode("ascii")


def _decrypt_secret(token: str) -> str:
    if not token:
        return ""
    try:
        return _get_fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken:
        logger.warning("Could not decrypt saved password; clearing stored secret")
        return ""


def _parse_bool(raw: str) -> bool:
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _normalize_export_settings(raw: dict[str, Any]) -> dict[str, str]:
    merged = dict(DEFAULT_VIDEO_EXPORT)
    for key in _EXPORT_STRING_KEYS:
        value = raw.get(key)
        if isinstance(value, str):
            merged[key] = value
        elif value is not None:
            merged[key] = str(value)
    merged["sceneTransition"] = _normalize_scene_transition(
        str(merged.get("sceneTransition", "fade"))
    )
    return merged


def get_login_settings() -> dict[str, str | bool]:
    remember = _parse_bool(get_setting(KEY_LOGIN_REMEMBER, "0"))
    username = get_setting(KEY_LOGIN_USERNAME, "").strip()
    password = ""
    if remember:
        password = _decrypt_secret(get_setting(KEY_LOGIN_PASSWORD, ""))
    return {
        "remember_account": remember,
        "username": username,
        "password": password,
    }


def save_login_settings(
    remember_account: bool,
    username: str,
    password: str,
) -> dict[str, str | bool]:
    clean_user = username.strip()
    set_setting(KEY_LOGIN_REMEMBER, "1" if remember_account else "0")
    if remember_account and clean_user and password:
        set_setting(KEY_LOGIN_USERNAME, clean_user)
        set_setting(KEY_LOGIN_PASSWORD, _encrypt_secret(password))
    else:
        delete_setting(KEY_LOGIN_USERNAME)
        delete_setting(KEY_LOGIN_PASSWORD)
    return get_login_settings()


def _normalize_mix_rows(raw: Any) -> list[dict[str, str | list[str]]]:
    if not isinstance(raw, list):
        return []
    rows: list[dict[str, str | list[str]]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        row_id = str(item.get("id", "")).strip()
        leading_raw = item.get("leading_paths", [])
        if not row_id or not isinstance(leading_raw, list):
            continue
        leading_paths = [str(p).strip() for p in leading_raw if str(p).strip()]
        row: dict[str, str | list[str]] = {"id": row_id, "leading_paths": leading_paths}
        chaptime = item.get("chaptime")
        if isinstance(chaptime, str) and chaptime.strip():
            row["chaptime"] = chaptime.strip()
        rows.append(row)
    return rows


def get_video_merge_settings() -> dict[str, str | dict[str, str] | list]:
    export_raw = get_setting(KEY_VIDEO_EXPORT, "")
    export: dict[str, str] = dict(DEFAULT_VIDEO_EXPORT)
    if export_raw:
        try:
            parsed = json.loads(export_raw)
            if isinstance(parsed, dict):
                export = _normalize_export_settings(parsed)
        except json.JSONDecodeError:
            logger.warning("Invalid video_merge.export_settings JSON in database")
    mix_rows: list[dict[str, str | list[str]]] = []
    mix_raw = get_setting(KEY_VIDEO_MIX_ROWS, "")
    if mix_raw:
        try:
            parsed_mix = json.loads(mix_raw)
            mix_rows = _normalize_mix_rows(parsed_mix)
        except json.JSONDecodeError:
            logger.warning("Invalid video_merge.mix_rows JSON in database")
    return {
        "input_folder": get_setting(KEY_VIDEO_INPUT, ""),
        "output_folder": get_setting(KEY_VIDEO_OUTPUT, ""),
        "export_settings": export,
        "mix_rows": mix_rows,
    }


def _preserve_folder_path(incoming: str, existing: str) -> str:
    """Keep stored folder when a partial save sends an empty path (reload/HMR race)."""
    clean = incoming.strip()
    if clean:
        return clean
    return existing.strip()


def save_video_merge_settings(
    input_folder: str,
    output_folder: str,
    export_settings: dict[str, Any],
    mix_rows: list[Any] | None = None,
) -> dict[str, str | dict[str, str] | list]:
    existing = get_video_merge_settings()
    in_clean = _preserve_folder_path(
        input_folder,
        str(existing.get("input_folder", "")),
    )
    out_clean = _preserve_folder_path(
        output_folder,
        str(existing.get("output_folder", "")),
    )
    set_setting(KEY_VIDEO_INPUT, in_clean)
    set_setting(KEY_VIDEO_OUTPUT, out_clean)
    normalized = _normalize_export_settings(export_settings)
    set_setting(KEY_VIDEO_EXPORT, json.dumps(normalized, ensure_ascii=False))
    # When mix_rows is omitted (None), keep existing SQLite mix rows (config-only save).
    if mix_rows is not None:
        normalized_mix = _normalize_mix_rows(mix_rows)
        set_setting(
            KEY_VIDEO_MIX_ROWS,
            json.dumps(normalized_mix, ensure_ascii=False),
        )
    return get_video_merge_settings()


def get_remove_watermark_settings() -> dict[str, str | int]:
    raw_threads = get_setting(KEY_WATERMARK_THREADS, "4").strip()
    try:
        thread_count = max(1, min(32, int(raw_threads)))
    except ValueError:
        thread_count = 4
    return {
        "input_folder": get_setting(KEY_WATERMARK_INPUT, ""),
        "output_folder": get_setting(KEY_WATERMARK_OUTPUT, ""),
        "thread_count": thread_count,
    }


def save_remove_watermark_settings(
    input_folder: str,
    output_folder: str,
    thread_count: int,
) -> dict[str, str | int]:
    safe_threads = max(1, min(32, int(thread_count or 1)))
    set_setting(KEY_WATERMARK_INPUT, input_folder.strip())
    set_setting(KEY_WATERMARK_OUTPUT, output_folder.strip())
    set_setting(KEY_WATERMARK_THREADS, str(safe_threads))
    return get_remove_watermark_settings()

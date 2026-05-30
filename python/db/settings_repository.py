"""Key-value settings stored in SQLite."""

from __future__ import annotations

import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path

from python.config import get_database_path

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""

_lock = threading.Lock()
_connection: sqlite3.Connection | None = None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_database(db_path: Path | None = None) -> None:
    """Create schema if missing."""
    global _connection
    path = db_path if db_path is not None else get_database_path()
    with _lock:
        if _connection is None:
            _connection = _connect(path)
        _connection.executescript(_SCHEMA_SQL)
        _connection.commit()


def _get_connection() -> sqlite3.Connection:
    global _connection
    if _connection is None:
        init_database()
    assert _connection is not None
    return _connection


def get_setting(key: str, default: str = "") -> str:
    with _lock:
        row = _get_connection().execute(
            "SELECT value FROM app_settings WHERE key = ?",
            (key,),
        ).fetchone()
    if row is None:
        return default
    return str(row["value"])


def set_setting(key: str, value: str) -> None:
    with _lock:
        _get_connection().execute(
            """
            INSERT INTO app_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            (key, value, _utc_now_iso()),
        )
        _get_connection().commit()


def delete_setting(key: str) -> None:
    with _lock:
        _get_connection().execute(
            "DELETE FROM app_settings WHERE key = ?",
            (key,),
        )
        _get_connection().commit()


def get_all_settings(prefix: str = "") -> dict[str, str]:
    with _lock:
        if prefix:
            rows = _get_connection().execute(
                "SELECT key, value FROM app_settings WHERE key LIKE ?",
                (f"{prefix}%",),
            ).fetchall()
        else:
            rows = _get_connection().execute(
                "SELECT key, value FROM app_settings",
            ).fetchall()
    return {str(row["key"]): str(row["value"]) for row in rows}


def reset_connection_for_tests() -> None:
    """Close connection so the next call opens a fresh one (tests only)."""
    global _connection
    with _lock:
        if _connection is not None:
            _connection.close()
            _connection = None

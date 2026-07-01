"""Tests for SQLite-backed app settings."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from python.db.settings_repository import init_database, reset_connection_for_tests
from python.services import settings_service as svc


@pytest.fixture()
def temp_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    db_path = tmp_path / "test.db"
    key_path = tmp_path / ".fernet.key"
    monkeypatch.setenv("JOS_DB_PATH", str(db_path))
    monkeypatch.setattr(svc, "_fernet_key_path", lambda: key_path)
    reset_connection_for_tests()
    init_database(db_path)
    yield db_path
    reset_connection_for_tests()


def test_login_settings_round_trip(temp_db: Path) -> None:
    saved = svc.save_login_settings(True, "alice", "secret")
    assert saved["remember_account"] is True
    assert saved["username"] == "alice"
    assert saved["password"] == "secret"

    cleared = svc.save_login_settings(False, "alice", "secret")
    assert cleared["remember_account"] is False
    assert cleared["username"] == ""
    assert cleared["password"] == ""


def test_video_merge_settings_round_trip(temp_db: Path) -> None:
    export = {
        "format": "mkv",
        "resolution": "1080x1920",
        "fps": "24",
        "durationMinSec": "60",
        "durationMaxSec": "90",
        "concurrency": "4",
    }
    saved = svc.save_video_merge_settings(
        r"D:\in",
        r"D:\out",
        export,
    )
    assert saved["input_folder"] == r"D:\in"
    assert saved["output_folder"] == r"D:\out"
    assert saved["export_settings"]["format"] == "mkv"
    assert saved["export_settings"]["resolution"] == "1080x1920"

    loaded = svc.get_video_merge_settings()
    assert loaded["export_settings"]["fps"] == "24"


def test_video_merge_defaults_when_empty(temp_db: Path) -> None:
    loaded = svc.get_video_merge_settings()
    assert loaded["input_folder"] == ""
    assert loaded["export_settings"]["durationMinSec"] == "3600"
    assert json.loads(
        json.dumps(loaded["export_settings"])
    ) == svc.DEFAULT_VIDEO_EXPORT


def test_video_merge_persists_mix_rows_to_sqlite(temp_db: Path) -> None:
    rows = [{"id": "row-1", "leading_paths": [r"D:\in\a.mp4"]}]
    saved = svc.save_video_merge_settings(r"D:\in", r"D:\out", {}, mix_rows=rows)
    assert saved["mix_rows"] == rows
    loaded = svc.get_video_merge_settings()
    assert loaded["mix_rows"] == rows


def test_video_merge_config_save_preserves_mix_rows(temp_db: Path) -> None:
    rows = [{"id": "row-1", "leading_paths": [r"D:\in\a.mp4"]}]
    svc.save_video_merge_settings(r"D:\in", r"D:\out", {}, mix_rows=rows)
    saved = svc.save_video_merge_settings(r"D:\new_in", r"D:\new_out", {"format": "mp4"})
    assert saved["input_folder"] == r"D:\new_in"
    loaded = svc.get_video_merge_settings()
    assert loaded["mix_rows"] == rows


def test_video_merge_save_preserves_folders_when_incoming_empty(temp_db: Path) -> None:
    svc.save_video_merge_settings(r"D:\in", r"D:\out", {"format": "mp4"})
    saved = svc.save_video_merge_settings("", "", {"format": "mkv"}, mix_rows=[])
    assert saved["input_folder"] == r"D:\in"
    assert saved["output_folder"] == r"D:\out"
    assert saved["export_settings"]["format"] == "mkv"

    saved_partial = svc.save_video_merge_settings(r"D:\new_in", "", {"format": "mp4"})
    assert saved_partial["input_folder"] == r"D:\new_in"
    assert saved_partial["output_folder"] == r"D:\out"


def test_remove_watermark_settings_round_trip(temp_db: Path) -> None:
    saved = svc.save_remove_watermark_settings(
        r"D:\watermark\in",
        r"D:\watermark\out",
        8,
    )
    assert saved["input_folder"] == r"D:\watermark\in"
    assert saved["output_folder"] == r"D:\watermark\out"
    assert saved["thread_count"] == 8

    loaded = svc.get_remove_watermark_settings()
    assert loaded == saved


def test_remove_watermark_thread_count_clamped(temp_db: Path) -> None:
    saved = svc.save_remove_watermark_settings(r"D:\in", r"D:\out", 99)
    assert saved["thread_count"] == 32
    loaded = svc.get_remove_watermark_settings()
    assert loaded["thread_count"] == 32

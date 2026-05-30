"""SQLite persistence for desktop app settings."""

from python.db.settings_repository import (
    delete_setting,
    get_all_settings,
    get_setting,
    init_database,
    set_setting,
)

__all__ = [
    "delete_setting",
    "get_all_settings",
    "get_setting",
    "init_database",
    "set_setting",
]

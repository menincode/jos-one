"""Regression: packaged exe must load bundled frontend, not Vite dev server."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from python import config


def test_get_window_title_includes_version(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_TITLE", "JOS One")
    monkeypatch.setenv("APP_VERSION", "1.1.1")
    assert config.get_window_title() == "JOS One v1.1.1"


def test_packaged_defaults_to_production_when_app_env_unset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("APP_ENV", raising=False)
    with patch.object(config.sys, "frozen", True, create=True):
        assert config.get_app_env() == "production"
        assert not config.is_development()
        assert not config.webview_debug()


def test_packaged_resolve_url_uses_bundle_index_not_dev_server(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.delenv("APP_ENV", raising=False)
    dist = tmp_path / "frontend" / "dist"
    dist.mkdir(parents=True)
    index = dist / "index.html"
    index.write_text("<html></html>", encoding="utf-8")

    with patch.object(config.sys, "frozen", True, create=True):
        with patch.object(config.sys, "_MEIPASS", str(tmp_path), create=True):
            url = config.resolve_url()

    assert url.startswith("file:")
    assert url.endswith("/index.html") or url.endswith("\\index.html")
    assert "127.0.0.1" not in url
    assert "5173" not in url


def test_unpackaged_defaults_to_development_dev_server(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("APP_ENV", raising=False)
    with patch.object(config.sys, "frozen", False, create=True):
        assert config.get_app_env() == "development"
        assert config.resolve_url() == config.DEV_SERVER_URL


def test_app_env_override_still_works_when_packaged(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    with patch.object(config.sys, "frozen", True, create=True):
        assert config.get_app_env() == "development"
        assert config.resolve_url() == config.DEV_SERVER_URL

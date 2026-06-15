"""Tests for Google Sheet fetch helpers."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from python.services.video_merge.google_sheet import (
    build_google_sheet_export_url,
    fetch_google_sheet_rows,
    parse_google_sheet_gid,
    parse_google_sheet_id,
)


class TestParseGoogleSheetId:
    def test_extracts_id_from_edit_url(self) -> None:
        url = (
            "https://docs.google.com/spreadsheets/d/"
            "1XkvGrqXptuBelDIN3CHtoF0O5DIU2OlaCXGPtGPwPgA/edit?usp=sharing"
        )
        assert parse_google_sheet_id(url) == "1XkvGrqXptuBelDIN3CHtoF0O5DIU2OlaCXGPtGPwPgA"

    def test_rejects_non_sheet_url(self) -> None:
        assert parse_google_sheet_id("https://example.com/foo") is None


class TestParseGoogleSheetGid:
    def test_from_query(self) -> None:
        url = "https://docs.google.com/spreadsheets/d/abc/edit?gid=12345"
        assert parse_google_sheet_gid(url) == "12345"

    def test_from_fragment(self) -> None:
        url = "https://docs.google.com/spreadsheets/d/abc/edit#gid=99"
        assert parse_google_sheet_gid(url) == "99"


class TestBuildExportUrl:
    def test_without_gid(self) -> None:
        assert (
            build_google_sheet_export_url("abc123")
            == "https://docs.google.com/spreadsheets/d/abc123/export?format=csv"
        )

    def test_with_gid(self) -> None:
        url = build_google_sheet_export_url("abc123", "42")
        assert url.endswith("format=csv&gid=42")


class TestFetchGoogleSheetRows:
    def test_rejects_empty_url(self) -> None:
        result = fetch_google_sheet_rows("  ")
        assert result["ok"] is False
        assert "trống" in result["message"].lower()

    def test_rejects_invalid_url(self) -> None:
        result = fetch_google_sheet_rows("https://not-google.com/x")
        assert result["ok"] is False

    def test_parses_csv_response(self) -> None:
        csv_body = "Col A,Col B\n201,202\n205,207\n".encode("utf-8")
        mock_response = MagicMock()
        mock_response.read.return_value = csv_body
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        with patch(
            "python.services.video_merge.google_sheet.urllib.request.urlopen",
            return_value=mock_response,
        ):
            result = fetch_google_sheet_rows(
                "https://docs.google.com/spreadsheets/d/abc/edit"
            )

        assert result["ok"] is True
        assert result["rows"] == [
            ["Col A", "Col B"],
            ["201", "202"],
            ["205", "207"],
        ]

    def test_http_403_message(self) -> None:
        import urllib.error

        with patch(
            "python.services.video_merge.google_sheet.urllib.request.urlopen",
            side_effect=urllib.error.HTTPError(
                url="http://x",
                code=403,
                msg="Forbidden",
                hdrs=None,
                fp=None,
            ),
        ):
            result = fetch_google_sheet_rows(
                "https://docs.google.com/spreadsheets/d/abc/edit"
            )

        assert result["ok"] is False
        assert "Anyone with the link" in result["message"]

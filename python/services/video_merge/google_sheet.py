"""Fetch publicly accessible Google Sheets as CSV rows for mix import."""

from __future__ import annotations

import csv
import io
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

MAX_SHEET_BYTES = 2 * 1024 * 1024
FETCH_TIMEOUT_SEC = 30

SHEET_ID_RE = re.compile(
    r"https?://docs\.google\.com/spreadsheets/d/([a-zA-Z0-9-_]+)",
)


def parse_google_sheet_id(url: str) -> str | None:
    """Extract spreadsheet ID from a Google Sheets URL."""
    match = SHEET_ID_RE.search(url.strip())
    return match.group(1) if match else None


def parse_google_sheet_gid(url: str) -> str | None:
    """Extract tab ``gid`` from query string or URL fragment."""
    trimmed = url.strip()
    parsed = urllib.parse.urlparse(trimmed)
    query_gid = urllib.parse.parse_qs(parsed.query).get("gid")
    if query_gid and query_gid[0].strip():
        return query_gid[0].strip()
    fragment = parsed.fragment.strip()
    if fragment.startswith("gid="):
        return fragment[4:].split("&")[0].strip() or None
    return None


def build_google_sheet_export_url(spreadsheet_id: str, gid: str | None = None) -> str:
    base = (
        f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv"
    )
    if gid:
        return f"{base}&gid={urllib.parse.quote(gid, safe='')}"
    return base


def _parse_csv_rows(text: str) -> list[list[str]]:
    reader = csv.reader(io.StringIO(text))
    return [[cell.strip() for cell in row] for row in reader]


def fetch_google_sheet_rows(url: str) -> dict[str, Any]:
    """
    Download a public Google Sheet as CSV and return parsed rows.

    Returns ``{ ok, rows, message }`` where ``rows`` is a list of row lists.
  """
    if not isinstance(url, str) or not url.strip():
        return {
            "ok": False,
            "rows": [],
            "message": "URL Google Sheet trống.",
        }

    sheet_id = parse_google_sheet_id(url)
    if not sheet_id:
        return {
            "ok": False,
            "rows": [],
            "message": "URL không hợp lệ. Dán link Google Sheets (docs.google.com/spreadsheets/...).",
        }

    gid = parse_google_sheet_gid(url)
    export_url = build_google_sheet_export_url(sheet_id, gid)
    request = urllib.request.Request(
        export_url,
        headers={"User-Agent": "JOS-One/1.0"},
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT_SEC) as response:
            raw = response.read(MAX_SHEET_BYTES + 1)
    except urllib.error.HTTPError as exc:
        logger.warning("Google Sheet HTTP error %s for %s", exc.code, sheet_id)
        if exc.code in (401, 403):
            return {
                "ok": False,
                "rows": [],
                "message": "Không truy cập được sheet. Chia sẻ sheet ở chế độ “Anyone with the link can view”.",
            }
        return {
            "ok": False,
            "rows": [],
            "message": f"Không tải được sheet (HTTP {exc.code}).",
        }
    except urllib.error.URLError as exc:
        logger.warning("Google Sheet network error: %s", exc.reason)
        return {
            "ok": False,
            "rows": [],
            "message": "Không kết nối được Google Sheets. Kiểm tra mạng và thử lại.",
        }
    except TimeoutError:
        return {
            "ok": False,
            "rows": [],
            "message": "Tải sheet quá lâu. Thử lại sau.",
        }

    if len(raw) > MAX_SHEET_BYTES:
        return {
            "ok": False,
            "rows": [],
            "message": "Sheet quá lớn (tối đa 2 MB).",
        }

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1", errors="replace")

    rows = _parse_csv_rows(text)
    if not rows:
        return {
            "ok": False,
            "rows": [],
            "message": "Sheet trống.",
        }

    return {
        "ok": True,
        "rows": rows,
        "message": "",
    }

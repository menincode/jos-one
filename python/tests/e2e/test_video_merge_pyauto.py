"""Desktop E2E: PyAutoGUI window focus + Playwright CDP (WebView2 UI)."""

from __future__ import annotations

import os
import re
import time
from pathlib import Path

import pytest

pytestmark = [pytest.mark.e2e, pytest.mark.pyauto]

REPO_ROOT = Path(__file__).resolve().parents[3]


def _focus_app_window(title_fragment: str = "JOS One") -> None:
    import pygetwindow as gw

    deadline = time.monotonic() + 30.0
    while time.monotonic() < deadline:
        matches = [
            w
            for w in gw.getAllWindows()
            if title_fragment.lower() in (w.title or "").lower() and w.visible
        ]
        if matches:
            win = matches[0]
            try:
                win.activate()
            except Exception:
                pass
            time.sleep(0.5)
            return
        time.sleep(0.5)
    pytest.fail(f"No visible window title containing {title_fragment!r}")


def _playwright_page(desktop_stack: dict[str, object]):
    from playwright.sync_api import sync_playwright

    cdp_url = str(desktop_stack["cdp_url"])
    _focus_app_window()
    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(cdp_url)
        if not browser.contexts:
            pytest.fail("No browser context from WebView2 CDP")
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else context.new_page()
        page.set_default_timeout(60_000)
        yield page
        browser.close()


@pytest.fixture()
def app_page(desktop_stack: dict[str, object]):
    yield from _playwright_page(desktop_stack)


def test_pyauto_login_and_video_merge_start_cancel(
    desktop_stack: dict[str, object],
    app_page,
) -> None:
    import pyautogui

    pyautogui.FAILSAFE = True

    username = os.getenv("E2E_USERNAME", "test").strip()
    password = os.getenv("E2E_PASSWORD", "123456")
    input_dir = Path(
        os.getenv("E2E_INPUT_FOLDER", str(REPO_ROOT / "test" / "input_folder"))
    ).resolve()
    output_dir = Path(
        os.getenv("E2E_OUTPUT_FOLDER", str(REPO_ROOT / "test" / "output_pyauto_e2e"))
    ).resolve()
    assert input_dir.is_dir(), f"Missing E2E input folder: {input_dir}"
    output_dir.mkdir(parents=True, exist_ok=True)

    page = app_page
    page.bring_to_front()

    # Login (Google Apps Script — requires network).
    if page.locator('input[placeholder="Tên đăng nhập"]').count() > 0:
        page.locator('input[placeholder="Tên đăng nhập"]').fill(username)
        page.locator('input[placeholder="Mật khẩu"]').fill(password)
        page.get_by_role("button", name=re.compile(r"đăng nhập", re.I)).click()
        page.wait_for_url(re.compile(r"#/"), timeout=90_000)

    page.locator("#video-merge-input-folder").wait_for(state="visible", timeout=60_000)
    page.locator("#video-merge-input-folder").fill(str(input_dir))
    page.locator("#video-merge-output-folder").fill(str(output_dir))

    # Planner bounds (leading-only can exceed max when a single clip is long).
    page.locator("#export-duration-min").fill("10")
    page.locator("#export-duration-max").fill("3600")
    page.locator("#export-concurrency").fill("1")

    page.get_by_role("button", name="Refresh video").click()
    page.locator('input[type="checkbox"][aria-label^="Chọn"]').first.wait_for(
        state="visible",
        timeout=120_000,
    )

    # Wait until FFprobe durations are ready (no spinner on first row).
    page.wait_for_function(
        """() => {
          const spinners = document.querySelectorAll('[aria-label="Đang đo thời lượng"]');
          return spinners.length === 0;
        }""",
        timeout=180_000,
    )

    checkboxes = page.locator('input[type="checkbox"][aria-label^="Chọn"]')
    count = min(2, checkboxes.count())
    assert count >= 1, "Need at least one video in input folder"
    for i in range(count):
        checkboxes.nth(i).check()

    if page.get_by_role("button", name="Tạo mix mới").is_visible():
        mix_rows = page.locator("table tbody tr")
        if mix_rows.count() == 0:
            page.get_by_role("button", name="Tạo mix mới").click()

    page.get_by_role("button", name="Thêm vào mix đang chọn").click()
    page.wait_for_timeout(800)

    start_btn = page.get_by_role("button", name="Bắt đầu")
    try:
        start_btn.wait_for(state="visible", timeout=30_000)
        deadline = time.monotonic() + 90.0
        while time.monotonic() < deadline:
            if start_btn.is_enabled():
                break
            time.sleep(0.5)
        else:
            hint = start_btn.get_attribute("title")
            pytest.fail(f"Start merge still disabled after 90s. title={hint!r}")
    except Exception as exc:
        raise AssertionError(f"Start button not ready: {exc}") from exc
    start_btn.click()

    page.wait_for_function(
        """() => document.body.innerText.includes('Clip ') || document.body.innerText.includes('Đang')""",
        timeout=120_000,
    )

    page.get_by_role("button", name=re.compile(r"^Hủy")).click()
    page.wait_for_function(
        """() => document.body.innerText.toLowerCase().includes('hủy') || document.body.innerText.toLowerCase().includes('cancelled')""",
        timeout=120_000,
    )

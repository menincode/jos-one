"""Fixtures for desktop PyAuto / Playwright CDP E2E tests."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = REPO_ROOT / "scripts"
FRONTEND_DIR = REPO_ROOT / "frontend"
CDP_URL = os.getenv("WEBVIEW2_CDP_URL", "http://127.0.0.1:9222")


def _uv_run(*args: str, env: dict[str, str] | None = None) -> list[str]:
    merged = dict(os.environ)
    if env:
        merged.update(env)
    if shutil.which("uv"):
        return ["uv", "run", *args]
    uv_ps1 = SCRIPTS / "uv.ps1"
    if sys.platform == "win32" and uv_ps1.is_file():
        cmd = " ".join(args)
        return [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(uv_ps1),
            "run",
            cmd,
        ]
    return [sys.executable, "-m", *args]


def _yarn_frontend(*args: str) -> list[str]:
    yarn_ps1 = SCRIPTS / "yarn-frontend.ps1"
    if sys.platform == "win32" and yarn_ps1.is_file():
        return [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(yarn_ps1),
            *args,
        ]
    return ["yarn", "--cwd", str(FRONTEND_DIR), *args]


def _wait_port(port: int, timeout_sec: float = 90.0) -> None:
    import socket

    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1.0):
                return
        except OSError:
            time.sleep(0.5)
    raise RuntimeError(f"Port {port} not ready after {timeout_sec}s")


def _wait_cdp(timeout_sec: float = 90.0) -> None:
    import urllib.error
    import urllib.request

    deadline = time.monotonic() + timeout_sec
    url = CDP_URL.rstrip("/") + "/json/version"
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:  # noqa: S310
                if resp.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError, OSError):
            time.sleep(0.5)
    raise RuntimeError(f"CDP not ready at {CDP_URL}")


@pytest.fixture(scope="module")
def desktop_stack() -> dict[str, object]:
    if os.getenv("RUN_PYAUTO_E2E", "").strip().lower() not in (
        "1",
        "true",
        "yes",
        "on",
    ):
        pytest.skip("Set RUN_PYAUTO_E2E=1 to run desktop PyAuto E2E")

    if sys.platform != "win32":
        pytest.skip("Desktop PyAuto E2E is supported on Windows only for now")

    env = dict(os.environ)
    env["APP_ENV"] = "development"
    env["WEBVIEW2_DEBUG_PORT"] = os.getenv("WEBVIEW2_DEBUG_PORT", "9222")
    env["PYWEBVIEW_LOG"] = "error"

    vite_log = REPO_ROOT / "frontend-dev-e2e.log"
    if vite_log.is_file():
        vite_log.unlink()

    vite_cmd = " ".join(_yarn_frontend("dev")) + f" *> '{vite_log}'"
    vite_proc = subprocess.Popen(  # noqa: S603
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            vite_cmd,
        ],
        cwd=str(FRONTEND_DIR),
        env=env,
    )

    app_proc: subprocess.Popen[bytes] | None = None
    try:
        _wait_port(5173)
        app_proc = subprocess.Popen(  # noqa: S603
            _uv_run("python", "-m", "python.main"),
            cwd=str(REPO_ROOT),
            env=env,
        )
        _wait_cdp()
        time.sleep(2.0)
        yield {"vite_proc": vite_proc, "app_proc": app_proc, "cdp_url": CDP_URL}
    finally:
        for proc in (app_proc, vite_proc):
            if proc is None:
                continue
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    proc.kill()

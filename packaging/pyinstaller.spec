# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec — onefile desktop bundle with embedded frontend/dist."""

import os
import sys
from pathlib import Path

block_cipher = None
spec_dir = Path(SPECPATH)
repo_root = spec_dir.parent
frontend_dist = repo_root / "frontend" / "dist"
app_icon = repo_root / "packaging" / "assets" / "josvn-icon.ico"
app_name = os.environ.get("APP_NAME", "jos-one")
version_file = spec_dir / "file_version_info.txt"
app_manifest = spec_dir / "app.manifest"

if not frontend_dist.is_dir():
    raise SystemExit(
        f"frontend/dist not found at {frontend_dist}. Run: yarn --cwd frontend build"
    )

if not app_icon.is_file():
    raise SystemExit(
        f"App icon not found at {app_icon}. Run: make build-icon"
    )

datas = [
    (str(frontend_dist), os.path.join("frontend", "dist")),
    (str(app_icon), "assets"),
]

a = Analysis(
    [str(repo_root / "python" / "main.py")],
    pathex=[str(repo_root)],
    binaries=[],
    datas=datas,
    hiddenimports=["webview", "clr"],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name=app_name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    onefile=True,
    icon=str(app_icon),
    version=str(version_file) if sys.platform == "win32" and version_file.is_file() else None,
    manifest=str(app_manifest) if sys.platform == "win32" and app_manifest.is_file() else None,
)

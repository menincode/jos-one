# JOS One (pywebview + React)

Cross-platform desktop shell for **[JOSVN – Journey Of Steps](https://josvn.com/)**: **Python/pywebview** host, **React/Vite** UI, **Google Apps Script** auth API (username + password), **shadcn/ui v4** components.

Login branding uses official logo assets from [josvn.com](https://josvn.com/) (`frontend/public/brand/`).

The `.cursor/` folder remains the Cursor toolkit; the app lives in `frontend/` and `python/`.

## Prerequisites

| Tool | Purpose |
|------|---------|
| [uv](https://docs.astral.sh/uv/) | Python deps + `uv run` |
| [Yarn](https://yarnpkg.com/) | Frontend (never npm/pnpm for this app) |
| GNU Make | `make install`, `make dev`, `make start`, `make package` |
| Node.js 20+ | Vite / React build |
| WebView2 Runtime (Windows) | Required to run packaged or pywebview builds |
| UPX 4.x (optional) | `make package` — compresses `dist/jos-one.exe` |

### Install uv (Windows PowerShell)

```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Install Yarn

```powershell
npm install -g yarn
```

### Yarn not on PATH

If only Node/npm is installed (no global `yarn`), `make` uses `npm exec --yes yarn --` automatically. You can still install Yarn globally: `npm install -g yarn`.

### GNU Make on Windows

Git Bash includes `make`, or: `choco install make`

### `[pywebview] … AccessibilityObject.Bounds.Empty…` (Windows log noise)

Long `Empty.Empty.Empty…` lines are pywebview walking WinForms `window.native` while building the JS bridge. This repo avoids that by keeping `WindowBridge` off the exposed API (`_serializable = False`) and binding the bridge on `window.events.loaded`. Remaining lines are harmless; set `PYWEBVIEW_LOG=error` to suppress them.

## Quick start

```bash
# 1. Python environment
uv python pin 3.12
uv sync --group dev

# 2. Frontend
cp frontend/.env.example frontend/.env
# Optional: override VITE_AUTH_API_URL (see frontend/.env.example)

yarn --cwd frontend install

# 3. Run
make install    # uv sync + yarn install
make dev        # Vite + pywebview (HMR)
make start      # yarn build + production pywebview (loads frontend/dist)
make local      # Vite only in browser (mock pywebview bridge)
```

Windows without Make: `powershell -File scripts/dev.ps1` (same as `make dev`).

## Auth API

Login posts JSON `{ "username", "password" }` to the Google Apps Script endpoint. **Desktop (`make dev`, `make start`)** calls the API from **Python** (`pywebview.api.login`). Override the URL for the Python host:

```env
AUTH_API_URL=https://script.google.com/macros/s/.../exec
```

**Browser-only (`make local`)** still uses `VITE_AUTH_API_URL` in `frontend/.env` if set (see `frontend/.env.example`).

Use `test.http` at the repo root to exercise the endpoint from your editor.

## Make targets

| Target | Description |
|--------|-------------|
| `make install` | `uv sync --group dev` + `yarn --cwd frontend install` |
| `make local` | Vite dev server only (browser; mock bridge) |
| `make dev` | Vite + pywebview (`APP_ENV=development`) |
| `make start` | **Default** — build frontend + pywebview prod assets |
| `make prod` | Alias of `start` |
| `make build` | Alias of `make package` → `dist/jos-one.exe` |
| `make package` | JOS icon → PyInstaller onefile → UPX on `dist/jos-one.exe` |
| `make build-icon` | Regenerate `packaging/assets/josvn-icon.ico` from brand PNG |
| `make clean` | Remove `build/`, `dist/`, `frontend/dist` |

## Packaging (`make build` / `make package`)

1. `yarn --cwd frontend build` (bakes `VITE_*` into bundle).
2. `make build-icon` — multi-size `.ico` from `frontend/public/brand/josvn-icon.png`.
3. `uv run pyinstaller packaging/pyinstaller.spec` — **onefile**, embedded icon, `upx=False` in spec.
4. `upx --best dist/jos-one.exe` — **skipped automatically** if UPX is not on PATH; backup `.bak` created when compression runs.

Window title bar and taskbar use the same JOS icon via `webview.start(icon=...)` when running the packaged exe.

**Risks:** UPX may break the exe or trigger antivirus false positives; onefile cold-start is slower. Smoke-test on a clean Windows machine with WebView2 installed.

To force UPX: install [UPX](https://up.github.io/upx/) 4.x and add to PATH, or `make package UPX=C:\path\to\upx.exe`.

## Plugin executables (auto-download)

On startup (`make dev` / `make start`), Python downloads registered **plugins** on a **background thread pool** (does not block the pywebview main thread). The first plugin is **ffmpeg** (ffmpeg + ffprobe) from [ffbinaries prebuilt v4.4.1](https://github.com/ffbinaries/ffbinaries-prebuilt) — same pattern as `10_news_ai_tool`.

| Item | Location |
|------|----------|
| Plugin binaries | `plugins/<plugin-id>/` (e.g. `plugins/ffmpeg/` for ffmpeg + ffprobe) |
| Module | `python/services/plugin_downloader.py` |
| Bridge | `pywebview.api.get_ffmpeg_status()` |

System binaries on `PATH` are preferred. The `plugins/` folder is gitignored.

## Architecture

- **React**: UI, routing, Zustand; login UI calls `signIn` → pywebview bridge in desktop.
- **Python `js_api`**: `login` (auth HTTP), `ping`, `get_app_info`, `get_ffmpeg_status`, file dialog stub.
- **Bridge**: `frontend/src/lib/pywebview/*` — never call `window.pywebview.api` from pages directly.

## Implemented Features

### FFmpeg merge optimization — FR003 clip pool (DS005) — 2026-05-29

- **Plan**: `docs/04-plans/DS005/FR003-clip-pool.md`
- **Design**: `docs/03-design/DS005-ffmpeg-merge-optimization-mvp.md`
- **Status**: Completed (PR3 of 3 — DS005 sub-plans done)
- **Summary**: `render_mix_row` uses per-row `FfmpegTaskPool` (`concurrency` workers); docstrings corrected; Settings concurrency tooltip (~concurrency² FFmpeg processes)
- **Files modified**: `python/services/video_merge/pipeline.py`, `python/services/video_merge/ffmpeg_pool.py`, `python/tests/test_video_merge_pipeline.py`, `python/tests/test_ffmpeg_pool.py`, `frontend/src/features/video-merge/video-merge-config-cards.tsx`, `video-merge-export-settings.tsx`
- **Tests**: `uv run pytest python/tests/test_video_merge_pipeline.py python/tests/test_ffmpeg_pool.py python/tests/test_video_merge_job.py -q`

### FFmpeg merge optimization — FR002 preview path (DS005) — 2026-05-29

- **Plan**: `docs/04-plans/DS005/FR002-preview-path.md`
- **Design**: `docs/03-design/DS005-ffmpeg-merge-optimization-mvp.md`
- **Status**: Completed (PR2 of 3)
- **Summary**: `outputs[].path` absolute via `Path.resolve()`; preview gate requires `ok + path` (not `done` alone); multi-row incremental output test
- **Root cause addressed**: H1 relative path → `openMediaFile` fail; H5 preview enabled without valid output
- **Files modified**: `python/services/video_merge/job.py`, `python/tests/test_video_merge_job.py`, `frontend/src/features/video-merge/mix-output-path.ts`, `mix-output-path.test.ts`, `frontend/src/lib/pywebview/types.ts`
- **Tests**: `uv run pytest python/tests/test_video_merge_job.py -q` (7 passed); `yarn --cwd frontend test mix-output-path` (9 passed)

### FFmpeg merge optimization — FR001 logo at normalize (DS005) — 2026-05-29

- **Plan**: `docs/04-plans/DS005/FR001-logo-concat-copy.md`
- **Design**: `docs/03-design/DS005-ffmpeg-merge-optimization-mvp.md`
- **Status**: Completed (PR1 of 3)
- **Summary**: Logo overlay in `_render_segment` via `ExportRenderConfig`; `_concat_segments` always `-c copy` (no join re-encode)
- **Files modified**: `python/services/video_merge/pipeline.py`, `python/services/video_merge/job.py`, `python/tests/test_video_merge_pipeline.py`, `frontend/src/features/video-merge/mix-row-pipeline-phase.ts`, `mix-row-pipeline-phase.test.ts`
- **Tests**: `uv run pytest python/tests/test_video_merge_pipeline.py -q` (25 passed); `yarn --cwd frontend test mix-row-pipeline-phase`

### Video merge (DS004) — 2026-05-25

- **Plan**: `docs/04-plans/DS004/index.md` (FR001–FR003)
- **Design**: `docs/03-design/DS004-ffmpeg-python-video-merge.md`
- **Status**: Completed (unit + FFmpeg integration smoke; optional manual UI check via `make dev`)
- **Files created**:
  - `python/services/video_merge/io.py` — list/probe videos, export settings, dialogs
  - `python/services/video_merge/pipeline.py` — planner, per-clip render, concat join
  - `python/services/video_merge/job.py` — background job, cancel, `row_states`
  - `python/tests/test_video_merge_io.py`
  - `python/tests/test_video_merge_pipeline.py`
  - `python/tests/test_video_merge_job.py`
- **Files modified**: `python/api/js_api.py`, `python/services/settings_service.py`, `python/services/app_shutdown.py`, `python/tests/test_app_shutdown.py`
- **Tests**: 38 unit tests in `test_video_merge_*` + 3 integration tests in `test_video_merge_integration.py` (requires `plugins/ffmpeg.exe`; run `uv run pytest python/tests -q`)

## Tests

```bash
uv run pytest
yarn --cwd frontend test
```

## Project layout

```
frontend/     # Yarn + Vite + React + shadcn v4
python/       # pywebview host + bridge + js_api
packaging/    # PyInstaller spec, UPX exclude list
scripts/      # dev.ps1, dev.sh, wait-port.ps1
Makefile
pyproject.toml
uv.lock       # generated by uv lock
```

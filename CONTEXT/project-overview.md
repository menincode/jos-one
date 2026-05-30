# Project Overview — JOS One

**Product:** [JOSVN – Journey Of Steps](https://josvn.com/) desktop client (`jos-desktop`)  
**Repo:** `19_jos_toolkit`  
**Last researched:** 2026-05-29

## What this repo is

Cross-platform **desktop shell** (primary target: **Windows**) for JOSVN tooling:

| Layer | Stack |
|-------|--------|
| Native host | **Python 3.11+** + [pywebview](https://pywebview.flowrl.com/) 5.x |
| UI | **React 19** + **Vite 6** + **TypeScript** + **Tailwind CSS 4** + **shadcn/ui**-style components |
| State | **Zustand** (auth), local persistence + SQLite settings on Python side |
| Package managers | **uv** (Python), **Yarn 4** (frontend only — never npm/pnpm for frontend) |
| Build / run | **GNU Make** (`Makefile`), `scripts/dev.ps1` on Windows |
| Packaging | **PyInstaller** onefile → optional **UPX** → `dist/jos-one.exe` |

The `.cursor/` and `.agent/` trees are the **Cursor AI toolkit** for this repo; they are not the application runtime.

## What this repo is not

- Not a NestJS / PostgreSQL SaaS monorepo (no `apps/backend`, `packages/models`, Wails `desktop/` apps in this tree).
- Not a generic template — product code lives in `frontend/` and `python/`.

## Repository layout

```
frontend/           # Yarn + Vite + React UI
python/             # pywebview host, JsApi bridge, services, SQLite
packaging/          # PyInstaller spec, icon build
scripts/            # dev.ps1, dev.sh, yarn helpers
plugins/            # gitignored — ffmpeg/ffprobe downloaded at runtime
data/               # SQLite DB path (see python/config.py)
docs/               # RS*, DS*, FR* prefixed docs
CONTEXT/            # AI/contributor context (this folder)
.cursor/            # Cursor rules, commands, skills
Makefile
pyproject.toml
uv.lock
```

## Runtime modes (`APP_ENV`)

| `APP_ENV` | UI URL | Auth | Typical command |
|-----------|--------|------|-----------------|
| `development` / `dev` | Vite dev server `http://127.0.0.1:5173` | Python `pywebview.api.login` | `make dev` |
| `production` / `prod` | `frontend/dist` (file://) | Python bridge | `make start` |
| `local` | Vite only in browser | HTTP via `VITE_AUTH_API_URL` | `make local` |

## Main features (implemented)

1. **Login** — username/password → Google Apps Script endpoint (`AUTH_API_URL` / default in `python/config.py`).
2. **Video merge (Ghép Video)** — DS004: list/probe folders, FFmpeg pipeline, background job, UI on `/` (`VideoMergePage`).
3. **Settings** — login remember + video-merge workspace persisted via Python SQLite (`/settings`).
4. **Plugin downloader** — background fetch of **ffmpeg/ffprobe** into `plugins/ffmpeg/`.
5. **Placeholder routes** — `/prompt` (Prompt AI), sidebar tabs redirect to home.

## Verification commands

```bash
uv run pytest
yarn --cwd frontend test
make dev          # full desktop HMR
make start        # production bundle + pywebview
```

## Related docs

| Doc | Purpose |
|-----|---------|
| `README.md` | Install, Make targets, packaging |
| `docs/02-research/RS001-ffmpeg-python.md` | FFmpeg library research |
| `docs/02-research/RS002-jos-desktop-project-research.md` | Full project research snapshot |
| `docs/03-design/DS004-ffmpeg-python-video-merge.md` | Video merge design |
| `docs/04-plans/DS004/` | FR001–FR003 implementation plans |

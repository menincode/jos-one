# AI Workflow Rules — JOS One

How agents and contributors should work in **this** repo.

## Before coding

1. Read **`CONTEXT/project-overview.md`** and **`CONTEXT/architecture-context.md`** for stack and boundaries.
2. For UI work, read **`CONTEXT/ui-context.md`**.
3. For FFmpeg/video merge, read `docs/03-design/DS004-ffmpeg-python-video-merge.md` and `docs/02-research/RS001-ffmpeg-python.md`.
4. Do **not** assume NestJS, Wails, or `apps/backend` — they are not in this repository.

## Change discipline

| Rule | Detail |
|------|--------|
| Minimal diff | Fix root cause only; no drive-by refactors |
| Bridge first | New OS/ffmpeg/file features → Python service + JsApi method → `api-client.ts` + types |
| No direct pywebview in pages | Use `frontend/src/lib/pywebview/*` |
| Models/settings | Persist via `settings_service` + SQLite, not ad-hoc `localStorage` for merge workspace (Python is source of truth for merge settings) |
| FFmpeg | Use `plugin_downloader` paths; document if adding new plugins |

## Typical workflows

### New JsApi capability

1. Implement in `python/services/...`
2. Expose on `python/api/js_api.py` with input validation
3. Add/adjust `frontend/src/lib/pywebview/types.ts` and `api-client.ts`
4. Consume via hook or feature module
5. `uv run pytest` + relevant Vitest

### Video merge changes

Touch only `python/services/video_merge/*`, related tests, and `frontend/src/features/video-merge/*` unless shared layout requires otherwise.

### Auth changes

- Desktop: `python/services/auth_login.py` + `JsApi.login`
- Browser dev: `frontend/src/lib/auth/login-http.ts`
- UI: `frontend/src/features/auth/*`, `stores/auth-store.ts`

## Commands (Makefile)

| Goal | Command |
|------|---------|
| First-time setup | `make install` |
| Daily dev (HMR) | `make dev` |
| Prod-like run | `make start` |
| UI-only in browser | `make local` |
| Windows EXE | `make package` |
| Clean artifacts | `make clean` |

## Cursor toolkit

- Rules: `.cursor/rules/` — **`project-context.mdc` should match this CONTEXT folder**
- Skills: e.g. `frameworks/pywebview`, `python/ffmpeg-python`
- Research output: `docs/02-research/RS###-*.md`

## Verification gate

Before marking work done:

```bash
uv run pytest
yarn --cwd frontend test
```

For merge/FFmpeg features, run integration tests when `plugins/ffmpeg` exists.

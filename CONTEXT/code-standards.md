# Code Standards — JOS One

Aligns with `.cursor/rules/security.mdc`, `code-conventions.mdc`, and `package-manager.mdc`. This file summarizes **project-specific** conventions.

## Package managers

| Ecosystem | Tool | Rule |
|-----------|------|------|
| Python | **uv** | `uv sync --group dev`, `uv run pytest`, `uv run python -m python.main` |
| Frontend | **Yarn 4** | `yarn --cwd frontend install`, never npm/pnpm for `frontend/` |
| Make | GNU Make | `make install`, `make dev`, `make start`, `make package` |

Root `yarn.lock` exists for tooling; application frontend deps are under `frontend/package.json`.

## Languages

| Area | Convention |
|------|------------|
| Python | PEP 8, type hints on public APIs, modules under `python/` |
| TypeScript | Strict TS, **no `any`**, path alias `@/` → `frontend/src/` |
| Files | Python `snake_case.py`; TS/React `kebab-case.ts`, components `PascalCase.tsx` |

## Security (mandatory)

- No hardcoded secrets; auth URL overridable via `AUTH_API_URL` / `VITE_AUTH_API_URL`.
- No `eval()`; validate JsApi inputs (see `js_api.py` `isinstance` checks).
- Saved login credentials encrypted via `cryptography` in settings service (desktop only).
- FFmpeg/subprocess: use plugin paths from `plugin_downloader`, not arbitrary shell strings from UI without validation.

## Python ↔ JavaScript boundary

1. All native/OS operations go through **JsApi** methods.
2. Return JSON-serializable dicts via `_safe_return` (`python/bridge/js_api_base.py`).
3. Do not expose `WindowBridge` on the API object (`_serializable = False` pattern).
4. Frontend: wrap calls in `api-client.ts`; handle `BridgeNotReadyError`.

## Tests

- Add pytest next to feature: `python/tests/test_<module>.py`.
- Mark slow/real-FFmpeg tests `@pytest.mark.integration`.
- Frontend: Vitest `*.test.ts` adjacent to modules.
- Run both suites before claiming feature complete.

## Git / docs naming

Generated docs use prefixes (`FR`, `RS`, `DS`, `RV`) per `.cursor/rules/file-naming-prefix.mdc`:

| Type | Prefix | Folder |
|------|--------|--------|
| Research | `RS` | `docs/02-research/` |
| Design | `DS` | `docs/03-design/` |
| Plan | `FR` (in DS004 folder) | `docs/04-plans/` |

## Logging

- Python: `python/logging_config.py`; default `PYWEBVIEW_LOG=warning` in `main.py`.
- Avoid logging passwords or full auth responses.

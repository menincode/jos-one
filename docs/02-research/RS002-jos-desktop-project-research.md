# RS002 — JOS One project research

**Date:** 2026-05-29  
**Command:** `/research nghiên cứu dự án và lưu vào project context`  
**Deliverables:** `CONTEXT/*.md`, updated `.cursor/rules/project-context.mdc`

---

## Summary

**jos-desktop** is a Windows-focused desktop application for JOSVN: **pywebview** embeds a **React** UI; **Python** owns native dialogs, auth HTTP, SQLite settings, FFmpeg video merge, and plugin downloads. The repo is **not** the legacy YCM CMS / Wails monorepo described in older templates — product code is only `frontend/` + `python/`.

---

## Pros (current architecture)

- **Clear bridge boundary** — JsApi + `api-client.ts` keeps OS/FFmpeg out of React.
- **Hybrid dev** — `make dev` (full desktop), `make local` (browser + mocks).
- **Documented video pipeline** — DS004 design + FR001–FR003 plans + pytest coverage.
- **Reproducible Python env** — uv + `pyproject.toml` / `uv.lock`.
- **Packaging path** — PyInstaller onefile with branded icon.

---

## Cons / risks

| Risk | Detail |
|------|--------|
| Stale AI rules | `project-context.mdc` previously described NestJS/Wails — corrected 2026-05-29 |
| ffmpeg-python age | Pinned 0.2.0 (2019); hybrid subprocess approach documented in RS001 |
| Windows-first packaging | macOS/Linux not validated in Makefile/PyInstaller flow |
| GAS auth dependency | Single Apps Script URL; outage blocks login |
| UPX / AV | Optional compression may trigger false positives |

---

## Alternatives considered (historical context)

| Approach | Why not primary here |
|----------|----------------------|
| Wails (Go + webview) | This product chose pywebview + Python for FFmpeg/auth integration |
| Electron | Heavier runtime; pywebview uses system WebView2 |
| Browser-only SPA | Cannot access local folders/FFmpeg without native host |

---

## Recommendation

1. **Treat `CONTEXT/` as source of truth** for onboarding and AI sessions.
2. **Keep extending via JsApi** for any new native capability.
3. **Before large features**, read `CONTEXT/architecture-context.md` and relevant `docs/03-design/*`.
4. **Refresh `CONTEXT/progress-tracker.md`** when shipping milestones.

---

## Next steps

| Action | Owner |
|--------|--------|
| Review CONTEXT files for accuracy | Team |
| Define Prompt AI (`/prompt`) backend contract | Product + dev |
| CI: `uv run pytest -m "not integration"` on push | DevOps |
| Optional: align `.agent/rules` copy with `.cursor/rules/project-context.mdc` | Maintainer |

---

## References

- `README.md` — install, Make targets, DS004 feature list
- `CONTEXT/` — six context files (2026-05-29)
- `docs/02-research/RS001-ffmpeg-python.md` — FFmpeg integration
- `docs/04-plans/DS004/index.md` — video merge execution plan

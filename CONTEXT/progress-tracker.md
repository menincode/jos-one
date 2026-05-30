# Progress Tracker — JOS One

**Updated:** 2026-05-29  
**Detailed feature history:** see `README.md` → *Implemented Features*

## Current status

| Area | Status | Notes |
|------|--------|-------|
| Desktop shell (pywebview) | Done | `make dev`, `make start`, packaging |
| Login (GAS auth API) | Done | Python bridge + browser HTTP fallback |
| Settings (SQLite) | Done | Login + video merge workspace |
| FFmpeg plugin download | Done | `plugins/ffmpeg` at runtime |
| Video merge (DS004) | Done | FR001–FR003; see `docs/04-plans/DS004/` |
| Prompt AI page | Placeholder | Route `/prompt`; no backend yet |
| Sidebar tabs (overview, messages, orders) | Stub | Redirect to `/` |

## Milestones

| Date | Milestone |
|------|-----------|
| 2026-05-25 | DS004 video merge backend + tests shipped |
| 2026-05-29 | Project CONTEXT/ documented for AI/contributors |

## Next candidates (not committed)

- Prompt AI integration (define API + bridge or external service)
- Non-Windows packaging validation
- Additional plugins beyond ffmpeg (follow `plugin_downloader` pattern)

## Test health (reference)

```bash
uv run pytest                    # python/tests
yarn --cwd frontend test         # Vitest
uv run pytest -m integration     # needs plugins/ffmpeg
```

## Doc index

| ID | File |
|----|------|
| RS001 | `docs/02-research/RS001-ffmpeg-python.md` |
| RS002 | `docs/02-research/RS002-jos-desktop-project-research.md` |
| DS004 | `docs/03-design/DS004-ffmpeg-python-video-merge.md` |
| Plans | `docs/04-plans/DS004/FR001-io.md`, `FR002-pipeline.md`, `FR003-job.md` |

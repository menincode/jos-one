# UI Context — JOS One

## Stack

| Piece | Choice |
|-------|--------|
| Framework | React 19 + React Router 7 (**HashRouter**) |
| Build | Vite 6, `@/` alias |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Components | shadcn-style under `frontend/src/components/ui/` |
| Forms | react-hook-form + zod |
| Toasts | sonner (`frontend/src/components/ui/sonner.tsx`) |
| Icons | lucide-react |

## Layout system

| Component | Path | Role |
|-----------|------|------|
| `AppShell` | `components/layout/app-shell.tsx` | Sidebar + main area |
| `AppPage` | `components/layout/app-page.tsx` | Page wrapper |
| `WorkspacePanel` | `components/layout/workspace-panel.tsx` | Feature panels |
| `AppStatusBar` | `components/layout/app-status-bar.tsx` | Bottom status |

Reuse **`components/common/`** (`app-tone-button`, `app-tone-icon-box`, `coming-soon-badge`) for consistent JOSVN tone.

## Theming

- Dark theme tokens: `frontend/src/theme/app-dark-theme.ts`
- Toast styling: `frontend/src/theme/toast-theme.ts`
- Brand assets: `frontend/public/brand/`, constants in `features/auth/brand/josvn-brand.ts`

## Feature areas

| Feature | Path | Route |
|---------|------|-------|
| Login | `features/auth/login-page.tsx` | `/login` |
| Video merge | `features/video-merge/*`, `pages/video-merge-page.tsx` | `/` |
| Settings | `pages/settings-page.tsx`, `components/settings/*` | `/settings` |
| Prompt AI | `pages/prompt-ai-page.tsx` | `/prompt` (placeholder-level) |

### Video merge UI patterns

- State hooks: `use-video-merge-job.ts`, `use-mix-rows.ts`, `use-persisted-video-merge-state.ts`
- Export types: `video-merge-export-types.ts`
- Job status mapping: `mix-row-job-status.ts`, `merge-flow-status.ts`
- All FFmpeg/folder actions go through **bridge client**, not fetch to local files directly

## Desktop vs browser dev

| Mode | Bridge | Auth |
|------|--------|------|
| `make dev` / `make start` | Real `pywebview.api` | Python `login` |
| `make local` | Mock in `api-client.ts` | HTTP `signInWithUsernameHttp` |

Use `usePywebviewReady()` before calling bridge methods from effects.

## Accessibility & UX notes

- Vietnamese copy is common in errors/messages (e.g. bridge not ready).
- Hash routing avoids `file://` path issues in packaged builds.
- Prefer explicit loading/error states on merge table rows (`row_states` from job status API).

## Do not

- Import `window.pywebview` in page components.
- Add npm-only install docs for frontend (Yarn only).
- Copy SaaS `DynamicTable` patterns — this app uses custom merge table (`mix-video-table.tsx`).

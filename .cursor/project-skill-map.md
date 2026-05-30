# Project Skill Map

## Detected Stack

- Backend: NestJS, TypeORM, PostgreSQL
- Frontend: React, Vite, TanStack React Query, Tailwind
- Desktop: Wails (Go + React), pywebview (Python + React)
- Shared contracts: Zod DTOs in `@cms/models`

## Core Skills (Default)

- `map-codebase`: scan and locate correct change boundaries
- `write-plan`: create executable file-level implementation plans
- `test-first`: enforce regression safety for features/fixes
- `verification-gate`: prove done-ness with concrete evidence
- `code-review-loop`: structural review before shipping

## Situational Skills

- `investigate-root-cause`, `evidence-driven-debugging`: bug/error diagnosis
- `plan-review`, `plan-review-architecture`, `plan-review-experience`: pressure-test non-trivial plans
- `incremental-shipping`: large feature rollout in reversible slices
- `audit-dependencies`, `security-owasp`: dependency and security-risk checks

## Stack-Specific Skills

- NestJS-heavy tasks: `frameworks-nestjs`, `api-openapi`
- React data-layer tasks: `frontend-tanstack-react-query`, `frameworks-react`
- Desktop Wails tasks: `.cursor/skills/frameworks/wails/SKILL.md`
- Desktop pywebview tasks: `.cursor/skills/frameworks/pywebview/SKILL.md`
- Python FFmpeg / ffmpeg-python: `.cursor/skills/python/ffmpeg-python/SKILL.md`

## Agent Routing (Practical)

- Planning / discovery: `planner`, `scout`
- Bug investigation: `investigator`
- Implementation support: `generalPurpose`
- Test generation: `tester`
- Structural review: `code-reviewer`
- Security-sensitive review: `security-auditor`

## Command Recommendations

- `/start-project`: refresh context + best practices + stack skill references
- `/feature`: standard implementation flow (with bootstrap detection when needed)
- `/fix`, `/debug`: root-cause-first, minimal-scope patches
- `/review`: pair structural review with security review for sensitive areas

## Do / Don't

Do:
- Use smallest safe change.
- Keep stack-specific rules in skill files with references.
- Re-sync this map when architecture or stack changes.

Don't:
- Mix broad refactor with bugfix in one patch.
- Add speculative skills without current project need.
- Drift from Yarn/strict-security conventions.

## References

- Command routing: `.cursor/commands/skill-agent-routing.md`
- Bootstrap command: `.cursor/commands/start-project.md`
- Context files: `CONTEXT/project-context.md`, `CONTEXT/best-practices.md`

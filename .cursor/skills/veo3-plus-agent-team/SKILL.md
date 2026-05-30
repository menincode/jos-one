---
name: veo3-plus-agent-team
description: >-
  Orchestrate a four-role implementation workflow (Product Owner, Tech Lead,
  Developer, Test) for the Veo3 Plus Wails desktop app under desktop/veo3-plus.
  Use for feature planning, handoffs, prompt templates, and quality gates.
---

## What I do

- Apply the **multi-role playbook** for `desktop/veo3-plus/` (PO → Tech Lead → Developer → Test → TL review).
- Point contributors to **copy-paste role prompts** and the **codebase map** in `desktop/veo3-plus/AGENT_TEAM.md`.
- Enforce **stack-specific rules**: Go Wails backend, React + Vite + Tailwind frontend, Yarn only, regenerated `wailsjs` when bindings change.

## When to use me

- User asks for a **feature** or **refactor** in Veo3 Plus and wants disciplined role separation.
- User says **agent team**, **PO**, **tech lead**, **developer**, **test**, or **implementation workflow** in the context of `veo3-plus` or `desktop/veo3-plus`.

## Workflow

1. **Read** `desktop/veo3-plus/AGENT_TEAM.md` at the start of the engagement (or summarize it if the user already has it open).
2. **Identify** which role the current request matches; if unclear, start as **PO** (clarify acceptance criteria) or **Tech Lead** (if criteria exist).
3. **Run the role** using the prompt templates from that file; keep outputs scoped to `desktop/veo3-plus/` unless the feature truly spans the monorepo.
4. **Hand off** explicitly: state the next role and what they need (artifacts, file list, test results).
5. **Quality gate before “done”:** `go test ./...` from `desktop/veo3-plus`; note any required manual UI checks (login, jobs, canvas, settings).

## Additional skills

- **Wails** (CLI, dev, build, runtime): `.cursor/skills/frameworks/wails/SKILL.md`
- **UI** (shadcn/Tailwind): `.cursor/skills/ui-styling/SKILL.md`

## Limitations

- Cursor does not spawn separate agent processes; roles are **sequential or parallel chat tasks** driven by the same playbook.
- Do not duplicate the full playbook in chat; **link or cite** `AGENT_TEAM.md` and add only delta for the current feature.

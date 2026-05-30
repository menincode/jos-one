# Shared Implementation Guardrails

Single source for minimal-change, SOLID, and DRY rules used by implementation commands.

**Consumers**: `/feature`, `/debug`, `/execute-plan` — reference this file; do not duplicate these rules in command files.

## Minimal Change (Mandatory)

1. **Smallest fix that solves the problem** — prefer the fewest files and lines that resolve the issue.
2. **Update before rewrite** — extend existing modules, functions, and components; add new abstractions only when reuse is proven or the plan explicitly requires it.
3. **No bundled refactors** — keep behavior fixes, features, and cleanups in separate commits/commands (`/fix`, `/refactor`).
4. **Scope escalation** — if more than one module must change, state why and list impacted files before editing.

## SOLID (Apply During Implementation)

| Principle | Rule of thumb |
|-----------|---------------|
| **S** — Single responsibility | One clear reason to change per module/function; split only when the task demands it. |
| **O** — Open/closed | Extend via parameters, hooks, or interfaces; avoid editing stable core for one-off cases. |
| **L** — Liskov substitution | Subtypes and test doubles honor the same contract as the base type. |
| **I** — Interface segregation | Small, focused APIs; callers should not depend on methods they do not use. |
| **D** — Dependency inversion | Depend on abstractions (interfaces, injected deps), not concrete internals. |

## DRY (Apply During Implementation)

1. **Search first** — grep or map the codebase for existing helpers, components, and services before adding new ones.
2. **Reuse project patterns** — follow `CONTEXT/`, similar features, `frontend/src/components/common/`, and existing Python service layout.
3. **Extract when repeated** — duplicate logic in 2+ places with the same semantics → extract a shared helper; do not preemptively abstract.
4. **Commands stay DRY** — shared workflow text lives here; command files add only role-specific steps.

## Verification Before Done

- [ ] Change scope is minimal and intentional
- [ ] Existing code updated where possible; new files justified
- [ ] Tests prove behavior (red→green for bugs and features)
- [ ] No unrelated edits in the same patch

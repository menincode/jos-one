# Skill & Agent Routing for Commands

Use this matrix to select the best skill(s) and subagent(s) for each command.

## Core Command Mapping

| Command | Primary Skills | Recommended Agents |
|---|---|---|
| `/brainstorm` | `shape-spec`, `map-codebase`, `methodology-brainstorming` | `planner`, `scout` |
| `/plan` | `write-plan`, `map-codebase` | `planner` |
| `/review-plan` | `plan-review`, `plan-review-architecture`, `plan-review-experience` | `architect`, `experience-reviewer` |
| `/execute-plan` | `methodology-executing-plans`, `verification-gate` | `generalPurpose`, `code-reviewer`, `tester` |
| `/feature` | `incremental-shipping`, `test-first`, `verification-gate` | `generalPurpose`, `tester`, `code-reviewer` |
| `/fix` | `investigate-root-cause`, `evidence-driven-debugging`, `test-first` | `investigator`, `tester` |
| `/debug` | `investigate-root-cause`, `evidence-driven-debugging`, `methodology-systematic-debugging` | `investigator` |
| `/refactor` | `map-codebase`, `test-first`, `incremental-shipping` | `generalPurpose`, `code-reviewer` |
| `/test` | `test-first`, `testing-automation` | `tester` |
| `/tdd` | `test-first`, `methodology-test-driven-development` | `tester` |
| `/review` | `code-review-loop`, `verification-gate`, `security-owasp` | `code-reviewer`, `security-auditor` |
| `/security-scan` | `security-owasp`, `audit-dependencies`, `methodology-defense-in-depth` | `security-auditor`, `scout` |
| `/optimize` | `map-codebase`, `incremental-shipping`, `verification-gate` | `generalPurpose`, `code-reviewer` |
| `/research` | `map-codebase`, `audit-dependencies` (when dependency-focused); `python/ffmpeg-python` for FFmpeg/video topics | `scout`, `explore` |
| `/api-gen` | `api-openapi`, `frameworks-nestjs` | `generalPurpose`, `code-reviewer` |
| `/doc` | `methodology-writing-plans`, `release-and-changelog` (when release docs) | `generalPurpose` |
| `/changelog` | `release-and-changelog`, `verification-gate` | `generalPurpose` |
| `/deploy` | `verification-gate`, `devops-docker`, `devops-github-actions` | `generalPurpose` |
| `/ship` | `verification-gate`, `methodology-finishing-development-branch`, `code-review-loop` | `code-reviewer`, `security-auditor` |
| `/pr` | `code-review-loop`, `verification-gate` | `code-reviewer`, `security-auditor` |
| `/commit` | `verification-gate` | `generalPurpose` |
| `/checkpoint` | `verification-gate` | `generalPurpose` |
| `/spawn` | `methodology-dispatching-parallel-agents` | `planner`, `scout`, `investigator`, `tester`, `code-reviewer`, `security-auditor`, `architect`, `experience-reviewer` |
| `/index` | `map-codebase` | `scout`, `explore` |
| `/load` | `map-codebase` | `explore` |
| `/onboarding` | `map-codebase`, `write-plan` | `scout`, `planner` |
| `/start-project` | `map-codebase`, `shape-spec`, `write-plan` | `scout`, `planner` |
| `/status` | `verification-gate` | `generalPurpose` |
| `/help` | `map-codebase` | `explore` |
| `/mode` | `methodology-sequential-thinking` | `generalPurpose` |

## Selection Rules

1. Prefer a dedicated specialist skill before generic skills.
2. For bug/error work, always run root-cause investigation before fixing.
3. For implementation commands, enforce test-first or at least verification gate before completion.
4. For security-sensitive codepaths, pair structural review with `security-auditor`.
5. When tasks are independent, dispatch agents in parallel.

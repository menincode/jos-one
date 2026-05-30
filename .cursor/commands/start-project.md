# /start-project - Project Bootstrap Intelligence

## Purpose

Bootstrap project intelligence at the beginning of a project/session:
- detect domain and tech stack,
- research official documentation for declared stack(s),
- identify required skills/agents,
- persist reusable project context for future commands.

## Usage

```bash
/start-project [project description or 'auto']
/start-project --fresh [project description or 'auto']
```

## Arguments

- `$ARGUMENTS`:
  - `auto` or omitted: infer from repository structure and docs
  - free text: explicit project description, domain, or target scope
  - `--fresh`: treat current `.cursor` as copied template and reset/overwrite project-specific artifacts

---

Start project bootstrap for: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/start-project`)
- Preferred skills: `map-codebase`, `shape-spec`, `write-plan`
- Recommended agents: `scout`, `planner`

## Workflow

### Phase 1: Discover Project Facts

1. Read top-level context and docs:
   - `README.md`
   - `CONTEXT/project-overview.md`
   - `CONTEXT/architecture-context.md`
   - relevant `docs/` plans/research
2. Identify:
   - business domain(s)
   - primary tech stack
   - key modules and boundaries
3. Capture unknowns as explicit assumptions.

### Phase 1.5: Template Migration Mode (`--fresh`)

Use this phase when `.cursor` was copied from another repository.

1. **Detect stale project fingerprints**
   - old project name, old module paths, old stack labels, old command references
   - mismatches between current repo structure and existing `.cursor`/`CONTEXT` content

2. **Reset project-specific artifacts (safe overwrite)**
   - overwrite generated context files with new project data
   - remove obsolete bootstrap outputs that reference old project topology
   - keep reusable generic assets (shared command frameworks, generic skills)

3. **Do not blindly delete everything**
   - preserve stable reusable command skeletons
   - only delete or overwrite files classified as project-specific

### Phase 2: Build Skill & Agent Matrix

1. Map project needs to available skills in `.cursor/skills/`.
2. Classify skills:
   - **Core**: used daily for this project
   - **Situational**: used for specific tasks
   - **Optional**: nice-to-have
3. Map subagent usage:
   - planning: `planner`, `scout`
   - implementation/review: `code-reviewer`, `tester`
   - risk areas: `security-auditor`, `investigator`

### Phase 3: Stack Research with References (Mandatory)

For each declared stack/library (example: `pywebview`):

1. **Research official docs first**
   - Resolve library via Context7 (`resolve-library-id`).
   - Query focused docs via Context7 (`query-docs`) for API, lifecycle, security, and examples.
   - If Context7 is incomplete, supplement with official docs website and release notes.

2. **Extract expert knowledge**
   - Core architecture model
   - Lifecycle constraints and threading rules
   - Security model and risky APIs
   - Production patterns and anti-patterns
   - Debugging and troubleshooting playbook

3. **Persist references**
   - Every major rule must include source links.
   - Prefer official docs, then canonical maintainer examples, then trusted community sources.

### Phase 4: Persist Context Artifacts

Create/update the following files:

1. `CONTEXT/project-context.md`
   - project mission
   - domain glossary
   - architecture summary
   - key constraints/rules

2. `CONTEXT/best-practices.md` (mandatory)
   - coding best practices for detected domain and stack
   - architecture and module-boundary best practices
   - testing, security, and observability best practices
   - deployment/release hygiene best practices
   - include references for each critical rule

3. `.cursor/project-skill-map.md`
   - skill matrix by use-case
   - command-to-skill recommendations
   - do/don't guidance

4. `.cursor/skills/<category>/<stack>/SKILL.md` (create/update stack-specific expert skill)
   - include practical rules, checklists, and failure modes
   - include a `## References` section with source links

5. `docs/01-onboarding/OBxxx-project-bootstrap.md` (optional)
   - quick onboarding handoff for new contributors

### Phase 4.5: Overwrite/Delete Policy for New Project Adoption

When running with `--fresh`, apply this policy:

1. **Always overwrite (project-specific)**
   - `CONTEXT/project-context.md`
   - `CONTEXT/best-practices.md`
   - `.cursor/project-skill-map.md`
   - stack-specific skill files generated for current project scope

2. **Conditionally delete (stale generated outputs)**
   - old onboarding bootstrap docs that explicitly reference previous project
   - project-specific generated notes under `.cursor` that conflict with new context

3. **Never delete by default (shared assets)**
   - `.cursor/commands/*.md` base command framework
   - generic reusable skills unrelated to old project-specific assumptions
   - rules intended to be organization-wide unless user requests cleanup

### Phase 5: Gap Handling

1. If domain/stack skill is missing:
   - propose new skill path under `.cursor/skills/<category>/<name>/SKILL.md`
   - scaffold initial SKILL template with scope, triggers, and guardrails
2. Do not create many speculative skills; only create high-value gaps.

### Phase 6: Verification

1. Check artifacts are coherent and non-duplicative.
2. Confirm recommendations align with existing command routing.
3. Confirm skill files contain references and actionable examples.
4. Confirm `CONTEXT/project-context.md` and `CONTEXT/best-practices.md` are both created/updated.
5. If `--fresh` is used, confirm stale project references are removed.
6. Provide next commands based on current project maturity.

## Output

```markdown
## Project Bootstrap Complete

### Detected Domain & Stack
- Domain: [...]
- Stack: [...]

### Generated/Updated Artifacts
- `CONTEXT/project-context.md`
- `CONTEXT/best-practices.md`
- `.cursor/project-skill-map.md`
- `.cursor/skills/<category>/<stack>/SKILL.md`
- `docs/01-onboarding/OBxxx-project-bootstrap.md` (if requested)

### Recommended Core Skills
- [...]

### Recommended Core Agents
- [...]

### References Used
- [Official docs link 1]
- [Official docs link 2]
- [Release notes or examples link]
```

## CONTEXT File Requirements (Mandatory)

When `/start-project` runs, generate or update both files below under `CONTEXT/`:

1. `CONTEXT/project-context.md`
   - product/domain summary
   - architecture map and major modules
   - critical constraints (security, compliance, performance, deployment)
   - glossary of key business terms

2. `CONTEXT/best-practices.md`
   - language/framework conventions for this project
   - "Do / Don't" patterns with short examples
   - testing strategy and quality gates
   - security and error-handling standards
   - citation links to official docs and trusted references

## New Project Migration Notes

If user copied entire `.cursor` from another project, `/start-project --fresh` must:

1. Rebuild project context from current repository facts.
2. Overwrite stale project-specific files without asking per-file confirmation.
3. Keep reusable command/rule infrastructure intact.
4. Report exactly what was overwritten and what was deleted.

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review Bootstrap Artifacts**
   - [ ] Confirm domain glossary and constraints are correct
   - [ ] Validate core skills match project reality
   - [ ] Remove low-value or redundant recommendations

2. **Next Commands to Use**
   - Use `/onboarding full` to generate full onboarding materials
   - Use `/plan "first milestone"` to convert context into tasks
   - Use `/feature "first feature"` to begin implementation

3. **Update or Improve**
   - To update: rerun `/start-project` with clearer project description
   - To extend: add missing domain skills under `.cursor/skills/`
   - To operationalize: sync mappings in `.cursor/commands/skill-agent-routing.md`

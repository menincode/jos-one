# /feature - Feature Development Workflow

## Purpose

End-to-end feature development workflow that orchestrates planning, implementation guidance, testing, and code review.

## Usage

```
/feature [feature description or issue reference]
```

## Arguments

- `$ARGUMENTS`: Feature description, issue number, or requirement specification

---

Implement a complete feature development workflow for: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/feature`)
- Preferred skills: `incremental-shipping`, `test-first`, `verification-gate`
- Recommended agents:
  - `generalPurpose` for implementation slices
  - `tester` for red-green cycle and regressions
  - `code-reviewer` for gate review

## Engineering Guardrails

**Reference (mandatory)**: `.cursor/commands/_shared-implementation-guardrails.md`

Command-specific:

- **Prefer update over new code** — extend existing feature folders, JsApi methods, and UI flows before creating parallel modules.
- **Reuse before create** — check `frontend/src/components/common/` and existing Python services/packages first.
- **Vertical slices** — ship the smallest end-to-end slice that proves value; defer extra abstractions to a follow-up `/refactor` or plan task.
- **SOLID at boundaries** — keep bridge (JsApi), services, and UI layers with single responsibilities; inject dependencies instead of hard-coding cross-layer calls.

## Workflow

### Phase 0: Bootstrap Detection (Before Planning)

If request intent matches project initialization or stack declaration (examples: "start project", "bootstrap", "stack dùng pywebview"):

1. Run `/start-project` flow first.
2. Build or update stack-specific skill files in `.cursor/skills/`.
3. Require references for all critical framework rules before implementation starts.
4. Continue to Phase 1 only after bootstrap artifacts are saved.

### Phase 1: Planning

First, analyze the feature request and create an implementation plan:

1. **Understand Requirements**
   - Parse the feature description thoroughly
   - Identify acceptance criteria
   - List assumptions that need validation
   - Clarify any ambiguous requirements with the user

2. **Explore Codebase**
   - Find related existing implementations
   - Identify patterns and conventions to follow
   - Locate integration points
   - Note dependencies

3. **Learn from Existing Code**
   - **Read Similar Implementations**
     * Read 3-5 similar implementations in codebase
     * Focus on files that solve similar problems
     * Note file structure and organization
   
   - **Analyze Code Style**
     * Naming conventions (variables, functions, classes, files)
     * Code structure patterns (how functions are organized)
     * Error handling approaches (try-catch, error types, logging)
     * Testing patterns (test structure, mocking strategies)
     * Documentation style (comments, docstrings, JSDoc)
   
   - **Extract Conventions**
     * File organization patterns (where similar code lives)
     * Import/export patterns (how dependencies are managed)
     * Type definitions and interfaces (if TypeScript)
     * Configuration patterns (how settings are handled)
   
   - **Document Findings**
     * Create style reference for this feature
     * List specific patterns to follow
     * Identify anti-patterns to avoid
     * Note any deviations needed and why

4. **Create Task Breakdown**
   - Decompose into atomic, verifiable tasks
   - Order tasks by dependencies
   - Include testing requirements
   - Estimate complexity (S/M/L)

4. **Use TodoWrite** to track all tasks

### Phase 2: Research (If Needed)

If the feature involves unfamiliar technology:

1. Research best practices and patterns
2. Find examples in the codebase or documentation
3. Identify potential pitfalls
4. Document key decisions

### Phase 3: Implementation Guidance

For each implementation task:

1. **Identify Target Files**
   - Existing files to modify
   - New files to create
   - Tests to add/update

2. **Provide Implementation Direction**
   - Code structure recommendations
   - Patterns to follow
   - Edge cases to handle
   - Error handling approach

3. **Review Progress**
   - Mark tasks complete as you go
   - Identify blockers early
   - Adjust plan if needed

### Phase 4: Testing

After implementation:

1. **Generate Tests**
   - Unit tests for new functions
   - Integration tests for workflows
   - Edge case coverage

2. **Run Test Suite**
   ```bash
   # Python
   pytest -v --cov=src

   # TypeScript
   yarn --cwd frontend test
   ```

3. **Verify Coverage**
   - Ensure new code is tested
   - Coverage should not decrease

### Phase 5: Code Review

Before completion:

1. **Self-Review Checklist**
   - [ ] Code follows project conventions
   - [ ] No security vulnerabilities
   - [ ] Error handling is complete
   - [ ] Documentation updated
   - [ ] Tests are passing

2. **Review Staged Changes**
   ```bash
   git diff --staged
   ```

3. **Address Any Issues**
   - Fix critical issues immediately
   - Note recommendations for future

### Phase 6: Completion

1. **Verify All Tasks Complete**
   - All TodoWrite items done
   - All tests passing
   - Documentation updated

2. **Prepare for Commit**
   - Stage appropriate files
   - Generate commit message
   - Create PR if requested

## Output

### Deliverables

1. **Implementation Plan** - Structured task breakdown
2. **Code Changes** - Feature implementation
3. **Tests** - Comprehensive test coverage
4. **Documentation** - Updated docs if needed
5. **Commit/PR** - Ready for merge

### Summary Format

```markdown
## Feature Implementation Complete

### Feature
[Feature description]

### Changes Made
- `path/to/file.ts` - [What was added/modified]
- `path/to/file.test.ts` - [Tests added]

### Tests
- [x] Unit tests passing
- [x] Integration tests passing
- [x] Coverage: XX%

### Documentation
- [x] Code comments added
- [x] README updated (if applicable)

### Ready for Review
```bash
git status
git diff --staged
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Implementation**
   - [ ] Review all code changes for correctness and quality
   - [ ] Verify feature matches requirements and acceptance criteria
   - [ ] Check code follows project conventions and style
   - [ ] Confirm all edge cases are handled

2. **Next Commands to Use**
   - Use `/review [file]` to review code quality and get feedback
   - Use `/test [scope]` to add or update tests if needed
   - Use `/ship [message]` to commit and create PR when ready
   - Use `/fix [error]` if tests reveal any issues
   - Use `/refactor [file]` to improve code structure if needed

3. **Update or Improve**
   - To update: Make changes directly or use `/feature` again with modifications
   - To improve: Use `/review` for suggestions, then `/refactor` to apply improvements
   - To extend: Add new features or use `/plan` to plan additional functionality

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/review` | Review code quality | After implementation to verify quality |
| `/test` | Generate or update tests | Before or after implementation |
| `/ship` | Commit and create PR | When feature is complete and tested |
| `/fix` | Fix bugs or issues | When tests fail or issues are found |
| `/refactor` | Improve code structure | After tests pass, to improve quality |
| `/plan` | Plan additional features | To extend or plan related features |

### Common Workflows

**Workflow: Feature → Review → Test → Ship**
```
/feature "add user profile" → /review "code" → /test "profile" → /ship "feat: add user profile"
```

**Workflow: Feature → Fix → Review → Ship**
```
/feature "payment flow" → /fix "validation error" → /review "fixed code" → /ship "feat: payment"
```

**Workflow: Feature → Refactor → Review → Ship**
```
/feature "api endpoint" → /refactor "improve structure" → /review "refactored" → /ship "feat: api"
```

### Tips

- 💡 **Tip**: Always run tests after implementation to catch issues early
- 💡 **Tip**: Use `/review` before shipping to ensure code quality
- 💡 **Tip**: Use `/refactor` to improve code structure after tests pass
- ⚠️ **Warning**: Don't skip code review - it catches bugs and improves quality
- ⚠️ **Warning**: Ensure all tests pass before shipping
```

## Example

**Input**: `/feature Add password reset functionality with email verification`

**Output**:
1. Plan with 8 tasks covering model, service, routes, email, tests
2. Implementation of password reset flow
3. Tests for happy path and error cases
4. Updated API documentation
5. Commit message and PR description

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--mode=[mode]` | Use specific behavioral mode | `--mode=implementation` |
| `--depth=[1-5]` | Planning thoroughness level | `--depth=3` |
| `--checkpoint` | Create checkpoint before starting | `--checkpoint` |
| `--skip-tests` | Skip test generation phase | `--skip-tests` |
| `--skip-review` | Skip code review phase | `--skip-review` |
| `--format=[fmt]` | Output format (concise/detailed) | `--format=concise` |

### Flag Usage Examples

```bash
/feature --mode=implementation "add user profile page"
/feature --depth=5 --checkpoint "implement payment flow"
/feature --format=concise "add logging utility"
```

## MCP Integration

This command leverages MCP servers for enhanced capabilities:

### Context7 - Library Documentation
When researching unfamiliar libraries or frameworks:
```
Use Context7's resolve-library-id and get-library-docs tools to fetch
current documentation for any libraries involved in the feature.
```

### Sequential Thinking - Structured Planning
For complex feature breakdowns:
```
Use Sequential Thinking's sequentialthinking tool for step-by-step
analysis when decomposing requirements or designing architecture.
```

### Memory - Context Persistence
Store and recall project context:
```
- Store architectural decisions made during planning
- Recall user preferences from previous sessions
- Remember patterns used in similar features
```

### Filesystem - File Operations
For creating and modifying files:
```
- Use directory_tree to understand project structure
- Use search_files to find related implementations
- Use read_file and write_file for file operations
```

### Playwright - E2E Testing
For features with UI components:
```
Use Playwright for browser-based E2E testing of the implemented feature.
Validate user flows and interactions in real browser environment.
```

<!-- CUSTOMIZATION POINT -->
## Variations

Modify behavior via CLAUDE.md:
- Set minimum test coverage requirements
- Define required documentation updates
- Configure branch naming conventions
- Set PR template requirements

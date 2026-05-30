# /review - Code Review Command

## Purpose

Comprehensive code review with focus on quality, security, performance, and maintainability.

## Usage

```
/review [file path | 'staged' | 'pr' | PR number]
```

## Arguments

- `$ARGUMENTS`:
  - File path: Review specific file(s)
  - `staged`: Review all staged changes
  - `pr`: Review current branch changes vs main
  - PR number: Review specific pull request

---

Perform a comprehensive code review for: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/review`)
- Preferred skills: `code-review-loop`, `verification-gate`, `security-owasp`
- Recommended agents:
  - `code-reviewer` for structural issues
  - `security-auditor` for auth/payment/token/user-sensitive paths

## Workflow

### Phase 1: Identify Review Scope

1. **Determine What to Review**
   - Single file: Read the specified file
   - `staged`: Get staged changes with `git diff --staged`
   - `pr`: Get branch diff with `git diff main...HEAD`
   - PR number: Fetch PR details with `gh pr view`
   - Directory: Review all files in directory (e.g., `src/auth/`)

2. **Gather Context**
   - Understand the purpose of changes
   - Check related tests
   - Review CLAUDE.md for project standards
   - **If code is from split plan execution**: Check if related sub-plans are complete and review continuity

3. **Check for Split Plan Context** (if applicable)
   - If reviewing code that was created from split plan execution:
     * Check if related sub-plans are documented
     * Verify code matches plan specifications
     * Review continuity with previous sub-plans (if applicable)
     * Check integration points between sub-plans

### Phase 2: Code Quality Review

Check each file for:

1. **Correctness**
   - Logic errors and bugs
   - Edge case handling
   - Null/undefined safety
   - Type correctness

2. **Clarity**
   - Clear naming (variables, functions, classes)
   - Readable structure
   - Appropriate comments
   - Self-documenting code

3. **Consistency**
   - Follows project conventions
   - Matches existing patterns
   - Style guide compliance

4. **Complexity**
   - Function length (prefer <30 lines)
   - Cyclomatic complexity
   - Nesting depth

### Phase 3: Security Review

Check for security issues:

1. **Input Validation**
   - User input sanitization
   - Type validation
   - Size/length limits

2. **Authentication/Authorization**
   - Proper auth checks
   - Role-based access control
   - Session management

3. **Data Protection**
   - Sensitive data handling
   - Encryption where needed
   - PII protection

4. **Injection Prevention**
   - SQL injection
   - XSS vulnerabilities
   - Command injection

5. **Secrets**
   - No hardcoded credentials
   - No API keys in code
   - Proper env var usage

### Phase 4: Performance Review

Check for performance issues:

1. **Algorithmic Efficiency**
   - Time complexity
   - Unnecessary loops
   - Redundant operations

2. **Memory Usage**
   - Large object creation
   - Memory leaks
   - Unbounded caches

3. **Database**
   - N+1 queries
   - Missing indexes
   - Large result sets

4. **Async Operations**
   - Proper async/await
   - Parallel where possible
   - Timeout handling

### Phase 5: Maintainability Review

Check for maintainability:

1. **SOLID Principles**
   - Single responsibility
   - Open/closed
   - Dependency injection

2. **DRY**
   - Code duplication
   - Opportunity for reuse

3. **Testing**
   - Test coverage
   - Test quality
   - Edge case tests

4. **Documentation**
   - API documentation
   - Complex logic explanation
   - Usage examples

### Phase 6: Save Review (if --save flag provided)
   - **Reference**: `.cursor/rules/output-paths.mdc`
   - Extract directory from save path (default: `docs/06-reviews/`)
   - Ensure directory exists (create if needed, including parent `docs/` if necessary)
   - Generate filename if not provided (e.g., `docs/06-reviews/pr-123.md` or `docs/06-reviews/staged-review.md`)
   - Save review to specified path
   - **For code from split plans**: Include reference to related sub-plan in review

## Output Format

```markdown
## Code Review: [Target]

**Reviewed**: [files/changes]
**Verdict**: [Approve | Request Changes | Needs Discussion]

---

### Critical Issues (Must Fix)

#### 1. [Security] SQL Injection Risk
**File**: `src/api/users.ts:42`
**Severity**: Critical

```typescript
// Current code
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

**Issue**: User input directly interpolated into SQL query.

**Fix**:
```typescript
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);
```

---

### Recommendations (Should Fix)

#### 1. Missing Error Handling
**File**: `src/services/auth.ts:78`

```typescript
// Current
const user = await db.findUser(email);
return user.password; // May throw if user is null
```

**Suggestion**:
```typescript
const user = await db.findUser(email);
if (!user) {
  throw new NotFoundError('User not found');
}
return user.password;
```

---

### Suggestions (Nice to Have)

1. Consider extracting the validation logic in `src/utils/validate.ts:23` into a separate function for reusability.

2. The constant `MAX_RETRIES` in `src/api/client.ts` could be moved to configuration.

---

### What's Good

- Clean separation of concerns between controller and service layers
- Comprehensive error handling in the authentication flow
- Good test coverage for edge cases in `auth.test.ts`

---

### Summary

Found **1 critical issue** (security), **2 recommendations**, and **2 suggestions**.

**Priority Actions**:
1. Fix SQL injection vulnerability immediately
2. Add null check for user lookup

**Ready for merge**: No - Critical issues must be addressed first
```

## Review Checklist

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Output encoding for rendered content
- [ ] SQL parameterization
- [ ] Proper auth checks
- [ ] No eval() or dynamic code execution

### Quality
- [ ] Clear naming conventions
- [ ] Functions are focused (single responsibility)
- [ ] Error handling is complete
- [ ] No commented-out code
- [ ] No debug statements left

### Testing
- [ ] New code has tests
- [ ] Edge cases covered
- [ ] Tests are deterministic

### Documentation
- [ ] Public APIs documented
- [ ] Complex logic explained
- [ ] Breaking changes noted

## Example

**Input**: `/review staged`

**Output**: Complete review of all staged changes with security scan, code quality assessment, and actionable feedback organized by severity.

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--mode=[mode]` | Use specific behavioral mode | `--mode=review` |
| `--persona=[type]` | Apply persona expertise | `--persona=security` |
| `--depth=[1-5]` | Review thoroughness level | `--depth=5` |
| `--format=[fmt]` | Output format (concise/detailed/json) | `--format=detailed` |
| `--focus=[area]` | Focus on specific area | `--focus=performance` |
| `--save` | Save review to file | `--save` |

### Flag Usage Examples

```bash
/review --persona=security src/auth/
/review --depth=5 --format=detailed staged
/review --focus=performance src/services/heavy-computation.ts
/review --mode=deep-research --save pr
```

### Persona Options

| Persona | Focus Area |
|---------|------------|
| `security` | Vulnerabilities, auth, data protection |
| `performance` | Efficiency, queries, caching |
| `architecture` | Patterns, coupling, SOLID |
| `testing` | Coverage, test quality |
| `accessibility` | A11y compliance |

### Focus Areas

| Focus | Checks |
|-------|--------|
| `security` | OWASP top 10, auth, input validation |
| `performance` | N+1, complexity, memory |
| `quality` | Readability, maintainability |
| `testing` | Coverage, test patterns |

## MCP Integration

This command leverages MCP servers for enhanced code review:

### Playwright - Visual/UI Review
```
For reviewing UI changes:
- Render and screenshot components
- Compare visual changes across browsers
- Verify responsive behavior
- Check accessibility in real browser
```

### Memory - Review Context
```
Store and recall review context:
- Remember past review decisions
- Recall user's coding standards
- Store patterns approved/rejected previously
- Track recurring issues across reviews
```

### Sequential Thinking - Systematic Analysis
```
For thorough code analysis:
- Step through complex logic systematically
- Track multiple concerns in parallel
- Build comprehensive issue list
- Revise severity as context emerges
```

### Filesystem - Code Access
```
For reviewing file changes:
- Use read_file to examine code
- Use search_files to find related patterns
- Check for similar issues across codebase
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Review**
   - [ ] Address critical issues first (security, bugs)
   - [ ] Review recommendations and suggestions
   - [ ] Check if all issues are valid and actionable
   - [ ] Prioritize fixes by severity (Critical → High → Medium → Low)

2. **Next Commands to Use**
   - Use `/fix [issue]` to fix critical and high-priority issues found
   - Use `/refactor [file]` to address code quality issues and recommendations
   - Use `/test [scope]` to add missing tests or improve test coverage
   - Use `/review [file]` again after fixes to verify issues are resolved

3. **Update or Improve**
   - To update: Fix issues and run `/review` again on the same files
   - To improve: Address all recommendations systematically
   - To extend: Review additional files or directories with `/review [path]`

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/fix` | Fix bugs and critical issues | After finding critical/high issues |
| `/refactor` | Improve code structure | For quality improvements and recommendations |
| `/test` | Add missing tests | When tests are missing or coverage is low |
| `/ship` | Commit and create PR | After all critical issues are fixed |
| `/security-scan` | Security audit | Before final review or deployment |

### Common Workflows

**Workflow: Review → Fix → Review Again**
```
/review src/auth/ → /fix "critical issue 1" → /fix "critical issue 2" → /review src/auth/
```

**Workflow: Review → Refactor → Test**
```
/review component.tsx → /refactor component.tsx → /test component.tsx → /review component.tsx
```

**Workflow: Review → Security Scan → Fix**
```
/review src/api/ → /security-scan code → /fix "security issues" → /review src/api/
```

**Workflow: Execute Sub-Plan → Review → Execute Next (Split Plans)**
```
/execute-plan docs/04-plans/FR001/FR001-setup.md → /review "code from setup" → 
/execute-plan docs/04-plans/FR001/FR001-core.md → /review "code from core" → 
/execute-plan docs/04-plans/FR001/FR001-api.md
```

### Tips

- 💡 **Tip**: Fix critical issues before addressing suggestions to avoid re-review
- 💡 **Tip**: Use `--persona=security` for security-focused reviews
- 💡 **Tip**: Use `--save` flag to save review with prefix (RV001, RV002, etc.)
- 💡 **Tip**: If reviewing code from split plan execution, check continuity with previous sub-plans
- 💡 **Tip**: Review code after each sub-plan execution to catch issues early
- ⚠️ **Warning**: Don't skip fixing critical issues before merging or deploying
- ⚠️ **Warning**: Re-review after fixes to ensure issues are truly resolved
- ⚠️ **Warning**: For split plans, ensure code from each sub-plan integrates correctly with previous sub-plans

### File Naming

**Reference**: `.cursor/rules/file-naming-prefix.mdc`

When using `--save` flag without explicit filename:
- Auto-generates: `docs/06-reviews/RV001-[descriptive-name].md`
- Prefix: `RV` (Review)
- Numbers increment sequentially (RV001, RV002, RV003...)

**Example**:
```bash
/review --save src/auth/
# Generates: docs/06-reviews/RV001-auth-code-review.md
```

<!-- CUSTOMIZATION POINT -->
## Variations

Modify behavior via CLAUDE.md:
- Set required review checklist items
- Define severity levels
- Configure approval criteria
- Set documentation requirements

# Review Mode

## Description

Critical analysis mode optimized for code review, auditing, and quality assessment. Emphasizes finding issues, suggesting improvements, and thorough examination.

## When to Use

- Code reviews
- Security audits
- Performance reviews
- Pre-merge checks
- Quality assessments
- Architecture reviews

---

## Behavior

### Communication
- Direct feedback
- Prioritized findings
- Constructive criticism
- Specific, actionable suggestions

### Problem Solving
- Look for issues first
- Question assumptions
- Check edge cases
- Verify against standards

### Output Format
- Categorized findings
- Severity levels
- Line-specific comments
- Improvement suggestions

---

## Review Categories

### Severity Levels

| Level | Icon | Description | Action |
|-------|------|-------------|--------|
| Critical | 🔴 | Bugs, security issues | Must fix before merge |
| Important | 🟠 | Code smells, performance | Should fix |
| Minor | 🟡 | Style, naming | Consider fixing |
| Nitpick | ⚪ | Preferences | Optional |

### Review Areas

| Area | Focus |
|------|-------|
| Correctness | Does it work? Edge cases? |
| Security | Vulnerabilities, data exposure |
| Performance | Efficiency, scalability |
| Maintainability | Readability, complexity |
| Testing | Coverage, quality of tests |
| Standards | Convention compliance |

---

## Output Format

```markdown
## Code Review: [file/PR]

### Summary
[1-2 sentence overview]

### Critical Issues 🔴
1. **[Issue]** (line X)
   - Problem: [description]
   - Fix: [suggestion]

### Important Issues 🟠
1. **[Issue]** (line X)
   - Problem: [description]
   - Suggestion: [improvement]

### Minor Issues 🟡
- Line X: [issue and suggestion]
- Line Y: [issue and suggestion]

### Positive Notes ✅
- [What was done well]

### Verdict
[ ] Ready to merge
[x] Needs changes (N critical, M important issues)
```

---

## Activation

```
Use mode: review
```

Or use command flag:
```
/review --mode=review [file]
/review --persona=security [file]
```

### Persona Options

| Persona | Focus |
|---------|-------|
| `security` | OWASP, vulnerabilities, auth |
| `performance` | Efficiency, caching, queries |
| `architecture` | Patterns, coupling, design |
| `testing` | Coverage, test quality |

---

## Checklist Template

```markdown
### Pre-Review Checklist
- [ ] Tests pass
- [ ] Lint clean
- [ ] No security warnings
- [ ] Coverage maintained

### Review Checklist
- [ ] Logic correctness verified
- [ ] Edge cases handled
- [ ] Error handling adequate
- [ ] Security patterns followed
- [ ] Performance acceptable
- [ ] Code readable/maintainable
- [ ] Tests cover new code
```

---

## MCP Integration

This mode leverages MCP servers for thorough review:

### Playwright
```
For UI/frontend reviews:
- Render and verify visual changes
- Test responsive behavior
- Check accessibility
- Capture screenshots for comparison
```

### Sequential Thinking
```
For systematic code analysis:
- Step through logic methodically
- Track multiple concerns
- Build comprehensive issue list
```

### Memory
```
Apply consistent review standards:
- Recall past review decisions
- Remember approved patterns
- Track recurring issues
```

### Filesystem
```
For thorough code examination:
- Use read_file to examine code
- Use search_files to find related patterns
- Check consistency across codebase
```

## Combines Well With

- `/review` command
- Deep research mode (for thorough audits)
- Security auditor agent
- Code reviewer agent

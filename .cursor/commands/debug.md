# /debug - Debug Command

## Purpose

Analyze and debug an error, exception, or unexpected behavior.

## Usage

```
/debug [error message or description]
```

---

Debug issue: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/debug`)
- Preferred skills: `investigate-root-cause`, `evidence-driven-debugging`, `methodology-systematic-debugging`
- Recommended agent: `investigator`

## Minimal-Change Guardrails (Mandatory)

1. **Debug First, Edit Later**
   - Do not change code until a root-cause hypothesis is confirmed by evidence.

2. **Patch the Fault Line**
   - Fix only the location that creates the bug.
   - Avoid broad refactors while debugging.

3. **One Bug, One Patch**
   - Keep the debug fix scoped to the reported issue.
   - Track additional findings as separate follow-up tasks.

4. **No Silent Scope Creep**
   - If fix requires touching multiple modules, explain why before editing.

## Workflow

### Step 1: Analyze Error

1. Parse error message and stack trace
2. Identify error location
3. Understand error type

### Step 2: Investigate

1. Trace execution path
2. Check related code
3. Form hypotheses

### Step 3: Fix

1. Implement minimal fix
2. Verify fix works
3. Add regression test
4. Do not include unrelated cleanup in the same patch

## Output

```markdown
## Debug Report

### Error
[Error message]

### Root Cause
[Explanation]

### Fix
[Code changes]

### Scope Control
- Files changed are only those needed to resolve root cause

### Prevention
[Test added]
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Verify the Fix**
   - [ ] Confirm error no longer occurs
   - [ ] Run regression test to verify fix
   - [ ] Test related functionality for side effects
   - [ ] Review fix doesn't introduce new issues

2. **Next Commands to Use**
   - Use `/test [file]` to add or update regression tests
   - Use `/fix [error]` if similar issues found
   - Use `/review [file]` to review the fix quality
   - Use `/ship [message]` when fix is verified
   - Use `/commit [message]` to commit the fix

3. **Update or Improve**
   - To update: Add more tests or improve fix
   - To improve: Prevent similar issues in other code
   - To extend: Use `/fix` to address related issues

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/test` | Add regression tests | After fixing to prevent recurrence |
| `/fix` | Fix similar issues | If related bugs are found |
| `/review` | Review fix quality | To verify fix is correct |
| `/ship` | Commit and create PR | When fix is verified |
| `/commit` | Commit fix | To save the fix |

### Common Workflows

**Workflow: Debug → Fix → Test → Ship**
```
/debug "error" → /fix "issue" → /test "regression" → /ship "fix: resolve error"
```

**Workflow: Debug → Review → Fix → Ship**
```
/debug "bug" → /review "root cause" → /fix "issue" → /ship "fix: bug"
```

### Tips

- 💡 **Tip**: Always add regression tests after fixing bugs
- 💡 **Tip**: Understand root cause before fixing
- 💡 **Tip**: Test related functionality for side effects
- ⚠️ **Warning**: Don't fix symptoms - fix root cause
- ⚠️ **Warning**: Ensure fix doesn't break other functionality

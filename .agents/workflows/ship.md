---
description: Ship Code Command
---


## Purpose

Complete workflow to commit changes, run reviews, execute tests, and create a pull request ready for merge.

## Usage

```
/ship [commit message or 'quick']
```

## Arguments

- `$ARGUMENTS`:
  - Commit message: Use as commit subject
  - `quick`: Auto-generate message, skip review

---

Ship the current changes with: **$ARGUMENTS**

## Workflow

### Phase 1: Pre-Ship Checks

1. **Check Repository Status**
   ```bash
   git status
   git diff --staged
   ```

2. **Identify Changes**
   - Files modified
   - Files added
   - Files deleted

3. **Quick Validation**
   - No secrets in changes
   - No debug statements
   - No commented-out code

### Phase 2: Code Review (unless 'quick')

1. **Run Self-Review**
   - Check code quality
   - Verify style compliance
   - Identify security issues

2. **Address Critical Issues**
   - Fix any critical problems
   - Note recommendations

### Phase 3: Run Tests

1. **Execute Test Suite**
   ```bash
   # Python
   pytest -v

   # TypeScript
   pnpm test
   ```

2. **Verify All Pass**
   - No failing tests
   - No new warnings

3. **Check Coverage**
   - Coverage not decreased
   - New code is tested

### Phase 4: Create Commit

1. **Stage Changes**
   ```bash
   git add -A
   ```

2. **Generate Commit Message**
   - Follow conventional commit format
   - Reference issues if applicable

3. **Create Commit**
   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): subject

   body

   🤖 Generated with [Cursor IDE](https://cursor.sh)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

### Phase 5: Push and Create PR

1. **Push to Remote**
   ```bash
   git push -u origin [branch-name]
   ```

2. **Create Pull Request**
   ```bash
   gh pr create --title "type(scope): description" --body "$(cat <<'EOF'
   ## Summary
   - Change 1
   - Change 2

   ## Test Plan
   - [ ] Tests pass
   - [ ] Manual testing

   🤖 Generated with [Cursor IDE](https://cursor.sh)
   EOF
   )"
   ```

## Output

### Ship Report

```markdown
## Ship Complete

### Commit
**Hash**: `abc1234`
**Message**: `feat(auth): add password reset functionality`

### Changes
| File | Change |
|------|--------|
| `src/auth/reset.ts` | Added |
| `src/auth/routes.ts` | Modified |
| `tests/auth/reset.test.ts` | Added |

### Checks
- [x] Code review passed
- [x] Tests passing (42 tests)
- [x] Coverage: 85% (+3%)
- [x] No security issues

### Pull Request
**URL**: https://github.com/org/repo/pull/123
**Title**: feat(auth): add password reset functionality
**Base**: main
**Status**: Ready for review

---

## Next Steps & User Guidance

### Immediate Actions

1. **Verify the Ship**
   - [ ] Review PR description is complete and clear
   - [ ] Confirm all changes are correct and tested
   - [ ] Check CI/CD checks are passing
   - [ ] Verify no secrets or sensitive data in PR

2. **Next Commands to Use**
   - Request review from team members on the PR
   - Use `/review [file]` to review specific files if needed
   - Use `/fix [error]` to address any feedback or issues
   - Use `/commit` to add more commits if needed
   - Monitor PR status and address feedback

3. **Update or Improve**
   - To update: Add more commits to the PR branch
   - To improve: Address review feedback with `/fix` or new commits
   - To extend: Add more features or improvements to the PR

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/review` | Review code quality | After shipping to verify PR quality |
| `/fix` | Fix issues | When addressing PR feedback |
| `/commit` | Add more commits | To update PR with additional changes |
| `/pr` | Manage PR | To update PR description or check status |

### Common Workflows

**Workflow: Ship → Review → Fix → Merge**
```
/ship "feat: feature" → /review "PR code" → /fix "feedback" → Merge PR
```

**Workflow: Ship → Monitor → Address Feedback**
```
/ship "fix: bug" → Monitor PR → /fix "review comments" → Merge
```

### Tips

- 💡 **Tip**: Always review PR before requesting reviews
- 💡 **Tip**: Use `/fix` to quickly address PR feedback
- 💡 **Tip**: Keep PRs focused and small for easier review
- ⚠️ **Warning**: Don't merge PRs without review approval
- ⚠️ **Warning**: Ensure all CI/CD checks pass before merging
```

## Quick Ship Mode

When using `/ship quick`:
- Skip detailed code review
- Auto-generate commit message
- Minimal output

```bash
# Quick ship for small changes
/ship quick
```

## Commit Message Generation

Based on changes, generate appropriate message:

### Feature
```
feat(scope): add [feature]

- Added [component/function]
- Implemented [functionality]
- Added tests for [scenarios]
```

### Bug Fix
```
fix(scope): resolve [issue]

- Fixed [bug description]
- Added null check for [case]
- Updated tests
```

### Refactor
```
refactor(scope): improve [area]

- Extracted [logic] to [location]
- Renamed [old] to [new]
- Simplified [complex code]
```

## Pre-Ship Checklist

- [ ] All changes staged
- [ ] No unintended files included
- [ ] Tests pass
- [ ] No secrets in code
- [ ] No debug statements
- [ ] Commit message is descriptive
- [ ] PR description is complete

<!-- CUSTOMIZATION POINT -->
## Variations

Modify behavior via CLAUDE.md:
- Required checks before ship
- Commit message format
- PR template requirements
- Auto-merge settings

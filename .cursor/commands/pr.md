# /pr - Create Pull Request

## Purpose

Create a well-documented pull request with proper description and checks.

## Usage

```
/pr [title or 'auto']
```

---

Create a pull request: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/pr`)
- Preferred skills: `code-review-loop`, `verification-gate`
- Recommended agents:
  - `code-reviewer` for pre-PR quality check
  - `security-auditor` for sensitive diffs

## Workflow

### Step 1: Prepare Changes

```bash
git status
git diff main...HEAD
```

### Step 2: Verify Ready

- [ ] All tests passing
- [ ] Code reviewed
- [ ] No merge conflicts
- [ ] Branch pushed

### Step 3: Create PR

```bash
gh pr create --title "type(scope): description" --body "$(cat <<'EOF'
## Summary
- [Change 1]
- [Change 2]

## Test Plan
- [ ] Unit tests
- [ ] Manual testing

## Screenshots
[If applicable]

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes

🤖 Generated with [Cursor IDE](https://cursor.sh)
EOF
)"
```

## Output

```markdown
## Pull Request Created

**URL**: https://github.com/org/repo/pull/123
**Title**: feat(auth): add OAuth support
**Base**: main ← feature/oauth

### Changes
- 5 files changed
- +234 -12 lines
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Pull Request**
   - [ ] Verify PR description is complete
   - [ ] Check all changes are correct
   - [ ] Confirm CI/CD checks are passing
   - [ ] Review PR for any issues

2. **Next Commands to Use**
   - Request review from team members
   - Use `/review [file]` to review specific files
   - Use `/fix [error]` to address review feedback
   - Use `/commit` to add more commits if needed
   - Monitor PR status and address feedback

3. **Update or Improve**
   - To update: Add more commits to address feedback
   - To improve: Update PR description or add more context
   - To extend: Add more changes to the PR

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/review` | Review PR code | To verify code quality |
| `/fix` | Fix review feedback | When addressing comments |
| `/commit` | Add commits | To update PR with changes |
| `/ship` | Complete PR workflow | Alternative to /pr + /commit |

### Common Workflows

**Workflow: PR → Review → Fix → Merge**
```
/pr "feat: feature" → /review "PR" → /fix "feedback" → Merge
```

**Workflow: PR → Address Feedback → Merge**
```
/pr "fix: bug" → Address feedback → /commit "updates" → Merge
```

### Tips

- 💡 **Tip**: Write clear PR descriptions for easier review
- 💡 **Tip**: Address review feedback promptly
- 💡 **Tip**: Keep PRs focused and small
- ⚠️ **Warning**: Don't merge without review approval
- ⚠️ **Warning**: Ensure all CI/CD checks pass before merging

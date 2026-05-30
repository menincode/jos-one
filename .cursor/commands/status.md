# /status - Project Status Command

## Purpose

Get current project status including tasks, git state, and recent activity.

## Usage

```
/status
```

---

Show current project status.

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/status`)
- Preferred skill: `verification-gate`
- Recommended agent: `generalPurpose`

## Workflow

1. **Check Git Status**
   ```bash
   git status
   git log --oneline -5
   ```

2. **Review Todos**
   - In progress
   - Pending
   - Completed today

3. **Recent Activity**
   - Recent commits
   - Open PRs
   - Open issues

## Output

```markdown
## Project Status

### Git
- Branch: `feature/xyz`
- Status: Clean / X modified files

### Tasks
- In Progress: X
- Pending: Y
- Completed: Z

### Recent Commits
1. [commit message]
2. [commit message]

### Open PRs
- #123: [title]
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Status**
   - [ ] Check git status for uncommitted changes
   - [ ] Review in-progress tasks
   - [ ] Check open PRs and issues
   - [ ] Plan next actions based on status

2. **Next Commands to Use**
   - Use `/commit [message]` if there are uncommitted changes
   - Use `/ship [message]` to commit and create PR
   - Use `/checkpoint save [name]` to save current state
   - Use `/plan [task]` to plan next work
   - Use `/feature [description]` to start new feature

3. **Update or Improve**
   - To update: Continue with current tasks
   - To improve: Clean up or organize work
   - To extend: Plan and start new work

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/commit` | Commit changes | If there are uncommitted changes |
| `/ship` | Ship work | When work is ready |
| `/checkpoint` | Save state | To preserve current work |
| `/plan` | Plan work | To plan next tasks |
| `/feature` | Start feature | To begin new work |

### Common Workflows

**Workflow: Status → Commit → Ship**
```
/status → /commit "fix: issue" → /ship "fix: resolve"
```

**Workflow: Status → Plan → Feature**
```
/status → /plan "new feature" → /feature "implement"
```

### Tips

- 💡 **Tip**: Check status regularly to stay organized
- 💡 **Tip**: Commit work frequently to avoid losing changes
- 💡 **Tip**: Use checkpoints before switching tasks
- ⚠️ **Warning**: Don't leave uncommitted work for too long
- ⚠️ **Warning**: Review status before starting new work

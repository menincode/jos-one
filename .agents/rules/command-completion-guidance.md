---
description: Standard user guidance section to add after command completion
alwaysApply: true
---

# Command Completion User Guidance

## Overview

All commands **MUST** include a user guidance section after completion to help users understand:
- What to do next
- Related commands to use
- How to update or improve the output
- Common follow-up actions

## Standard Template

### Required Section: "Next Steps & User Guidance"

Add this section at the end of command output (after main content, before flags/MCP sections):

```markdown
---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Output**
   - [ ] Check [specific aspects to review]
   - [ ] Verify [specific validations]
   - [ ] Confirm [specific confirmations]

2. **Next Commands to Use**
   - Use `/command1` to [purpose] - [when to use]
   - Use `/command2` to [purpose] - [when to use]
   - Use `/command3` to [purpose] - [when to use]

3. **Update or Improve**
   - To update: [how to update]
   - To improve: [how to improve]
   - To extend: [how to extend]

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/command1` | [Description] | [When] |
| `/command2` | [Description] | [When] |
| `/command3` | [Description] | [When] |

### Common Workflows

**Workflow 1: [Name]**
```
/current-command → /next-command → /final-command
```

**Workflow 2: [Name]**
```
/current-command → /alternative-command → /follow-up
```

### Tips

- 💡 **Tip 1**: [Helpful tip]
- 💡 **Tip 2**: [Helpful tip]
- ⚠️ **Warning**: [Important warning if applicable]
```

## Command-Specific Templates

### For `/plan` Command

```markdown
---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Plan**
   - [ ] Verify all tasks are clear and actionable
   - [ ] Check time estimates are realistic
   - [ ] Confirm dependencies are correct
   - [ ] Review risks and mitigation strategies

2. **Next Commands to Use**
   - Use `/review-plan` to review and improve the plan
   - Use `/execute-plan` to start implementing (for detailed plans)
   - Use `/feature` to implement features from the plan
   - Use `/test` to generate tests for planned features

3. **Update or Improve**
   - To update: Edit the plan file directly or use `/plan` again with modifications
   - To improve: Use `/review-plan [plan-file]` for suggestions
   - To extend: Add new tasks to the plan file

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/review-plan` | Review and improve plan quality | After creating plan |
| `/execute-plan` | Execute plan with subagents | For detailed plans (2-5 min tasks) |
| `/feature` | Implement features | When ready to code |
| `/test` | Generate tests | Before or during implementation |

### Common Workflows

**Workflow: Plan → Review → Execute**
```
/plan "feature" → /review-plan docs/04-plans/FR001-feature.md → /execute-plan docs/04-plans/FR001-feature.md
```

**Workflow: Plan → Feature Development**
```
/plan "feature" → /feature "implement from plan" → /test → /review
```

### Tips

- 💡 **Tip**: Use `--detailed` flag for superpowers-style plans with 2-5 minute tasks
- 💡 **Tip**: Review plans with `/review-plan` before starting implementation
- ⚠️ **Warning**: Don't skip plan review - it catches issues early
```

### For `/review` Command

```markdown
---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Review**
   - [ ] Address critical issues first
   - [ ] Review recommendations and suggestions
   - [ ] Check if all issues are valid
   - [ ] Prioritize fixes by severity

2. **Next Commands to Use**
   - Use `/fix` to fix critical issues found
   - Use `/refactor` to address code quality issues
   - Use `/test` to add missing tests
   - Use `/review` again after fixes to verify

3. **Update or Improve**
   - To update: Fix issues and run `/review` again
   - To improve: Address all recommendations
   - To extend: Review additional files or directories

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/fix` | Fix bugs and issues | After finding issues |
| `/refactor` | Improve code structure | For quality improvements |
| `/test` | Add missing tests | When tests are missing |
| `/ship` | Commit and create PR | After all issues fixed |

### Common Workflows

**Workflow: Review → Fix → Review Again**
```
/review src/auth/ → /fix "issue 1" → /fix "issue 2" → /review src/auth/
```

**Workflow: Review → Refactor → Test**
```
/review component.tsx → /refactor component.tsx → /test component.tsx
```

### Tips

- 💡 **Tip**: Fix critical issues before addressing suggestions
- 💡 **Tip**: Use `--persona=security` for security-focused reviews
- ⚠️ **Warning**: Don't skip fixing critical issues before merging
```

### For `/test` Command

```markdown
---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Tests**
   - [ ] Verify tests cover all scenarios
   - [ ] Check test names are descriptive
   - [ ] Confirm edge cases are covered
   - [ ] Run tests to ensure they pass

2. **Next Commands to Use**
   - Use `/review` to review test quality
   - Use `/tdd` for test-driven development workflow
   - Use `/feature` to implement features with tests
   - Use `/fix` if tests reveal bugs

3. **Update or Improve**
   - To update: Edit test files directly
   - To improve: Add more test cases or improve coverage
   - To extend: Add integration or E2E tests

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/tdd` | Test-driven development | For new features |
| `/review` | Review test quality | After generating tests |
| `/feature` | Full feature with tests | When implementing features |
| `/fix` | Fix bugs found by tests | When tests fail |

### Common Workflows

**Workflow: TDD Development**
```
/tdd "feature" → Tests generated → Implementation → Tests pass
```

**Workflow: Test → Review → Fix**
```
/test src/service.ts → /review tests/ → /fix "test failures"
```

### Tips

- 💡 **Tip**: Use `/tdd` for critical features to ensure test coverage
- 💡 **Tip**: Review generated tests before running to understand them
- ⚠️ **Warning**: Always run tests after generation to verify they work
```

## Implementation Requirements

### When to Add

**ALWAYS** add this section when:
- Command generates output (files, code, documentation)
- Command completes a workflow phase
- User needs guidance on next steps

### Where to Add

- **After main output content**
- **Before Flags section** (if exists)
- **Before MCP Integration section** (if exists)
- **As last section** if no other sections follow

### Customization

- Adapt template to command-specific needs
- Include command-specific workflows
- Add relevant tips and warnings
- Reference actual command names and examples

## Examples in Commands

### Good Example

```markdown
## Output

[Main output content here]

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Plan**
   - [ ] Verify tasks are clear
   - [ ] Check dependencies

2. **Next Commands to Use**
   - Use `/execute-plan` to start implementation
   - Use `/review-plan` to improve the plan

### Related Commands

| Command | Purpose |
|---------|---------|
| `/execute-plan` | Execute this plan |
| `/review-plan` | Review plan quality |
```

### Bad Example (Missing)

```markdown
## Output

[Main output content here]

## Flags

[Flags section]
```

**Problem**: No user guidance after completion.

---

## Checklist for Command Authors

When creating/updating commands, ensure:

- [ ] "Next Steps & User Guidance" section exists
- [ ] Immediate actions are listed
- [ ] Related commands are documented
- [ ] Common workflows are provided
- [ ] Tips and warnings are included
- [ ] Examples use actual command names
- [ ] Section is placed correctly (after output, before flags)

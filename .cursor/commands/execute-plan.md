# /execute-plan - Subagent-Driven Plan Execution

## Purpose

Execute a detailed implementation plan using fresh subagents per task with mandatory code review gates between tasks.

## Usage

```
/execute-plan [plan-file-path]
```

## Arguments

- `$ARGUMENTS`: Path to the plan file (created with `/plan --detailed`)

---

Execute plan from: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/execute-plan`)
- Preferred skills: `methodology-executing-plans`, `verification-gate`
- Recommended agents:
  - `generalPurpose` for task execution
  - `code-reviewer` for between-task review gates
  - `tester` for test-focused tasks

## Methodology

**Reference**: `.cursor/rules/skills/methodology/executing-plans/skill.mdc`

This command uses the superpowers execution methodology for quality-gated implementation.

## Core Pattern

**"Fresh subagent per task + review between tasks = high quality, fast iteration"**

### Why Fresh Agents?

- Prevents context pollution between tasks
- Each task gets focused attention
- Failures don't cascade
- Easier to retry individual tasks

### Why Code Review Between Tasks?

- Catches issues early
- Ensures code matches intent
- Prevents technical debt accumulation
- Creates natural checkpoints

## Workflow

### Step 1: Load Plan and Learn Context

1. **Read the Plan File**

   - Load plan content
   - Understand task structure and dependencies
   - Note files mentioned in plan

2. **Study Existing Code** (if applicable)

   - **Read Similar Implementations**

     - If plan mentions similar features, read those files
     - Focus on code that will be extended or modified
     - Note patterns used in related code

   - **Analyze Code Style**

     - Review naming conventions in existing code
     - Note code structure patterns
     - Understand error handling approaches
     - Check testing patterns used

   - **Extract Conventions to Follow**
     - Document style guide for implementation
     - List patterns to maintain consistency
     - Note any deviations needed

3. **Verify Plan is Complete and Approved**

   - Check all required sections present
   - Verify task dependencies are clear
   - Confirm files to create/modify are listed

4. **Create TodoWrite with All Tasks**
   - Add all tasks from plan
   - Set initial status to `pending`
   - Set first task to `in_progress`

### Step 2: Execute Task (For Each Task)

```markdown
1. Dispatch fresh subagent with task details
2. Subagent implements following TDD cycle:
   - Write failing test
   - Verify test fails
   - Implement minimally
   - Verify test passes
   - Commit
3. Subagent returns completion summary
```

### Step 3: Code Review

After each task:

```markdown
1. Dispatch code-reviewer subagent
2. Review scope: only changes from current task
3. Reviewer returns findings:
   - Critical: Must fix before proceeding
   - Important: Should fix before proceeding
   - Minor: Can fix later
```

### Step 4: Handle Review Findings

```markdown
IF Critical or Important issues found:

1. Dispatch fix subagent for each issue
2. Re-request code review
3. Repeat until no Critical/Important issues

IF only Minor issues:

1. Note for later cleanup
2. Proceed to next task
```

### Step 5: Mark Complete

1. Update TodoWrite - mark task completed
2. Move to next task
3. Repeat from Step 2

### Step 6: Final Review

After all tasks complete:

1. Dispatch comprehensive code review
2. Review entire implementation against plan
3. Verify all success criteria met
4. Run full test suite
5. Use `finishing-development-branch` skill

### Step 7: Update README.md

After execution completes successfully:

1. **Read Current README.md**

   - Load `README.md` from project root
   - Parse existing structure
   - Identify where to add implementation updates

2. **Extract Implementation Summary**

   - Plan name and description (from plan file)
   - Plan file path (for reference)
   - Files created (from execution summary)
   - Files modified (from execution summary)
   - Tasks completed count
   - Test coverage (if available)
   - Completion date

3. **Update README.md**

   - **Add/Update "Implemented Features" Section** (if doesn't exist, create it):

     - Add new entry with plan name, description, status, date
     - Link to plan file
     - List key files created/modified
     - Note test coverage if available

   - **For Split Plans**:

     - Add entry for each completed sub-plan
     - Link to sub-plan file
     - Note parent plan reference
     - Track overall progress (e.g., "FR001: 2/4 sub-plans completed")

   - **Format**:

     ```markdown
     ## Implemented Features

     ### [Feature Name] - [Date]

     - **Plan**: [plan-file-path]
     - **Status**: ✅ Completed
     - **Files Created**: [list]
     - **Files Modified**: [list]
     - **Tests**: [coverage if available]
     - **Notes**: [any relevant notes]
     ```

4. **Save Updated README.md**
   - Preserve existing structure and content
   - Add new implementation entry
   - Maintain chronological order (newest first)
   - Commit README.md update if in git repository

## Critical Rules

### Never Skip Code Reviews

Every task must be reviewed before proceeding. No exceptions.

### Never Proceed with Critical Issues

Critical issues must be fixed:

```
implement → review → fix critical → re-review → proceed
```

### Never Run Parallel Implementation

Tasks run sequentially:

```
WRONG: Run Task 1, 2, 3 simultaneously
RIGHT: Task 1 → Review → Task 2 → Review → Task 3 → Review
```

### Always Read Plan Before Implementing

```
WRONG: Start coding based on memory of plan
RIGHT: Read plan file, extract task details, then implement
```

## Error Handling

### Task Fails

1. Capture error details
2. Attempt fix (max 2 retries)
3. If still failing, pause execution
4. Report to user with:
   - Which task failed
   - Error details
   - Suggested resolution
5. Wait for user decision

### Review Finds Major Issues

1. List all Critical/Important issues
2. Dispatch fix subagent for each
3. Re-run code review
4. If issues persist after 2 cycles:
   - Pause execution
   - Report to user
   - May need plan revision

## Output

### Progress Updates

```markdown
## Execution Progress

### Task 1: Create User model ✓

- Files modified: src/models/user.ts
- Tests added: 3
- Review: Passed

### Task 2: Add validation ✓

- Files modified: src/models/user.ts
- Tests added: 2
- Review: Passed (1 minor deferred)

### Task 3: Create endpoint [IN PROGRESS]

- Status: Implementing...
```

### Completion Summary

```markdown
## Execution Complete

### Summary

- Tasks completed: 8/8
- Tests added: 24
- Coverage: 92%

### Files Created

- src/models/user.ts
- src/services/user-service.ts
- src/routes/user.ts

### Files Modified

- src/routes/index.ts
- src/types/index.ts

### Deferred Items

- Minor: Variable rename in user-service.ts line 12

### Next Steps

- Run full test suite
- Use /ship to create PR
- README.md has been updated with implementation details
```

## Prerequisites

Before using this command:

1. Plan file exists and is complete
2. Plan was created with `/plan --detailed`
3. Plan has been reviewed and approved
4. Tests can be run (`npm test` or `pytest`)

## Related Commands

- `/plan --detailed` - Create detailed plan
- `/brainstorm` - Design before planning
- `/ship` - Create PR after execution
- `/review-plan` - Review plan before execution
- `/review` - Review code after execution

## README.md Updates

After successful execution, `/execute-plan` automatically updates `README.md` with:

- **Implemented Features Section**: New entry with plan details
- **Plan Reference**: Link to plan file for future reference
- **Files Summary**: List of created and modified files
- **Status Tracking**: Completion status and date
- **For Split Plans**: Progress tracking for sub-plans

The README.md update includes:

- Feature name and description
- Plan file path (for reference)
- Completion date
- Files created/modified
- Test coverage (if available)
- Status (✅ Completed)

**Example README.md Entry**:

```markdown
## Implemented Features

### User Authentication System - 2025-01-29

- **Plan**: `docs/04-plans/FR001-user-authentication.md`
- **Status**: ✅ Completed
- **Files Created**:
  - `src/models/user.ts`
  - `src/services/user-service.ts`
  - `src/routes/user.ts`
- **Files Modified**:
  - `src/routes/index.ts`
  - `src/types/index.ts`
- **Tests**: 24 tests, 92% coverage
- **Notes**: OAuth2 integration ready for next phase

### Payment Integration (Split Plan) - 2025-01-29

- **Plan**: `docs/04-plans/FR002/` (Split Plan)
- **Status**: 🟡 In Progress (2/4 sub-plans completed)
- **Completed Sub-Plans**:
  - ✅ `FR002-setup.md` - Database models and config
  - ✅ `FR002-core.md` - Business logic
  - 🟡 `FR002-api.md` - API endpoints (in progress)
  - ⏳ `FR002-integration.md` - Frontend integration (pending)
- **Files Created**:
  - `src/models/payment.ts`
  - `src/services/payment-service.ts`
- **Files Modified**:
  - `src/config/database.ts`
```

**Note**: README.md is updated automatically after successful execution. Manual edits are preserved.

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Execution**

   - [ ] Verify all tasks completed successfully
   - [ ] Check test coverage meets requirements
   - [ ] Review code changes
   - [ ] Confirm README.md was updated correctly
   - **For Split Plans**: [ ] Verify sub-plan status in README.md

2. **Next Commands to Use**

   - Use `/review [files]` to review the implemented code
   - Use `/test` to run full test suite
   - Use `/ship [message]` to commit and create PR
   - **For Split Plans**: Continue with next sub-plan using `/execute-plan [next-sub-plan]`
   - Use `/review-plan` to review next sub-plan before execution

3. **Update or Improve**
   - To update: Edit code directly or create new plan for improvements
   - To improve: Use `/refactor` for code quality improvements
   - To extend: Create new plan for additional features

### Related Commands

| Command         | Purpose                 | When to Use                                  |
| --------------- | ----------------------- | -------------------------------------------- |
| `/review`       | Review implemented code | After execution to verify quality            |
| `/test`         | Run full test suite     | After execution to verify tests pass         |
| `/ship`         | Commit and create PR    | After review and tests pass                  |
| `/review-plan`  | Review next sub-plan    | Before executing next sub-plan (split plans) |
| `/execute-plan` | Execute next sub-plan   | For split plans, continue with next sub-plan |

### Common Workflows

**Workflow: Execute → Review → Ship (Single Plan)**

```
/execute-plan docs/04-plans/FR001-feature.md → /review "code" → /test → /ship "feat: add feature"
```

**Workflow: Execute Sub-Plans Step-by-Step (Split Plan)**

```
/execute-plan docs/04-plans/FR001/FR001-setup.md →
/review "setup code" →
/execute-plan docs/04-plans/FR001/FR001-core.md →
/review "core code" →
/execute-plan docs/04-plans/FR001/FR001-api.md →
/review "api code" →
/execute-plan docs/04-plans/FR001/FR001-integration.md →
/review "integration" → /test → /ship "feat: complete feature"
```

**Workflow: Execute → Review → Fix → Ship**

```
/execute-plan docs/04-plans/feature.md → /review "code" → /fix "issues" → /review "fixed code" → /ship
```

### Tips

- 💡 **Tip**: Review README.md after execution to verify it was updated correctly
- 💡 **Tip**: For split plans, README.md tracks progress across all sub-plans
- 💡 **Tip**: Use `/review` after each sub-plan execution to catch issues early
- 💡 **Tip**: README.md updates are automatic - manual edits are preserved
- ⚠️ **Warning**: Always review code before shipping, even if execution completed successfully
- ⚠️ **Warning**: For split plans, ensure previous sub-plans are complete before executing next
- ⚠️ **Warning**: Verify README.md update if execution was interrupted or had errors

### README.md Update Details

**What Gets Updated**:

- New "Implemented Features" section (if doesn't exist)
- Feature entry with plan reference, files, status, date
- For split plans: Progress tracking (X/Y sub-plans completed)

**What Gets Preserved**:

- All existing README.md content
- Manual edits and custom sections
- Existing formatting and structure

**Manual Override**:

- You can manually edit README.md entries
- Format: Follow the example format shown above
- Location: Add "Implemented Features" section after "Features" or "Quick Start" section

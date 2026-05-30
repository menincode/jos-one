# /review-plan - Implementation Plan Review Command

## Purpose

Review implementation plans for completeness, accuracy, feasibility, and quality. Ensures plans are ready for execution with `/execute-plan`.

## Usage

```
/review-plan [plan file path | plan directory | 'latest' | 'all']
```

## Arguments

- `$ARGUMENTS`:
  - **Plan file path**: Review specific plan file (e.g., `docs/04-plans/auth.md`)
  - **Plan directory**: Review split plan (e.g., `docs/04-plans/FR001/` or `docs/04-plans/FR001/index.md`)
  - **Sub-plan file**: Review specific sub-plan (e.g., `docs/04-plans/FR001/FR001-setup.md`)
  - `latest`: Review the most recently modified plan in `docs/04-plans/` directory
  - `all`: Review all sub-plans in a split plan (if directory provided)
  - If omitted: Find and review latest plan in `docs/04-plans/` directory

---

Review implementation plan: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/review-plan`)
- Preferred skills: `plan-review`, `plan-review-architecture`, `plan-review-experience`
- Recommended agents: `architect`, `experience-reviewer`

## Workflow

### Phase 1: Locate and Load Plan

1. **Find Plan File**
   - If path provided: Read specified plan file
   - If `latest` or no argument: Find most recently modified `.md` file in `docs/04-plans/` directory
   - Verify file exists and is readable
   - **Check if it's a split plan**: If path is a directory (e.g., `docs/04-plans/FR001/`), look for `index.md`

2. **Detect Plan Type**
   - **Single Plan**: Single `.md` file with all tasks
   - **Split Plan**: Directory with `index.md` and sub-plan files (e.g., `FR001-setup.md`, `FR001-core.md`)
   - **Sub-Plan**: Individual sub-plan file within a split plan directory

3. **Load Plan Content**
   - **Single Plan**: Read entire plan document
   - **Split Plan (index)**: Read `index.md` and all sub-plan files
   - **Sub-Plan**: Read the specific sub-plan file and reference `index.md` for context
   - Parse structure (Summary, Scope, Tasks, Files, Dependencies, Risks, etc.)
   - Identify plan type (feature, bug fix, refactor, migration)

### Phase 2: Structure and Completeness Review

**For Single Plans**:
1. **Required Sections Check**
   - [ ] Summary present and clear
   - [ ] Scope defined (In Scope / Out of Scope)
   - [ ] Assumptions documented
   - [ ] Tasks listed with sizes
   - [ ] Dependencies identified
   - [ ] Files to create/modify listed
   - [ ] Risks identified with mitigation
   - [ ] Success criteria defined

2. **Section Quality**
   - Summary: 2-3 sentences, clear overview
   - Scope: Explicit boundaries, no ambiguity
   - Assumptions: All key assumptions listed
   - Tasks: Well-structured, numbered, sized appropriately

**For Split Plans**:
1. **Index Plan Review**
   - [ ] Index plan (`index.md`) exists and is complete
   - [ ] Overview section explains the split structure
   - [ ] Sub-plans table lists all sub-plans with execution order
   - [ ] Shared context section documents models, types, configs
   - [ ] Integration points are clearly mapped
   - [ ] Data flow and logic flow are documented
   - [ ] Execution order is clear and sequential

2. **Sub-Plan Structure Review**
   - [ ] Each sub-plan has clear name and purpose
   - [ ] Dependencies between sub-plans are documented
   - [ ] Each sub-plan lists what it delivers (for next sub-plans)
   - [ ] Integration notes explain connections to previous/next sub-plans
   - [ ] Sub-plans are independently executable

3. **Continuity Review** (Critical for Split Plans)
   - **Code Continuity**:
     * [ ] Shared files/modules are documented in index
     * [ ] Import dependencies are clear between sub-plans
     * [ ] Naming conventions are consistent across sub-plans
     * [ ] File creation/modification is tracked per sub-plan
   
   - **Data Continuity**:
     * [ ] Data models created in earlier sub-plans are documented
     * [ ] Data flow (Setup → Core → API → Integration) is clear
     * [ ] Database schema changes are tracked
     * [ ] Shared data structures (types, interfaces, DTOs) are listed
   
   - **Integration Continuity**:
     * [ ] Integration points between sub-plans are documented
     * [ ] APIs/services exposed by one sub-plan for the next are listed
     * [ ] Shared configuration is identified
     * [ ] Testing contracts are clear
   
   - **Logic Flow Continuity**:
     * [ ] Business logic flows correctly across sub-plans
     * [ ] Validation rules propagate correctly (Setup → Core → API)
     * [ ] Error handling patterns are consistent
     * [ ] Architectural patterns are maintained

### Phase 3: Task Analysis

**For Single Plans**:
1. **Task Quality**
   - [ ] Tasks are atomic (15-60 min for standard, 2-5 min for detailed)
   - [ ] Each task has clear completion criteria
   - [ ] Task descriptions are specific, not vague
   - [ ] Tasks are ordered logically

2. **Task Sizing**
   - [ ] Sizes are realistic (S: <30min, M: 30-60min, L: 1-2h, XL: 2-4h)
   - [ ] Complex tasks broken down appropriately
   - [ ] Time estimates match task complexity

3. **Dependencies**
   - [ ] All dependencies are valid (referenced tasks exist)
   - [ ] No circular dependencies
   - [ ] Critical path is clear
   - [ ] Parallel opportunities identified

**For Split Plans**:
1. **Sub-Plan Task Quality**
   - [ ] Each sub-plan has appropriate number of tasks (not too many, not too few)
   - [ ] Tasks within each sub-plan are atomic and well-sized
   - [ ] Each sub-plan has clear completion criteria
   - [ ] Sub-plan descriptions are specific

2. **Inter-Sub-Plan Dependencies**
   - [ ] Dependencies between sub-plans are valid and documented
   - [ ] No circular dependencies between sub-plans
   - [ ] Execution order is clear and sequential
   - [ ] Each sub-plan clearly states what it depends on
   - [ ] Each sub-plan clearly states what it delivers for next sub-plans

3. **Task Distribution**
   - [ ] Tasks are logically grouped into sub-plans
   - [ ] Each sub-plan is cohesive (tasks work together)
   - [ ] Sub-plans are independent enough to execute separately
   - [ ] Total task count across all sub-plans matches original scope

### Phase 4: Feasibility Review

1. **Technical Feasibility**
   - [ ] Technologies/tools are appropriate
   - [ ] Approach is sound
   - [ ] No obvious technical blockers
   - [ ] Integration points are clear
   - **For Split Plans**: [ ] Sub-plans can be executed independently without breaking continuity

2. **Resource Feasibility**
   - [ ] Total time estimate is reasonable
   - [ ] Required skills/expertise are available
   - [ ] External dependencies are manageable
   - **For Split Plans**: [ ] Time estimates per sub-plan are realistic

3. **Risk Assessment**
   - [ ] Risks are realistic and relevant
   - [ ] Mitigation strategies are actionable
   - [ ] High-impact risks are identified
   - [ ] Contingency plans exist for critical risks
   - **For Split Plans**: [ ] Risks are distributed appropriately across sub-plans
   - **For Split Plans**: [ ] Continuity risks (breaking flow between sub-plans) are identified

### Phase 5: Execution Readiness

1. **File Identification**
   - [ ] Files to create are clearly specified
   - [ ] Files to modify are identified
   - [ ] File paths are correct and complete
   - [ ] No conflicting file operations
   - **For Split Plans**: [ ] Files are distributed correctly across sub-plans
   - **For Split Plans**: [ ] No file conflicts between sub-plans (same file created in multiple sub-plans)

2. **Dependency Management**
   - [ ] External dependencies are listed
   - [ ] Internal dependencies are clear
   - [ ] Prerequisites are documented
   - **For Split Plans**: [ ] Dependencies between sub-plans are clear (what files/APIs from previous sub-plans are needed)

3. **Success Criteria**
   - [ ] Criteria are measurable
   - [ ] Criteria are testable
   - [ ] Criteria align with requirements
   - **For Split Plans**: [ ] Each sub-plan has its own success criteria
   - **For Split Plans**: [ ] Overall success criteria for entire split plan are defined in index

### Phase 6: Quality and Best Practices

1. **Plan Structure**
   - [ ] Follows standard plan template
   - [ ] Sections are well-organized
   - [ ] Formatting is consistent
   - [ ] Tables are properly formatted

2. **Clarity**
   - [ ] Language is clear and unambiguous
   - [ ] Technical terms are appropriate
   - [ ] Examples are helpful (if included)

3. **Completeness**
   - [ ] All necessary information present
   - [ ] No obvious gaps
   - [ ] Questions for stakeholders are listed (if any)

### Phase 7: Save Review (if --save flag provided)
   - **Reference**: `.cursor/rules/output-paths.mdc`
   - Extract directory from save path (default: `docs/06-reviews/`)
   - Ensure directory exists (create if needed, including parent `docs/` if necessary)
   - Generate filename if not provided (e.g., `docs/06-reviews/plan-auth-review.md`)
   - Save review to specified path

## Output Format

### Single Plan Review

```markdown
## Plan Review: [Plan Name]

**File**: `docs/04-plans/[plan-name].md`
**Date Reviewed**: [YYYY-MM-DD]
**Verdict**: [Approve | Needs Revision | Request Changes]

---

### Summary

[Brief overview of the plan and review findings]

### Strengths

- [What's good about the plan]
- [Well-structured sections]
- [Clear task breakdown]

### Issues Found
```

### Split Plan Review (Index + All Sub-Plans)

```markdown
## Plan Review: [Plan Name] - Split Plan Overview

**Plan Code**: [PREFIX][NUMBER] (e.g., FR001)
**Directory**: `docs/04-plans/[PREFIX][NUMBER]/`
**Date Reviewed**: [YYYY-MM-DD]
**Verdict**: [Approve | Needs Revision | Request Changes]

---

### Summary

[Brief overview of the split plan structure and review findings]

### Index Plan Review

**File**: `docs/04-plans/[PREFIX][NUMBER]/index.md`

**Strengths**:
- [What's good about the index plan]

**Issues**:
- [Issues with index plan structure]

### Sub-Plans Overview

| Sub-Plan | Status | Issues | Ready for Execution |
|----------|--------|--------|---------------------|
| [PREFIX][NUMBER]-setup.md | ✅ Good | 0 | Yes |
| [PREFIX][NUMBER]-core.md | ⚠️ Needs Fix | 2 | No |
| [PREFIX][NUMBER]-api.md | ✅ Good | 0 | Yes |
| [PREFIX][NUMBER]-integration.md | ✅ Good | 1 | Yes |

### Continuity Review

**Code Continuity**: ✅ Good
- Shared files are well-documented
- Import dependencies are clear

**Data Continuity**: ⚠️ Needs Attention
- Data flow is documented but could be clearer
- Missing some shared data structures in index

**Integration Continuity**: ✅ Good
- Integration points are clearly mapped

**Logic Flow Continuity**: ✅ Good
- Business logic flows correctly across sub-plans

### Issues Found

#### Critical (Must Fix)

1. **Missing Dependencies**
   - Task 5 depends on Task 3, but Task 3 is not listed
   - **Impact**: Plan cannot be executed as written
   - **Fix**: Add Task 3 or remove dependency

2. **Circular Dependency**
   - Task 2 depends on Task 4, Task 4 depends on Task 2
   - **Impact**: Execution will be blocked
   - **Fix**: Restructure tasks to break circular dependency

#### Important (Should Fix)

1. **Unrealistic Time Estimates**
   - Task 2 estimated as "S" but requires database migration (should be "L")
   - **Impact**: Timeline will be inaccurate
   - **Fix**: Re-estimate based on actual complexity

2. **Vague Task Description**
   - Task 7: "Implement authentication" is too broad
   - **Impact**: Unclear what needs to be done
   - **Fix**: Break into specific subtasks (e.g., "Create User model", "Add JWT middleware", "Implement login endpoint")

#### Suggestions (Nice to Have)

1. Consider breaking Task 4 into smaller subtasks for better tracking
2. Add more detail to error handling in Task 6
3. Include performance considerations for Task 8

---

### Completeness Check

- [x] Summary is clear
- [x] Tasks are atomic
- [ ] Dependencies are complete
- [x] Files to modify are listed
- [x] Risks are identified
- [ ] Success criteria are measurable
- [x] Scope is well-defined

### Task Analysis

**Total Tasks**: 12
**Total Estimated Time**: ~8 hours
**Tasks with Issues**: 3 (Tasks 2, 5, 7)

| Task | Issue | Severity |
|------|-------|----------|
| 2 | Unrealistic size estimate | Important |
| 5 | Missing dependency | Critical |
| 7 | Too vague | Important |

### Recommendations

1. **Before Execution**
   - Add missing dependencies (Task 3)
   - Fix circular dependencies
   - Re-estimate Task 2

2. **Improvements**
   - Break down Task 7 into specific subtasks
   - Add more detail to error handling
   - Include performance testing in success criteria

3. **Questions to Resolve**
   - [Question about requirement]
   - [Question about edge case]

---

### Risk Assessment Review

**Identified Risks**: 3
**High Impact**: 1
**Mitigation Quality**: Good

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Database migration complexity | High | Phased rollout plan | ✅ Good |
| Third-party API rate limits | Medium | Caching strategy | ✅ Good |
| Team availability | Low | Buffer time included | ✅ Good |

---

**Ready for execution**: [Yes | No - Critical issues must be addressed]

**Next Steps**:
1. Address critical issues
2. Update plan with fixes
3. Re-review if major changes made
4. Proceed with `/execute-plan` once approved
```

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--mode=[mode]` | Use specific behavioral mode | `--mode=review` |
| `--depth=[1-5]` | Review thoroughness level | `--depth=5` |
| `--format=[fmt]` | Output format (concise/detailed/json) | `--format=detailed` |
| `--save=[path]` | Save review to file | `--save=docs/06-reviews/plan-auth-review.md` |
| `--focus=[area]` | Focus on specific area | `--focus=dependencies` |
| `--all` | Review all sub-plans in split plan | `--all docs/04-plans/FR001/` |
| `--continuity` | Focus on continuity review (for split plans) | `--continuity docs/04-plans/FR001/` |

### Flag Usage Examples

```bash
# Review single plan
/review-plan docs/04-plans/auth.md

# Review latest plan
/review-plan latest

# Review split plan (index + all sub-plans)
/review-plan docs/04-plans/FR001/
/review-plan docs/04-plans/FR001/index.md

# Review specific sub-plan
/review-plan docs/04-plans/FR001/FR001-setup.md

# Review all sub-plans in split plan
/review-plan --all docs/04-plans/FR001/

# Deep review
/review-plan --depth=5 docs/04-plans/migration.md

# Save review
/review-plan --save=docs/06-reviews/plan-review.md docs/04-plans/auth.md

# Focus on dependencies (especially important for split plans)
/review-plan --focus=dependencies docs/04-plans/FR001/

# Focus on continuity (for split plans)
/review-plan --focus=continuity docs/04-plans/FR001/
```

### Focus Areas

| Focus | Description |
|-------|-------------|
| `dependencies` | Focus on task dependencies and ordering (especially inter-sub-plan dependencies) |
| `estimates` | Focus on time estimates and sizing |
| `risks` | Focus on risk identification and mitigation |
| `completeness` | Focus on missing sections and information |
| `feasibility` | Focus on technical and resource feasibility |
| `continuity` | Focus on code/data/integration/logic flow continuity (for split plans) |
| `structure` | Focus on plan structure and organization (especially split plan structure) |

## MCP Integration

This command leverages MCP servers for enhanced plan review:

### Filesystem - Plan Discovery
```
For finding and reading plan files:
- Use directory_tree to scan docs/04-plans/ directory
- Use read_file to load plan content
- Use get_file_info to find latest modified plan
```

### Sequential Thinking - Structured Analysis
```
For complex plan analysis:
- Break down review into logical steps
- Track findings systematically
- Build confidence in assessment incrementally
```

### Memory - Review History
```
Store review findings for continuity:
- Remember previous plan reviews
- Track common issues across plans
- Build knowledge of plan quality patterns
```

## When to Use

- Before executing a plan with `/execute-plan`
- When reviewing plans from team members
- When validating plan quality before committing
- When checking if plan needs updates
- **For Split Plans**: Review index and all sub-plans before starting execution
- **For Split Plans**: Review continuity between sub-plans to ensure seamless flow

## Related Commands

- `/plan` - Create implementation plans (including split plans)
- `/execute-plan` - Execute approved plans (including sub-plans)
- `/review-brainstorm` - Review design documents
- `/review` - Review code implementation

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Review**
   - [ ] Address critical issues first (missing dependencies, circular dependencies)
   - [ ] Review recommendations and suggestions
   - [ ] Check if all issues are valid and actionable
   - [ ] Prioritize fixes by severity (Critical → Important → Suggestions)
   - **For Split Plans**: [ ] Verify continuity issues are addressed

2. **Next Commands to Use**
   - Use `/plan` to update the plan with fixes
   - Use `/execute-plan [plan-file]` to start implementing approved plans
   - **For Split Plans**: Execute sub-plans in order from index.md
   - Use `/review-plan` again after fixes to verify issues are resolved

3. **Update or Improve**
   - To update: Fix issues in plan file(s) and run `/review-plan` again
   - To improve: Address all recommendations systematically
   - To extend: Add missing sections or tasks to the plan

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/plan` | Create or update plans | After fixing issues found in review |
| `/execute-plan` | Execute approved plans | After plan is approved and ready |
| `/review-plan` | Review plan quality | Before execution, after major changes |
| `/review` | Review code implementation | After executing plan to review code |

### Common Workflows

**Workflow: Review → Fix → Review Again (Single Plan)**
```
/review-plan docs/04-plans/FR001-feature.md → Fix issues → /review-plan docs/04-plans/FR001-feature.md → /execute-plan docs/04-plans/FR001-feature.md
```

**Workflow: Review → Fix → Execute Step-by-Step (Split Plan)**
```
/review-plan docs/04-plans/FR001/ → Fix issues → /review-plan docs/04-plans/FR001/ → 
/execute-plan docs/04-plans/FR001/FR001-setup.md → 
/execute-plan docs/04-plans/FR001/FR001-core.md → 
/execute-plan docs/04-plans/FR001/FR001-api.md → 
/execute-plan docs/04-plans/FR001/FR001-integration.md
```

**Workflow: Review Sub-Plan → Execute → Review Next**
```
/review-plan docs/04-plans/FR001/FR001-setup.md → /execute-plan docs/04-plans/FR001/FR001-setup.md → 
/review-plan docs/04-plans/FR001/FR001-core.md → /execute-plan docs/04-plans/FR001/FR001-core.md
```

### Tips

- 💡 **Tip**: Review split plans with `--focus=continuity` to ensure seamless flow
- 💡 **Tip**: Use `--all` flag to review all sub-plans at once for split plans
- 💡 **Tip**: Fix critical issues before addressing suggestions to avoid re-review
- 💡 **Tip**: For split plans, review index.md first to understand overall structure
- ⚠️ **Warning**: Don't skip continuity review for split plans - it's critical for maintaining flow
- ⚠️ **Warning**: Verify inter-sub-plan dependencies are correct before execution
- ⚠️ **Warning**: Re-review after fixes to ensure issues are truly resolved

### File Naming

**Reference**: `.cursor/rules/file-naming-prefix.mdc`

When using `--save` flag without explicit filename:
- Auto-generates: `docs/06-reviews/RV001-[descriptive-name].md`
- Prefix: `RV` (Review)
- Numbers increment sequentially (RV001, RV002, RV003...)

**Examples**:
```bash
# Review single plan and save
/review-plan --save docs/04-plans/auth.md
# Generates: docs/06-reviews/RV001-auth-plan-review.md

# Review split plan and save
/review-plan --save docs/04-plans/FR001/
# Generates: docs/06-reviews/RV001-fr001-split-plan-review.md
```


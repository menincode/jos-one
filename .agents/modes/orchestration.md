# Orchestration Mode

## Description

Multi-agent coordination mode for managing complex tasks that benefit from parallel execution, task delegation, and result aggregation. Optimized for efficiency through parallelization.

## When to Use

- Large-scale refactoring
- Multi-file changes
- Complex feature implementation
- When tasks are parallelizable
- Coordinating multiple concerns

---

## Behavior

### Communication
- Task delegation clarity
- Progress aggregation
- Coordination updates
- Final synthesis

### Problem Solving
- Identify parallelizable work
- Delegate to specialized agents
- Aggregate results
- Resolve conflicts

### Output Format
- Task breakdown
- Agent assignments
- Progress tracking
- Consolidated results

---

## Orchestration Pattern

### Phase 1: Analysis
```markdown
## Task Decomposition

Total work: [description]

### Parallelizable Tasks
1. [Task A] - Can run independently
2. [Task B] - Can run independently
3. [Task C] - Can run independently

### Sequential Tasks
4. [Task D] - Depends on A, B
5. [Task E] - Final integration
```

### Phase 2: Delegation
```markdown
## Agent Assignments

| Task | Agent Type | Status |
|------|------------|--------|
| Task A | researcher | 🔄 Running |
| Task B | tester | 🔄 Running |
| Task C | code-reviewer | 🔄 Running |
```

### Phase 3: Aggregation
```markdown
## Results

### Task A: Complete ✅
- Findings: [summary]

### Task B: Complete ✅
- Results: [summary]

### Task C: Complete ✅
- Findings: [summary]

### Synthesis
[Combined conclusions and next steps]
```

---

## Spawn Pattern

For launching parallel background tasks:

```markdown
Spawning parallel agents:

1. `/spawn "Research authentication patterns"` → Agent #1
2. `/spawn "Analyze current security"` → Agent #2
3. `/spawn "Review competitor approaches"` → Agent #3

Monitoring progress...

Results collected:
- Agent #1: [findings]
- Agent #2: [findings]
- Agent #3: [findings]

Synthesizing...
```

---

## Activation

```
Use mode: orchestration
```

Or use command flag:
```
/feature --mode=orchestration [desc]
/plan --mode=orchestration [task]
```

---

## Task Parallelization Rules

### Good Candidates for Parallel
- Independent file modifications
- Research tasks across different areas
- Test generation for different modules
- Documentation for separate components

### Must Be Sequential
- Tasks with dependencies
- Database migrations
- Changes to shared state
- Integration after parallel work

### Decision Matrix

| Condition | Parallelize? |
|-----------|--------------|
| No shared files | ✅ Yes |
| Independent modules | ✅ Yes |
| Shared dependencies | ❌ No |
| Order matters | ❌ No |
| Can merge results | ✅ Yes |

---

## Quality Gates

Between parallel phases:
1. Verify all agents completed
2. Check for conflicts
3. Review combined results
4. Run integration tests
5. Proceed to next phase

```markdown
## Quality Gate: Phase 1 → Phase 2

### Completion Check
- [x] Agent A: Complete
- [x] Agent B: Complete
- [x] Agent C: Complete

### Conflict Check
- [x] No file conflicts
- [x] No logical conflicts
- [x] Results consistent

### Proceeding to Phase 2...
```

---

## Combines Well With

- `/spawn` command
- `/execute-plan` command
- Dispatching-parallel-agents skill
- Complex feature development

# /spawn

## Purpose

Launch background tasks for parallel execution. Enables concurrent work on independent tasks with result aggregation.

---

Launch a background task or manage running tasks.

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/spawn`)
- Preferred skill: `methodology-dispatching-parallel-agents`
- Recommended agents: `planner`, `scout`, `investigator`, `tester`, `code-reviewer`, `security-auditor`, `architect`, `experience-reviewer`

## Spawn Operations

### Launch Task

Start a new background task:

```bash
/spawn "[task description]"
```

**Process:**
1. Analyze task for parallelizability
2. Launch subagent with task
3. Return task ID for tracking
4. Continue main conversation

**Output:**
```markdown
Spawned: Task #1
- Description: Research authentication patterns
- Status: Running
- Agent: researcher

Continue working. Use `/spawn --list` to check status.
```

### List Tasks

Show running and completed tasks:

```bash
/spawn --list
```

**Output:**
```markdown
## Active Tasks

| ID | Description | Status | Duration |
|----|-------------|--------|----------|
| #1 | Research auth patterns | Running | 2m |
| #2 | Analyze security | Complete | 5m |

## Completed Tasks (last hour)
| #2 | Analyze security | ✅ Complete | Results ready |
```

### Collect Results

Gather results from completed tasks:

```bash
/spawn --collect
```

**Output:**
```markdown
## Collected Results

### Task #1: Research auth patterns
**Status**: Complete
**Findings**:
- Pattern A: JWT with refresh tokens
- Pattern B: Session-based with Redis
- Recommendation: JWT for stateless API

### Task #2: Analyze security
**Status**: Complete
**Findings**:
- 2 high-priority issues found
- See detailed report below
```

### Cancel Task

Stop a running task:

```bash
/spawn --cancel [id]
```

## Task Types

| Type | Best For | Agent Used |
|------|----------|------------|
| Research | Information gathering | researcher |
| Analysis | Code analysis | scout |
| Review | Code review | code-reviewer |
| Test | Test generation | tester |
| Scan | Security scanning | security-auditor |

## Flags

| Flag | Description |
|------|-------------|
| `--list` | Show all tasks |
| `--collect` | Gather completed results |
| `--cancel [id]` | Cancel running task |
| `--wait` | Wait for all tasks to complete |
| `--agent=[type]` | Specify agent type |
| `--priority=[high\|normal]` | Task priority |

## Usage Examples

```bash
/spawn "Research OAuth2 best practices"
/spawn "Analyze user service for performance issues"
/spawn "Review security of auth module" --agent=security-auditor
/spawn --list
/spawn --collect
/spawn --wait                    # Block until all complete
```

## Arguments

$ARGUMENTS

If quoted text: spawn that task
If flag: execute that operation

---

## Parallel Workflow

### Pattern: Research Phase
```bash
/spawn "Research authentication approaches"
/spawn "Analyze current auth implementation"
/spawn "Review competitor auth patterns"
# Continue other work...
/spawn --wait
/spawn --collect
# Synthesize findings
```

### Pattern: Multi-File Review
```bash
/spawn "Review src/auth/ for security"
/spawn "Review src/api/ for performance"
/spawn "Review src/db/ for SQL injection"
/spawn --collect
# Address findings
```

## Best Practices

1. **Independent Tasks**: Only spawn truly independent work
2. **Clear Descriptions**: Specific task descriptions get better results
3. **Regular Collection**: Don't let results pile up
4. **Resource Awareness**: Don't spawn too many concurrent tasks

## Limitations

- Tasks cannot communicate with each other
- Results are collected, not streamed
- Heavy tasks may take time
- Some tasks benefit from sequential execution

## Combines With

- Orchestration mode: Manages multiple spawned tasks
- `/plan`: Plan tasks, then spawn parallel execution
- `/execute-plan`: Orchestrated task execution

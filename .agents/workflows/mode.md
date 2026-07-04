---
description: /mode
---

# /mode

## Purpose

Switch between behavioral modes to optimize responses for different task types. Modes adjust communication style, output format, and problem-solving approach.

---

Switch to the specified behavioral mode.

## Available Modes

| Mode | Description | Best For |
|------|-------------|----------|
| `default` | Balanced standard behavior | General tasks |
| `brainstorm` | Creative exploration, more questions | Design, ideation |
| `token-efficient` | Compressed, concise output | High-volume, cost savings |
| `deep-research` | Thorough analysis, citations | Investigation, audits |
| `implementation` | Code-focused, minimal prose | Executing plans |
| `review` | Critical analysis, finding issues | Code review, QA |
| `orchestration` | Multi-task coordination | Complex parallel work |

## Mode Switching

### Activate Mode
```bash
/mode [mode-name]
```

### Check Current Mode
```bash
/mode
```
(Shows current active mode)

### Reset to Default
```bash
/mode default
```

## Mode Details

### Default Mode
- Standard balanced responses
- Mix of explanation and code
- Normal verification steps

### Brainstorm Mode
- Ask more clarifying questions
- Present multiple alternatives
- Explore trade-offs explicitly
- Delay convergence on solutions

### Token-Efficient Mode
- Minimal explanations
- Code-only responses where possible
- Skip obvious context
- 30-70% token savings

### Deep-Research Mode
- Thorough investigation
- Evidence and citations
- Confidence levels stated
- Comprehensive analysis

### Implementation Mode
- Jump straight to code
- Progress indicators
- Minimal discussion
- Execute don't deliberate

### Review Mode
- Look for issues first
- Categorized findings
- Severity levels
- Actionable feedback

### Orchestration Mode
- Task breakdown
- Parallel execution planning
- Result aggregation
- Coordination focus

## Flags

| Flag | Description |
|------|-------------|
| `--info` | Show detailed mode description |
| `--list` | List all available modes |

## Usage Examples

```bash
/mode brainstorm            # Switch to brainstorm mode
/mode token-efficient       # Switch to efficient mode
/mode                       # Show current mode
/mode --list                # List all modes
/mode default               # Reset to default
```

## Arguments

$ARGUMENTS

If mode name provided: switch to that mode
If no arguments: show current mode
If `--list`: show all modes

---

## Mode Persistence

- Modes persist for the session
- Explicitly switch when task type changes
- Mode affects all subsequent responses
- Can be overridden per-command with flags

## Command Flag Override

Override mode for single command:
```bash
/feature --mode=implementation [desc]
/review --mode=deep-research [file]
/plan --mode=brainstorm [task]
```

## Recommended Workflows

### Feature Development
```
/mode brainstorm           # Explore approaches
[discuss design]
/mode implementation       # Execute plan
[write code]
/mode review               # Check quality
[review code]
```

### Bug Investigation
```
/mode deep-research        # Investigate thoroughly
[analyze bug]
/mode implementation       # Apply fix
[fix bug]
/mode default              # Return to normal
```

### Cost-Conscious Session
```
/mode token-efficient      # Set for session
[work on multiple tasks]
/mode default              # Reset when done
```

## Mode Files

Mode definitions are in `.cursor/modes/`:
- `default.md`
- `brainstorm.md`
- `token-efficient.md`
- `deep-research.md`
- `implementation.md`
- `review.md`
- `orchestration.md`

Customize modes by editing these files.

---
description: /load
---

# /load

## Purpose

Load specific project components into context for focused work. Uses the project index to efficiently load relevant files.

---

Load the requested component(s) into context.

## Loading Process

### Step 1: Check for Index

First, check if `PROJECT_INDEX.md` exists:
- If exists: Use index for efficient loading
- If not: Suggest running `/index` first, or do quick scan

### Step 2: Identify Component

Parse the requested component:

| Request Type | Action |
|--------------|--------|
| Category name | Load all files in category |
| File path | Load specific file |
| Pattern | Load matching files |
| `--all` | Load key files from all categories |

### Step 3: Load Files

Read the identified files and summarize:
- File purposes
- Key exports/functions
- Dependencies
- Current state

### Step 4: Context Summary

Provide a brief summary:
```markdown
## Loaded Context

### Files Loaded (N)
- `path/to/file1.ts` - [purpose]
- `path/to/file2.ts` - [purpose]

### Key Components
- [Component]: [description]

### Ready For
- [Suggested actions based on loaded context]
```

## Component Categories

| Category | What It Loads |
|----------|---------------|
| `api` | API routes and endpoints |
| `models` | Data models and types |
| `services` | Business logic services |
| `utils` | Utility functions |
| `tests` | Test files |
| `config` | Configuration files |
| `auth` | Authentication related |
| `db` | Database related |

## Flags

| Flag | Description |
|------|-------------|
| `--all` | Load all key components |
| `--shallow` | Load only file summaries |
| `--deep` | Load full file contents |
| `--related` | Include related files |

## Usage Examples

```bash
/load api                    # Load all API routes
/load models                 # Load all data models
/load src/services/user.ts   # Load specific file
/load auth --related         # Load auth + related files
/load --all                  # Load all key components
/load --all --shallow        # Quick overview of everything
```

## Arguments

$ARGUMENTS

If no arguments, show available components from index.

---

## Best Practices

1. **Start Narrow**: Load specific components first
2. **Expand as Needed**: Use `--related` when you need more context
3. **Check Index**: Run `/index` if loading seems slow
4. **Use Categories**: Category names are faster than patterns

## After Loading

Suggest next actions:
- "Ready to work on [component]. What would you like to do?"
- "I see [patterns/issues]. Want me to address them?"
- "Related files that might be relevant: [list]"

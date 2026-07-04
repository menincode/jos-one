---
description: /index
---

# /index

## Purpose

Generate a comprehensive project structure index for faster navigation and context loading. Creates a `PROJECT_INDEX.md` file mapping the codebase structure.

---

Analyze the current project and generate a comprehensive index.

## Index Generation

### Step 1: Scan Project Structure

Scan the entire project directory structure, excluding:
- `node_modules/`
- `.git/`
- `__pycache__/`
- `dist/`, `build/`, `.next/`
- `venv/`, `.venv/`
- Coverage and cache directories

### Step 2: Identify Key Components

Categorize files by type:
- **Entry Points**: Main files, index files, app entry
- **API/Routes**: Endpoint definitions
- **Models/Types**: Data structures, schemas
- **Services**: Business logic
- **Utilities**: Helper functions
- **Tests**: Test files
- **Configuration**: Config files, env templates
- **Documentation**: README, docs

### Step 3: Map Dependencies

Identify:
- Package managers and dependencies (package.json, requirements.txt, etc.)
- Internal import relationships between key files
- External service integrations

### Step 4: Generate Index

Create `PROJECT_INDEX.md` with this structure:

```markdown
# Project Index: [Project Name]

Generated: [timestamp]

## Quick Navigation

| Category | Key Files |
|----------|-----------|
| Entry Points | [list] |
| API Routes | [list] |
| Core Services | [list] |
| Models | [list] |

## Directory Structure

```
[tree view]
```

## Key Files

### Entry Points
- `[path]` - [description]

### API/Routes
- `[path]` - [description]

### Services
- `[path]` - [description]

### Models/Types
- `[path]` - [description]

## Dependencies

### External
- [package]: [purpose]

### Internal
- [module] → [depends on]

## Architecture Notes
[Brief description of patterns observed]
```

## Flags

| Flag | Description |
|------|-------------|
| `--depth=[N]` | Limit directory depth (default: 5) |
| `--include=[pattern]` | Include additional patterns |
| `--exclude=[pattern]` | Exclude additional patterns |
| `--output=[path]` | Custom output path |

## Usage Examples

```bash
/index                           # Standard index
/index --depth=3                 # Shallow index
/index --include="*.graphql"     # Include GraphQL files
/index --output=docs/INDEX.md    # Custom output location
```

## Arguments

$ARGUMENTS

If no arguments provided, generate standard index with default settings.

---

After generating the index, inform the user:
1. Index file location
2. Number of files indexed
3. Key components discovered
4. Suggest using `/load` to load specific components into context

## MCP Integration

This command leverages MCP servers for enhanced indexing:

### Filesystem - Project Scanning (Primary)
```
ALWAYS use Filesystem for project scanning:
- Use directory_tree for full structure view
- Use list_directory for targeted exploration
- Use search_files to find specific patterns
- Use get_file_info for file metadata
```

### Memory - Project Knowledge
```
Store project structure in knowledge graph:
- Create entities for key modules
- Store component relationships
- Recall structure in future sessions
- Build project understanding over time
```

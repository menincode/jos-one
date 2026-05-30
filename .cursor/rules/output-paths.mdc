---
description: Default output paths, folder creation rules, and file naming prefix conventions for markdown files
alwaysApply: true
---

# Output Paths and Folder Structure

**Related Rules**:
- `.cursor/rules/file-naming-prefix.mdc` - Prefix naming conventions (FR001, RV001, etc.)
- `.cursor/rules/command-completion-guidance.mdc` - User guidance after command completion

## Default Output Paths

When using `--save` flag in commands, use these default paths:

| Command | Default Path | Example |
|---------|-------------|---------|
| `/plan` | `docs/04-plans/` | `docs/04-plans/auth.md`, `docs/04-plans/migration.md` |
| `/research` | `docs/02-research/` | `docs/02-research/orm-comparison.md` |
| `/brainstorm` | `docs/03-design/` | `docs/03-design/payment-integration.md` |
| `/review` | `docs/06-reviews/` | `docs/06-reviews/pr-123.md` |
| `/doc` | `docs/` | `docs/api.md`, `docs/getting-started.md` |
| `/onboarding` | `docs/01-onboarding/` | `docs/01-onboarding/onboarding-guide.md` |

## Folder Creation Rules

**ALWAYS** ensure directories exist before saving files:

1. **Extract directory path** from `--save` flag
2. **Check if directory exists** using `list_directory` or file system check
3. **Create directory** if it doesn't exist using `create_directory` or equivalent
4. **Then save the file**

### Implementation Pattern

When saving a file with `--save=[path]`:

```markdown
1. Parse the path: `docs/04-plans/auth.md` → directory: `docs/04-plans/`
2. Check if `docs/04-plans/` exists
3. If not exists: Create `docs/04-plans/` directory
4. Save file to `docs/04-plans/auth.md`
```

## Path Structure

```
project-root/
├── docs/                    # General documentation
│   ├── api/                 # API documentation
│   ├── design/              # Design documents from /brainstorm
│   ├── research/            # Research documents from /research
│   ├── reviews/             # Code reviews from /review
│   └── onboarding/          # Onboarding guides from /onboarding
├── 04-plans/                # Implementation plans from /plan
└── ...
```

## Command-Specific Rules

### `/plan` Command
- **Default folder**: `docs/04-plans/`
- **Naming**: Use prefix format: `docs/04-plans/FR001-user-authentication.md`
- **Prefix**: `FR` (Feature Request/Plan)
- **Create**: `docs/04-plans/` if not exists
- **Reference**: `.cursor/rules/file-naming-prefix.mdc` for prefix rules

### `/research` Command
- **Default folder**: `docs/02-research/`
- **Naming**: Use prefix format: `docs/02-research/RS001-orm-comparison.md`
- **Prefix**: `RS` (Research)
- **Create**: `docs/02-research/` if not exists (create both `docs/` and `02-research/` if needed)

### `/brainstorm` Command
- **Default folder**: `docs/03-design/`
- **Naming**: Use prefix format: `docs/03-design/DS001-payment-integration.md`
- **Prefix**: `DS` (Design)
- **Create**: `docs/03-design/` if not exists

### `/review` Command
- **Default folder**: `docs/06-reviews/`
- **Naming**: Use prefix format: `docs/06-reviews/RV001-pr-123-review.md`, `docs/06-reviews/RV002-auth-refactor.md`
- **Prefix**: `RV` (Review)
- **Create**: `docs/06-reviews/` if not exists

### `/doc` Command
- **Default folder**: `docs/`
- **Naming**: Use prefix format: `docs/DOC001-api-reference.md`
- **Prefix**: `DOC` (Documentation)
- **Create**: `docs/` if not exists

### `/onboarding` Command
- **Default folder**: `docs/01-onboarding/`
- **Naming**: Use prefix format: `docs/01-onboarding/OB001-onboarding-guide.md`, `docs/01-onboarding/OB002-new-member-guide.md`
- **Prefix**: `OB` (Onboarding)
- **Create**: `docs/01-onboarding/` if not exists (create both `docs/` and `onboarding/` if needed)

## Error Handling

If folder creation fails:
1. Log the error clearly
2. Suggest manual creation: `mkdir -p [path]`
3. Continue with file save attempt (may fail, but user gets clear error)

## Examples

### Example 1: Plan Command
```bash
/plan --save "implement user authentication"
```

**Expected behavior**:
1. Check if `docs/04-plans/` exists
2. Create `docs/04-plans/` if not exists
3. Scan for existing FR* files in `docs/04-plans/`
4. Generate next number (e.g., if FR001, FR002 exist → use FR003)
5. Save plan to `docs/04-plans/FR003-implement-user-authentication.md`

**With explicit filename**:
```bash
/plan --save=docs/04-plans/FR005-custom-name.md "feature"
```
- Use explicit filename if provided
- Validate prefix matches command type (FR for /plan)

### Example 2: Research Command
```bash
/research --save "ORM libraries"
```

**Expected behavior**:
1. Check if `docs/` exists, create if not
2. Check if `docs/02-research/` exists, create if not
3. Scan for existing RS* files in `docs/02-research/`
4. Generate next number (e.g., if RS001 exists → use RS002)
5. Save research to `docs/02-research/RS002-orm-libraries.md`

### Example 3: Custom Path
```bash
/plan --save=custom/plans/my-plan.md "custom feature"
```

**Expected behavior**:
1. Check if `custom/` exists, create if not
2. Check if `custom/plans/` exists, create if not
3. Save plan to `custom/plans/my-plan.md`

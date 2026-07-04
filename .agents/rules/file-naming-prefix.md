---
description: File naming prefix rules for generated documentation files (plans, reviews, research, etc.)
alwaysApply: true
---

# File Naming Prefix Rules

## Overview

All generated documentation files (plans, reviews, research, design documents, etc.) **MUST** use a sequential prefix format to track and organize documents.

## Prefix Format

### Format Pattern

```
[PREFIX][NUMBER]-[descriptive-name].md
```

**Example**: `FR001-user-authentication-plan.md`

### Prefix Types

| Document Type | Prefix | Example | Location |
|--------------|--------|---------|----------|
| **Feature Request / Plan** | `FR` | `FR001-auth-plan.md` | `docs/04-plans/` |
| **Review** | `RV` | `RV001-pr-123-review.md` | `docs/06-reviews/` |
| **Research** | `RS` | `RS001-orm-comparison.md` | `docs/02-research/` |
| **Design / Brainstorm** | `DS` | `DS001-payment-integration.md` | `docs/03-design/` |
| **Documentation** | `DOC` | `DOC001-api-reference.md` | `docs/` |
| **Onboarding** | `OB` | `OB001-new-member-guide.md` | `docs/01-onboarding/` |
| **Audit** | `AU` | `AU001-command-audit.md` | `docs/06-reviews/` |
| **Implementation** | `IM` | `IM001-saas-pm-app.md` | `docs/` |

## Numbering System

### Sequential Numbering

- Numbers start from `001` and increment sequentially
- Each prefix type has its own sequence (FR001, FR002, FR003...)
- Numbers are zero-padded to 3 digits (001, 002, ..., 099, 100, ...)

### Number Assignment

1. **Check existing files** in the target directory
2. **Find highest number** for the prefix type
3. **Increment by 1** for new file
4. **Use zero-padded format** (001, 002, etc.)

### Example Sequence

```
docs/04-plans/
├── FR001-user-auth-plan.md
├── FR002-payment-flow-plan.md
├── FR003-notification-system.md
└── FR004-search-feature-plan.md
```

## Implementation Rules

### When Saving Files

**ALWAYS** follow this process:

1. **Determine prefix type** based on command/document type
2. **Scan target directory** for existing files with same prefix
3. **Find highest number** (e.g., if FR001, FR002, FR003 exist → next is FR004)
4. **Generate filename**: `[PREFIX][NUMBER]-[kebab-case-name].md`
5. **Save file** with generated name

### Command-to-Prefix Mapping

| Command | Prefix | Default Directory |
|---------|--------|-------------------|
| `/plan` | `FR` | `docs/04-plans/` |
| `/review` | `RV` | `docs/06-reviews/` |
| `/review-plan` | `RV` | `docs/06-reviews/` |
| `/review-brainstorm` | `RV` | `docs/06-reviews/` |
| `/research` | `RS` | `docs/02-research/` |
| `/brainstorm` | `DS` | `docs/03-design/` |
| `/doc` | `DOC` | `docs/` |
| `/onboarding` | `OB` | `docs/01-onboarding/` |

### Auto-Generation Logic

```python
# Pseudo-code for prefix generation
def generate_filename(command_type, descriptive_name, target_dir):
    prefix = get_prefix_for_command(command_type)  # FR, RV, RS, etc.
    existing_files = list_files_with_prefix(target_dir, prefix)
    highest_num = get_highest_number(existing_files)  # 001, 002, etc.
    next_num = highest_num + 1
    padded_num = str(next_num).zfill(3)  # 001, 002, etc.
    kebab_name = to_kebab_case(descriptive_name)
    return f"{prefix}{padded_num}-{kebab_name}.md"
```

## Examples

### Example 1: Plan Command

**Command**:
```bash
/plan --save "user authentication system"
```

**Generated filename**: `docs/04-plans/FR001-user-authentication-system.md`

**If FR001 exists**: `docs/04-plans/FR002-user-authentication-system.md`

### Example 2: Review Command

**Command**:
```bash
/review --save src/auth/
```

**Generated filename**: `docs/06-reviews/RV001-auth-code-review.md`

**If RV001 exists**: `docs/06-reviews/RV002-auth-code-review.md`

### Example 3: Research Command

**Command**:
```bash
/research --save "ORM libraries comparison"
```

**Generated filename**: `docs/02-research/RS001-orm-libraries-comparison.md`

### Example 4: Explicit Filename

**Command**:
```bash
/plan --save=docs/04-plans/FR005-custom-name.md "custom feature"
```

**Behavior**: Use explicit filename if provided, but validate prefix format matches command type.

## Validation Rules

### Required Format

- ✅ **Valid**: `FR001-user-auth.md`
- ✅ **Valid**: `RV042-pr-review.md`
- ❌ **Invalid**: `user-auth.md` (missing prefix)
- ❌ **Invalid**: `FR1-user-auth.md` (number not zero-padded)
- ❌ **Invalid**: `FR001_user_auth.md` (should use kebab-case)

### Prefix Validation

- Prefix **MUST** match command type
- If explicit filename provided, prefix should match expected type
- Warn user if prefix doesn't match (but allow override)

## File Tracking

### Tracking File Location

Create `.cursor/prefix-tracker.json` to track last used numbers:

```json
{
  "FR": 4,
  "RV": 12,
  "RS": 3,
  "DS": 8,
  "DOC": 15,
  "OB": 1,
  "AU": 2,
  "IM": 1
}
```

### Update Process

1. Read tracker file (or scan directory if not exists)
2. Get current number for prefix
3. Increment and use for new file
4. Update tracker file after successful save

## Migration

### Existing Files

- **Existing files without prefix**: Keep as-is, don't rename automatically
- **New files**: Always use prefix format
- **Manual rename**: User can rename existing files to add prefix if desired

## Error Handling

### Duplicate Numbers

If file with same number exists:
1. Check if it's the same content (skip if identical)
2. If different, increment to next available number
3. Log warning about number conflict

### Invalid Prefix

If prefix doesn't match command type:
1. Warn user
2. Suggest correct prefix
3. Allow override if explicitly requested

---

## Quick Reference

| Need to... | Use Prefix | Example |
|------------|-----------|---------|
| Create plan | `FR` | `FR001-feature-name.md` |
| Review code | `RV` | `RV001-component-review.md` |
| Research tech | `RS` | `RS001-library-comparison.md` |
| Design feature | `DS` | `DS001-architecture.md` |
| Write docs | `DOC` | `DOC001-api-guide.md` |
| Onboard member | `OB` | `OB001-guide.md` |

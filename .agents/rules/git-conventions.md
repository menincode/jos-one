---
description: Git conventions for branch naming, commits, and PR requirements
alwaysApply: false
---

# Git Conventions

## Branch Naming

- `feature/[ticket]-[description]`
- `fix/[ticket]-[description]`
- `hotfix/[description]`
- `chore/[description]`

## Commit Messages

```
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## PR Requirements

- Descriptive title and description
- Linked to issue/ticket
- All tests passing
- Code review approved
- No merge conflicts

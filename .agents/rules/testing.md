---
description: Testing standards, coverage requirements, and test naming conventions
globs: ["**/*.test.*", "**/*.spec.*", "**/tests/**", "**/__tests__/**"]
alwaysApply: false
---

# Testing Standards

## Coverage Requirements

- Minimum coverage: 80%
- Critical paths: 95%

## Test Naming

- **Python**: `test_[function]_[scenario]_[expected]`
- **TypeScript**: `describe('[Component]', () => { it('should [behavior]') })`

## Test Types

1. **Unit tests**: All business logic functions
2. **Integration tests**: API endpoints, database operations
3. **E2E tests**: Critical user flows

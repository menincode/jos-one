---
description: Security standards and forbidden patterns
alwaysApply: true
---

# Security Standards

## Forbidden Patterns

- No hardcoded secrets or API keys
- No `eval()` or dynamic code execution
- No SQL string concatenation (use parameterized queries)
- No `any` types in TypeScript
- No disabled security headers

## Required Practices

- Input validation on all user inputs
- Output encoding for all rendered content
- Authentication on all protected endpoints
- Rate limiting on public APIs
- Secrets via environment variables only

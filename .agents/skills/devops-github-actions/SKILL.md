---
name: devops-github-actions
description: Best practices and patterns for GitHub Actions
---

# GitHub Actions

## Description

GitHub Actions CI/CD workflows including testing, building, and deployment.

## When to Use

- Setting up CI/CD pipelines
- Automating tests and builds
- Deployment automation

---

## Core Patterns

### Basic CI Workflow

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

### Matrix Builds

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
        node: [18, 20]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
```

### Caching

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: npm-
```

### Secrets

```yaml
- name: Deploy
  env:
    API_KEY: ${{ secrets.API_KEY }}
  run: deploy --key "$API_KEY"
```

## Best Practices

1. Use caching for dependencies
2. Run jobs in parallel when possible
3. Use environment secrets
4. Pin action versions
5. Add proper triggers

## Common Pitfalls

- **Slow pipelines**: Add caching
- **Secret exposure**: Never echo secrets
- **Unpinned versions**: Use @v4 not @main
---
description: Project context including tech stack, architecture, and behavioral modes
alwaysApply: true
---

# Project Context

## Overview

This is the comprehensive agent kit for the YCM Tool multi-tenant SaaS monorepo. It contains NestJS, React, and Wails (Go) desktop apps.

## Antigravity Rules (Strict)

1. **Shared Packages First**: `frontend` và `backend` luôn ưu tiên tái sử dụng và đưa code dùng chung vào không gian `packages/`.
2. **Package Manager**: Dự án luôn dùng **YARN** để quản lý package.
3. **Desktop App API Flow**: Phần Desktop app (Wails) luôn call REST API từ phía **Frontend** (React).
4. **Common UI Components**: Khi triển khai UI, luôn sử dụng Common components hoặc build mới Common component để tái sử dụng.

## Tech Stack

- **Backend**: NestJS, TypeORM, PostgreSQL
- **Frontend**: React, Vite, Zustand, Tailwind
- **Desktop**: Wails (Go + React)
- **Shared**: Monorepo with Yarn Workspaces

## Architecture

```
src/
├── api/          # API endpoints
├── services/     # Business logic
├── models/       # Data models
├── utils/        # Utilities
├── tests/        # Test files
└── docs/         # Documentation (*.mdx files)
```

## Behavioral Modes

Modes adjust communication style, output format, and problem-solving approach.

| Mode | Description | Best For |
|------|-------------|----------|
| `default` | Balanced standard behavior | General tasks |
| `brainstorm` | Creative exploration, questions | Design, ideation |
| `token-efficient` | Compressed, concise output | High-volume, cost savings |
| `deep-research` | Thorough analysis, citations | Investigation, audits |
| `implementation` | Code-focused, minimal prose | Executing plans |
| `review` | Critical analysis, finding issues | Code review, QA |

### Mode Activation

Commands support `--mode=[mode]` flag for single command execution.

Mode files: `.cursor/modes/` (custom implementation)

## Command Flags

All commands support combinable flags for flexible customization.

### Universal Flags

| Flag | Description | Values |
|------|-------------|--------|
| `--mode=[mode]` | Behavioral mode | default, brainstorm, token-efficient, etc. |
| `--depth=[1-5]` | Thoroughness level | 1=quick, 5=exhaustive |
| `--format=[fmt]` | Output format | concise, detailed, json |
| `--save=[path]` | Save output to file | File path |

## Exclusions

**Important**: When working with documentation commands, exclude website build files:

- `website/` directory (unless specifically requested)
- Build artifacts (`dist/`, `build/`, `.next/`, `.astro/`)
- Node modules and dependencies

Focus on source documentation files (*.mdx) in:

- `src/content/docs/`
- `docs/`
- `src/docs/`

## Troubleshooting

### Common Issues

**MDX compilation errors**

- Check frontmatter syntax
- Verify code block language tags
- Ensure proper heading hierarchy

**Python import errors**

```bash
export PYTHONPATH="${PYTHONPATH}:${PWD}"
```

**Node modules issues**

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

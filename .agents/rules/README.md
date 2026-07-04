# Rules Configuration

## Overview

Các file rules trong `.cursor/rules/` sử dụng frontmatter YAML để cấu hình cách áp dụng.

## Frontmatter Options

### `description` (bắt buộc)
Mô tả ngắn gọn về rule để AI quyết định có sử dụng không.

### `alwaysApply` (tùy chọn)
- `true`: Rule luôn được áp dụng trong mọi context
- `false`: Rule chỉ được áp dụng khi phù hợp (mặc định)

### `globs` (tùy chọn)
Mảng các pattern để tự động attach rule khi file phù hợp:
```yaml
globs: ['**/*.py', '**/api/**']
```

## Apply Modes

### 1. Always Apply (`alwaysApply: true`)
Rule luôn được bao gồm trong context:
```yaml
---
description: Code conventions for naming and style
alwaysApply: true
---
```

**Sử dụng cho:**
- Code conventions
- Security standards
- Project context

### 2. Auto Attached (với `globs`)
Rule tự động attach khi file phù hợp với glob pattern:
```yaml
---
description: Python development patterns
globs: ['**/*.py']
alwaysApply: false
---
```

**Sử dụng cho:**
- Language-specific rules (Python, TypeScript, etc.)
- Framework rules (FastAPI, React, etc.)
- Testing rules (pytest, vitest, etc.)

### 3. Agent Requested (`alwaysApply: false`, không có `globs`)
AI quyết định có sử dụng rule không dựa trên description:
```yaml
---
description: Test-driven development methodology
alwaysApply: false
---
```

**Sử dụng cho:**
- Methodology rules
- Process rules
- Optimization rules

### 4. Manual (không có frontmatter hoặc `alwaysApply: false`)
Rule chỉ được áp dụng khi được reference rõ ràng bằng `@rule-name`.

## Current Rules Configuration

### Always Apply Rules
- `code-conventions.mdc` - Code conventions
- `security.mdc` - Security standards
- `project-context.mdc` - Project context

### Auto Attached Rules (with globs)
- `documentation.mdc` - MDX documentation (globs: `**/*.mdx`, `**/*.md`)
- `testing.mdc` - Testing standards (globs: test files)
- Language skills (Python, TypeScript, JavaScript)
- Framework skills (FastAPI, Django, Next.js, React)
- Testing skills (pytest, vitest)

### Agent Requested Rules
- `git-conventions.mdc` - Git conventions
- Methodology skills (TDD, brainstorming, etc.)
- Optimization skills

## Best Practices

1. **Always Apply** cho rules quan trọng và phổ biến
2. **Globs** cho rules liên quan đến file types cụ thể
3. **Description** rõ ràng giúp AI quyết định tốt hơn
4. Tránh quá nhiều rules với `alwaysApply: true` (tốn token)

## Examples

### Example 1: Always Apply
```yaml
---
description: Code conventions for naming and style
alwaysApply: true
---
```

### Example 2: Auto Attach với Globs
```yaml
---
description: Python development patterns
globs: ['**/*.py', '**/api/**']
alwaysApply: false
---
```

### Example 3: Agent Requested
```yaml
---
description: Test-driven development methodology
alwaysApply: false
---
```


---
description: MDX documentation standards and best practices
globs: ["**/*.mdx", "**/*.md", "docs/**"]
alwaysApply: false
---

# Documentation Standards

## MDX Documentation Standards

### Frontmatter Requirements

All MDX files must include frontmatter:

```mdx
---
title: Page Title
description: Brief description
---
```

### Structure

- Use proper heading hierarchy (h1 → h2 → h3)
- Include code examples with language tags
- Use tables for structured data
- Include links to related documentation
- Add metadata for SEO and navigation

### Code Blocks

Always specify language in code blocks:

````mdx
```typescript
// TypeScript code
```

```python
# Python code
```

```bash
# Shell commands
```
````

### Best Practices

- Keep lines under 100 characters when possible
- Use semantic HTML elements
- Include alt text for images
- Use consistent formatting
- Test MDX files compile correctly

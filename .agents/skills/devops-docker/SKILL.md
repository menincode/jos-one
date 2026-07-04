---
name: devops-docker
description: Best practices and patterns for Docker
---

# Docker

## Description

Docker containerization including Dockerfiles, compose, and best practices.

## When to Use

- Containerizing applications
- Local development environments
- CI/CD pipelines

---

## Core Patterns

### Multi-stage Dockerfile (Node.js)

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Python Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Best Practices

1. Use multi-stage builds
2. Order commands for cache efficiency
3. Use .dockerignore
4. Run as non-root user
5. Use specific image tags

## Common Pitfalls

- **Large images**: Use slim/alpine bases
- **Cache busting**: Order COPY commands properly
- **Root user**: Add USER instruction
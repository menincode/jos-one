---
description: Package manager preferences - always use yarn
alwaysApply: true
---

# Package Manager: Yarn

## Overview

This project **MUST** use **Yarn** as the package manager for all Node.js/TypeScript projects. Never use npm, pnpm, or other package managers unless explicitly specified.

## Rules

### Always Use Yarn

**When working with Node.js/TypeScript projects, ALWAYS use yarn commands:**

- ✅ `yarn install` (not `npm install` or `pnpm install`)
- ✅ `yarn add <package>` (not `npm install <package>`)
- ✅ `yarn add -D <package>` (not `npm install --save-dev <package>`)
- ✅ `yarn remove <package>` (not `npm uninstall <package>`)
- ✅ `yarn run <script>` or `yarn <script>` (not `npm run <script>`)
- ✅ `yarn build` (not `npm run build`)
- ✅ `yarn test` (not `npm test`)
- ✅ `yarn lint` (not `npm run lint`)

### Command Examples

**Install dependencies:**
```bash
yarn install
# or
yarn
```

**Add a dependency:**
```bash
yarn add axios
yarn add -D @types/node
```

**Run scripts:**
```bash
yarn dev
yarn build
yarn test
yarn lint
```

**Remove a dependency:**
```bash
yarn remove axios
```

### When Generating Code

**When creating package.json files or suggesting installation commands:**

1. **Always use yarn commands** in documentation, comments, and examples
2. **Never suggest npm commands** unless user explicitly requests npm
3. **Update existing npm commands** to yarn when reviewing code

**Example - Good:**
```bash
# Install dependencies
yarn install

# Add new package
yarn add express
```

**Example - Bad:**
```bash
# Install dependencies
npm install  # ❌ Don't use npm

# Add new package
npm install express  # ❌ Don't use npm
```

### CI/CD and Scripts

**In CI/CD workflows, GitHub Actions, Dockerfiles, and scripts:**

- Use `yarn install --frozen-lockfile` for CI builds
- Use `yarn` commands in Dockerfiles
- Use `yarn` commands in package.json scripts

**Example Dockerfile:**
```dockerfile
# Good
RUN yarn install --frozen-lockfile
RUN yarn build

# Bad
RUN npm install  # ❌
RUN npm run build  # ❌
```

**Example GitHub Actions:**
```yaml
# Good
- name: Install dependencies
  run: yarn install --frozen-lockfile

- name: Build
  run: yarn build

# Bad
- name: Install dependencies
  run: npm install  # ❌
```

### Lock Files

**Always reference yarn.lock, never package-lock.json:**

- ✅ `yarn.lock` - This is the lock file to use
- ❌ `package-lock.json` - Do not create or reference this
- ❌ `pnpm-lock.yaml` - Do not create or reference this

### Troubleshooting

**If yarn.lock is missing or corrupted:**
```bash
# Regenerate lock file
rm -rf node_modules yarn.lock
yarn install
```

**If dependencies are out of sync:**
```bash
# Clean install
rm -rf node_modules
yarn install
```

**If yarn is not installed:**
```bash
# Install yarn globally
npm install -g yarn
# Then use yarn for all subsequent commands
```

## Exceptions

**Only use npm/pnpm if:**
1. User explicitly requests it
2. Project-specific configuration requires it (documented in project README)
3. Working with a legacy project that cannot be migrated

**In all other cases, default to yarn.**

## Verification

**Before suggesting package manager commands, verify:**
- [ ] Is this a Node.js/TypeScript project?
- [ ] Does the project have a package.json?
- [ ] Is yarn.lock present in the repository?
- [ ] Am I using yarn commands?

**If all answers are yes, use yarn. Otherwise, check project-specific requirements.**

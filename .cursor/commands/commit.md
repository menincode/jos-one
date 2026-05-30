# /commit - Smart Commit Command

## Purpose

Create a well-formatted commit with auto-generated message based on staged changes.

## Usage

```
/commit [optional message hint]
```

## Arguments

- `$ARGUMENTS`: Optional hint for commit message focus (e.g., "auth", "bugfix", "refactor")

---

Create a commit for staged changes with hint: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/commit`)
- Preferred skill: `verification-gate`
- Recommended agent: `generalPurpose`

## Workflow

### Step 1: Analyze Changes

1. **Check Status**
   ```bash
   git status
   ```

2. **View Staged Changes**
   ```bash
   git diff --staged
   ```

3. **Review Recent Commits**
   ```bash
   git log --oneline -5
   ```

### Step 2: Categorize Changes

Determine commit type:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### Step 3: Generate Message

Follow conventional commit format:
```
type(scope): subject

body (optional)

footer (optional)
```

### Step 4: Create Commit

```bash
git commit -m "$(cat <<'EOF'
type(scope): subject

- Change 1
- Change 2

🤖 Generated with [Cursor IDE](https://cursor.sh)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Commit Message Guidelines

### Subject Line
- Max 50 characters
- Imperative mood ("Add" not "Added")
- No period at end
- Capitalize first letter

### Body
- Wrap at 72 characters
- Explain what and why
- Use bullet points for multiple changes

### Examples

#### Feature
```
feat(auth): add password reset functionality

- Add reset token generation
- Implement email sending
- Add rate limiting for reset requests

Closes #123
```

#### Bug Fix
```
fix(api): handle null user in profile endpoint

The profile endpoint crashed when accessing deleted users.
Added null check and proper 404 response.

Fixes #456
```

#### Refactor
```
refactor(database): extract query builders

Split large database service into focused modules
for better maintainability and testing.
```

#### Documentation
```
docs(readme): update installation instructions

- Add prerequisites section
- Update configuration examples
- Fix broken links
```

#### Test
```
test(auth): add missing login tests

- Add test for invalid credentials
- Add test for locked account
- Add test for expired session
```

#### Chore
```
chore(deps): update dependencies

- Update React to 18.2
- Update TypeScript to 5.3
- Remove unused packages
```

## Output

### Commit Created

```markdown
## Commit Created

**Hash**: `abc1234`
**Branch**: `feature/auth-improvements`

### Message
```
feat(auth): add OAuth2 login support

- Implement Google OAuth provider
- Implement GitHub OAuth provider
- Add session token generation
- Update user model for OAuth data

Closes #789
```

### Files Changed
| Status | File |
|--------|------|
| M | src/auth/providers.ts |
| A | src/auth/oauth/google.ts |
| A | src/auth/oauth/github.ts |
| M | src/models/user.ts |
| A | tests/auth/oauth.test.ts |

### Stats
- 5 files changed
- 234 insertions(+)
- 12 deletions(-)

---

## Next Steps & User Guidance

### Immediate Actions

1. **Verify the Commit**
   - [ ] Review commit message is clear and descriptive
   - [ ] Confirm all intended changes are included
   - [ ] Check no unintended files are committed
   - [ ] Verify commit follows project conventions

2. **Next Commands to Use**
   - Use `git push` to push commit to remote repository
   - Use `/pr [description]` to create pull request
   - Use `/ship [message]` to commit and create PR in one step
   - Use `git commit --amend` if you need to modify the commit
   - Use `/review` to review changes before pushing

3. **Update or Improve**
   - To update: Use `git commit --amend` to modify the commit
   - To improve: Add more changes and amend, or create a new commit
   - To extend: Continue with more commits or create PR

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/pr` | Create pull request | After committing to create PR |
| `/ship` | Commit and create PR | To do both in one step |
| `/review` | Review changes | Before committing to verify quality |
| `/status` | Check git status | To see current state |

### Common Workflows

**Workflow: Commit → Push → PR**
```bash
/commit "feat: add feature" → git push → /pr "Add new feature"
```

**Workflow: Review → Commit → Ship**
```
/review "staged changes" → /commit "fix: bug" → /ship "fix: resolve issue"
```

### Tips

- 💡 **Tip**: Review changes with `/review` before committing
- 💡 **Tip**: Use `/ship` to commit and create PR in one command
- 💡 **Tip**: Use `git commit --amend` to fix commit messages
- ⚠️ **Warning**: Don't commit secrets or sensitive information
- ⚠️ **Warning**: Ensure code is tested before committing

## Pre-Commit Checks

Before committing:
- [ ] No secrets in staged files
- [ ] No debug statements
- [ ] No TODO comments (unless intentional)
- [ ] Code is formatted

## Amending Commits

If pre-commit hooks modify files:
```bash
# Stage modified files and amend
git add -A
git commit --amend --no-edit
```

<!-- CUSTOMIZATION POINT -->
## Variations

Modify behavior via CLAUDE.md:
- Commit message format
- Required sections
- Issue reference format
- Co-author settings

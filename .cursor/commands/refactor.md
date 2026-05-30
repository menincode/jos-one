# /refactor - Refactoring Command

## Purpose

Improve code structure, readability, or performance without changing behavior.

## Usage

```
/refactor [file or function] [goal: clean | extract | simplify | optimize]
```

---

Refactor: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/refactor`)
- Preferred skills: `map-codebase`, `test-first`, `incremental-shipping`
- Recommended agents:
  - `generalPurpose` for implementation
  - `code-reviewer` for structural validation after refactor

## Minimal-Change Guardrails (Mandatory)

1. **Default Scope First**
   - Only refactor the exact file/function requested.
   - Do not refactor neighboring modules unless user explicitly asks.

2. **Smallest Safe Diff**
   - Prefer local simplification over architecture rewrites.
   - Keep behavior identical; no hidden feature changes.

3. **No Opportunistic Cleanup**
   - Avoid bundling style-only, naming-only, or unrelated cleanup in the same change.
   - If extra cleanup is useful, propose it as a follow-up step, not mixed into current patch.

4. **Evidence Before Expansion**
   - Expand scope only when tests/types/build prove the change cannot be isolated.
   - If scope must expand, explicitly explain why and list additional files before editing.

## Workflow

### Step 1: Understand Current Code

1. **Read the Code Thoroughly**
   - Understand what it does
   - Identify all dependencies
   - Note existing tests

2. **Learn from Similar Code in Codebase**
   - **Read Similar Implementations**
     * Find 2-3 similar refactored code examples
     * Note patterns used in well-structured code
     * Review how similar problems were solved
   
   - **Analyze Code Style**
     * Review naming conventions in similar code
     * Note code organization patterns
     * Understand error handling approaches
     * Check documentation style
   
   - **Extract Refactoring Patterns**
     * How similar code was structured
     * Patterns to follow for this refactor
     * Anti-patterns to avoid

### Step 2: Plan Refactoring

1. Identify improvement opportunities
2. Ensure tests exist
3. Plan incremental changes
4. Define "stop boundary" (files/functions that must not be touched)

### Step 3: Execute

1. Make small, focused changes
2. Run tests after each change
3. Commit incrementally
4. Stop once the requested improvement is achieved (no extra polishing pass)

## Refactoring Types

- **Extract**: Pull out reusable functions
- **Simplify**: Reduce complexity
- **Rename**: Improve clarity
- **Clean**: Remove dead code

## Output

```markdown
## Refactoring Complete

### Changes Made
- Extracted `validateInput()` function
- Simplified conditional logic
- Renamed `x` to `userCount`
- Kept scope limited to requested target only

### Before/After
[Code comparison]

### Tests
All passing
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Verify the Refactoring**
   - [ ] Run all tests to ensure behavior unchanged
   - [ ] Review refactored code for correctness
   - [ ] Check code is cleaner and more maintainable
   - [ ] Confirm no regressions introduced

2. **Next Commands to Use**
   - Use `/test [file]` to run tests and verify behavior
   - Use `/review [file]` to review refactored code quality
   - Use `/optimize [file]` if performance improvements needed
   - Use `/ship [message]` when refactoring is complete
   - Use `/commit [message]` to commit refactored code

3. **Update or Improve**
   - To update: Continue refactoring related code
   - To improve: Apply same refactoring patterns to similar code
   - To extend: Use `/refactor` on other files that need improvement

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/test` | Verify behavior | After refactoring to ensure tests pass |
| `/review` | Review code quality | To verify refactoring improved code |
| `/optimize` | Performance optimization | If refactoring reveals performance issues |
| `/ship` | Commit and create PR | When refactoring is complete |
| `/commit` | Commit changes | To save refactored code |

### Common Workflows

**Workflow: Refactor → Test → Review → Ship**
```
/refactor "file.ts" → /test "file" → /review "refactored" → /ship "refactor: improve structure"
```

**Workflow: Refactor → Optimize → Ship**
```
/refactor "function" → /optimize "performance" → /ship "refactor: optimize"
```

### Tips

- 💡 **Tip**: Always run tests after refactoring to ensure behavior unchanged
- 💡 **Tip**: Refactor incrementally to avoid breaking changes
- 💡 **Tip**: Use `/review` to verify refactoring improved code quality
- ⚠️ **Warning**: Don't refactor without tests - tests ensure behavior unchanged
- ⚠️ **Warning**: Refactor one thing at a time to avoid introducing bugs

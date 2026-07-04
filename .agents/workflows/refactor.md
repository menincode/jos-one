---
description: Refactoring Command
---


## Purpose

Improve code structure, readability, or performance without changing behavior.

## Usage

```
/refactor [file or function] [goal: clean | extract | simplify | optimize]
```

---

Refactor: **$ARGUMENTS**

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

### Step 3: Execute

1. Make small, focused changes
2. Run tests after each change
3. Commit incrementally

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

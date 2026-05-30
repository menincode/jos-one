# /tdd - Test-Driven Development Workflow

## Purpose

Start a TDD workflow: write failing tests first, then implement to make them pass.

## Usage

```
/tdd [feature or function description]
```

---

Start TDD workflow for: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/tdd`)
- Preferred skills: `test-first`, `methodology-test-driven-development`
- Recommended agent: `tester`

## Workflow

### Phase 1: Red - Write Failing Tests

1. **Understand Requirements**
   - What should the code do?
   - What are the inputs/outputs?
   - What edge cases exist?

2. **Learn from Existing Code** (if similar code exists)
   - **Read Similar Implementations**
     * Find 2-3 similar functions/features in codebase
     * Read existing tests for similar functionality
     * Note testing patterns and conventions
   
   - **Analyze Code Style**
     * Review naming conventions used
     * Note code structure patterns
     * Understand error handling approaches
     * Check documentation style
   
   - **Extract Testing Patterns**
     * How tests are structured
     * Mocking strategies used
     * Test naming conventions
     * Assertion patterns

3. **Write Tests First**
   ```python
   def test_feature_does_expected_thing():
       result = feature("input")
       assert result == "expected"
   ```

3. **Run Tests (Expect Failure)**
   ```bash
   pytest -v  # Should fail
   ```

### Phase 2: Green - Make Tests Pass

1. **Implement Minimal Code**
   - Just enough to pass tests
   - No premature optimization

2. **Run Tests (Expect Success)**
   ```bash
   pytest -v  # Should pass
   ```

### Phase 3: Refactor

1. **Improve Code Quality**
   - Clean up implementation
   - Remove duplication
   - Improve naming

2. **Run Tests (Ensure Still Passing)**
   ```bash
   pytest -v  # Should still pass
   ```

### Phase 4: Repeat

Add more test cases and repeat the cycle.

## TDD Best Practices

- Write one test at a time
- Tests should be specific and focused
- Keep the red-green-refactor cycle short
- Commit after each green phase

## Superpowers TDD Methodology

**Reference**: `.cursor/rules/skills/methodology/test-driven-development/skill.mdc`

### Non-Negotiable Rule

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST**

This is not a guideline - it's a rule.

### If You Already Wrote Code

Delete it. Completely. Don't keep it as reference.

```
WRONG: "I'll keep this code as reference while writing tests"
RIGHT: Delete the code, write test, rewrite implementation
```

### Verification Before Completion

**Reference**: `.cursor/rules/skills/methodology/verification-before-completion/skill.mdc`

Before claiming tests pass:
1. **Identify** the command that proves assertion
2. **Execute** it fully and freshly
3. **Read** complete output
4. **Verify** output matches claim
5. **Only then** make the claim

### Forbidden Language

Never use without verification:
- "should work"
- "probably fixed"
- "seems to pass"

### Testing Anti-Patterns to Avoid

**Reference**: `.cursor/rules/skills/methodology/testing-anti-patterns/skill.mdc`

1. Testing mock behavior instead of real code
2. Polluting production with test-only methods
3. Mocking without understanding dependencies
4. Creating incomplete mocks
5. Writing tests as afterthoughts

## Output

```markdown
## TDD Session: [Feature]

### Tests Written
1. `test_basic_functionality` - [description]
2. `test_edge_case` - [description]

### Implementation
`src/feature.py` - [description]

### Cycle Summary
- Red: 3 tests written
- Green: All passing
- Refactor: Extracted helper function
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the TDD Implementation**
   - [ ] Verify all tests pass and cover requirements
   - [ ] Check implementation follows TDD principles
   - [ ] Confirm code is clean and well-structured
   - [ ] Review test coverage is adequate

2. **Next Commands to Use**
   - Use `/review [file]` to review code and test quality
   - Use `/test [scope]` to add more test cases if needed
   - Use `/refactor [file]` to improve code structure
   - Use `/ship [message]` when feature is complete
   - Use `/feature [description]` for related features

3. **Update or Improve**
   - To update: Continue TDD cycle with more tests
   - To improve: Refactor code while keeping tests green
   - To extend: Add more features using TDD approach

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/review` | Review code quality | After TDD cycle to verify quality |
| `/test` | Add more tests | To increase coverage or add cases |
| `/refactor` | Improve code | During green phase to clean up |
| `/ship` | Commit and create PR | When feature is complete |
| `/feature` | Full feature workflow | For larger features |

### Common Workflows

**Workflow: TDD → Review → Refactor → Ship**
```
/tdd "feature" → /review "code" → /refactor "improve" → /ship "feat: add feature"
```

**Workflow: TDD → Test → Review → Ship**
```
/tdd "function" → /test "add cases" → /review "tests" → /ship
```

### Tips

- 💡 **Tip**: Always write tests first (Red phase) before implementation
- 💡 **Tip**: Keep tests passing (Green phase) before refactoring
- 💡 **Tip**: Refactor during green phase to improve code quality
- ⚠️ **Warning**: Don't skip the refactor phase - it improves code quality
- ⚠️ **Warning**: Ensure all tests pass before moving to next feature

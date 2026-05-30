# /optimize - Performance Optimization Command

## Purpose

Analyze and optimize code performance.

## Usage

```
/optimize [file or function]
```

---

Optimize: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/optimize`)
- Preferred skills: `map-codebase`, `incremental-shipping`, `verification-gate`
- Recommended agents:
  - `generalPurpose` for implementation
  - `code-reviewer` for regression and complexity checks

## Workflow

1. **Analyze Current Performance**
   - Identify bottlenecks
   - Check complexity
   - Profile if possible

2. **Identify Opportunities**
   - Algorithm improvements
   - Caching opportunities
   - Async optimizations

3. **Implement Optimizations**
   - Make targeted changes
   - Verify improvements
   - Ensure correctness

## Output

```markdown
## Optimization Report

### Before
- Time complexity: O(n²)
- Estimated time: 500ms

### After
- Time complexity: O(n log n)
- Estimated time: 50ms

### Changes Made
- [Description of optimizations]
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Verify the Optimization**
   - [ ] Run tests to ensure correctness maintained
   - [ ] Measure performance improvement
   - [ ] Check no regressions introduced
   - [ ] Verify optimization meets goals

2. **Next Commands to Use**
   - Use `/test [file]` to verify tests still pass
   - Use `/review [file]` to review optimized code
   - Use `/refactor [file]` to improve code structure if needed
   - Use `/ship [message]` when optimization is complete
   - Use `/deploy [env]` to deploy optimized code

3. **Update or Improve**
   - To update: Continue optimizing related code
   - To improve: Profile and optimize other bottlenecks
   - To extend: Use `/optimize` on other performance-critical areas

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/test` | Verify correctness | After optimization to ensure tests pass |
| `/review` | Review code quality | To verify optimization maintained quality |
| `/refactor` | Improve structure | If optimization revealed structural issues |
| `/ship` | Commit and create PR | When optimization is complete |
| `/deploy` | Deploy optimized code | To deploy performance improvements |

### Common Workflows

**Workflow: Optimize → Test → Review → Ship**
```
/optimize "function" → /test "function" → /review "optimized" → /ship "perf: optimize"
```

**Workflow: Optimize → Profile → Deploy**
```
/optimize "api" → Profile results → /deploy "staging" → Monitor → /deploy "production"
```

### Tips

- 💡 **Tip**: Always measure before and after to verify improvements
- 💡 **Tip**: Profile code to identify real bottlenecks
- 💡 **Tip**: Ensure tests pass after optimization
- ⚠️ **Warning**: Don't optimize without measuring - measure first
- ⚠️ **Warning**: Ensure optimization doesn't reduce code readability

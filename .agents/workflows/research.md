---
description: Research Command
---


## Purpose

Research a technology, library, or approach with comprehensive analysis.

## Usage

```
/research [topic or technology]
```

---

Research: **$ARGUMENTS**

## Workflow

1. **Gather Information**
   - Official documentation
   - Community resources
   - Comparisons

2. **Analyze**
   - Pros and cons
   - Best practices
   - Alternatives

3. **Recommend**
   - Summary
   - Recommendation
   - Next steps

4. **Save Research (if --save flag provided)**
   - **Reference**: `.cursor/rules/output-paths.mdc`
   - Extract directory from save path (e.g., `docs/02-research/orm.md` → `docs/02-research/`)
   - Ensure directory exists (create if needed, including parent `docs/` if necessary)
   - Save research to specified path

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--mode=[mode]` | Use specific behavioral mode | `--mode=deep-research` |
| `--depth=[1-5]` | Research thoroughness level | `--depth=5` |
| `--format=[fmt]` | Output format (concise/detailed/json) | `--format=detailed` |
| `--save=[path]` | Save research to file | `--save=docs/research.md` |
| `--compare` | Focus on comparing alternatives | `--compare` |
| `--sequential` | Use sequential thinking methodology | `--sequential` |

### Flag Usage Examples

```bash
/research --depth=5 "authentication libraries for Node.js"
/research --compare "React vs Vue vs Svelte"
/research --sequential "root cause of memory leak"
/research --save=docs/orm-research.md "ORM comparison"
```

### Depth Levels

| Level | Behavior |
|-------|----------|
| 1 | Quick overview, key points only |
| 2 | Standard analysis |
| 3 | Thorough with examples |
| 4 | Comprehensive with trade-offs |
| 5 | Exhaustive with citations |

## MCP Integration

This command leverages MCP servers for enhanced research:

### Context7 - Library Documentation (Primary)
```
ALWAYS use Context7 for library/framework research:
1. Use resolve-library-id to find the library ID
2. Use get-library-docs with topic parameter for focused docs
3. Use mode='code' for API references, mode='info' for concepts
```

### Sequential Thinking - Structured Analysis
```
For complex research requiring step-by-step reasoning:
- Use sequentialthinking tool to break down analysis
- Track confidence scores for each finding
- Revise conclusions as new information emerges
```

### Memory - Persistent Research
```
Store research findings for future reference:
- Create entities for researched technologies
- Add observations with pros/cons/recommendations
- Link related technologies with relations
```

## Output

```markdown
## Research: [Topic]

### Summary
[Overview]

### Pros
- [Pro 1]
- [Pro 2]

### Cons
- [Con 1]

### Alternatives
[Comparison table]

### Recommendation
[Clear recommendation]
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Research**
   - [ ] Verify all alternatives were considered
   - [ ] Check recommendations are well-justified
   - [ ] Review pros/cons for accuracy
   - [ ] Confirm research covers all requirements

2. **Next Commands to Use**
   - Use `/brainstorm [topic]` to explore design options based on research
   - Use `/plan [feature]` to create implementation plan using research findings
   - Use `/doc [topic]` to document the research findings
   - Use `/review` to review research quality if needed

3. **Update or Improve**
   - To update: Add new findings or update recommendations
   - To improve: Research additional alternatives or dive deeper
   - To extend: Create design documents based on research

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/brainstorm` | Explore design options | After research to design solution |
| `/plan` | Create implementation plan | Using research findings |
| `/doc` | Document research | To share findings with team |
| `/review` | Review research quality | If research needs validation |

### Common Workflows

**Workflow: Research → Brainstorm → Plan**
```
/research "technology" → /brainstorm "design options" → /plan "implementation"
```

**Workflow: Research → Plan → Feature**
```
/research "library comparison" → /plan "integration" → /feature "implement"
```

**Workflow: Research → Doc → Review**
```
/research "best practices" → /doc "guide" → /review "docs/guide.md"
```

### Tips

- 💡 **Tip**: Use `--save` flag to save research with prefix (RS001, RS002, etc.)
- 💡 **Tip**: Research multiple alternatives before making decisions
- 💡 **Tip**: Document trade-offs clearly for future reference
- ⚠️ **Warning**: Verify research findings are current and accurate

### File Naming

**Reference**: `.cursor/rules/file-naming-prefix.mdc`

When using `--save` flag without explicit filename:
- Auto-generates: `docs/02-research/RS001-[topic-name].md`
- Prefix: `RS` (Research)
- Numbers increment sequentially (RS001, RS002, RS003...)

**Example**:
```bash
/research --save "ORM libraries"
# Generates: docs/02-research/RS001-orm-libraries.md
```
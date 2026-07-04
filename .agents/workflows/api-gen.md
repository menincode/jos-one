---
description: API Generation Command
---


## Purpose

Generate API endpoints, documentation, or client code from specifications.

## Usage

```
/api-gen [resource name or OpenAPI spec path]
```

---

Generate API for: **$ARGUMENTS**

## Workflow

### Step 1: Define Resource

1. Identify resource properties
2. Define relationships
3. Determine operations

### Step 2: Generate

1. Create model/schema
2. Create routes/endpoints
3. Add validation
4. Generate tests

### Step 3: Document

1. Create OpenAPI spec
2. Add examples
3. Document errors

## Output

```markdown
## API Generated

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /resources | List all |
| POST | /resources | Create |
| GET | /resources/:id | Get one |

### Files Created
- `src/models/resource.ts`
- `src/routes/resource.ts`
- `tests/resource.test.ts`
- `docs/api/resource.md`
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Generated API**
   - [ ] Verify all endpoints are correctly generated
   - [ ] Check models and schemas match requirements
   - [ ] Confirm validation rules are appropriate
   - [ ] Review OpenAPI documentation is complete

2. **Next Commands to Use**
   - Use `/test [api-file]` to run generated tests
   - Use `/review [file]` to review API implementation quality
   - Use `/feature [description]` to add business logic to endpoints
   - Use `/doc [api]` to enhance API documentation
   - Use `/ship [message]` when API is ready

3. **Update or Improve**
   - To update: Modify generated files directly or regenerate
   - To improve: Add more endpoints, validation, or documentation
   - To extend: Use `/feature` to add business logic

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/test` | Run API tests | After generation to verify endpoints |
| `/review` | Review API code | To verify implementation quality |
| `/feature` | Add business logic | To implement endpoint functionality |
| `/doc` | Enhance documentation | To improve API docs |
| `/ship` | Commit and create PR | When API is complete |

### Common Workflows

**Workflow: API Gen → Test → Review → Ship**
```
/api-gen "users" → /test "users" → /review "api" → /ship "feat: add users API"
```

**Workflow: API Gen → Feature → Test → Ship**
```
/api-gen "products" → /feature "business logic" → /test "products" → /ship
```

### Tips

- 💡 **Tip**: Always test generated APIs before using in production
- 💡 **Tip**: Review generated code to ensure it matches your patterns
- 💡 **Tip**: Use `/feature` to add business logic to generated endpoints
- ⚠️ **Warning**: Don't use generated code without review and testing
- ⚠️ **Warning**: Ensure generated APIs follow security best practices

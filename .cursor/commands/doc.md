# /doc - Documentation Command

## Purpose

Generate or update documentation including API docs, README files, code comments, and technical specifications.

## Usage

```
/doc [target | 'api' | 'readme' | 'changelog']
```

## Arguments

- `$ARGUMENTS`:
  - File/function path: Document specific code
  - `api`: Generate API documentation
  - `readme`: Update README file
  - `changelog`: Generate changelog from commits

---

Generate documentation for: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/doc`)
- Preferred skills: `methodology-writing-plans`, `release-and-changelog` (release docs)
- Recommended agent: `generalPurpose`

## Workflow

### For Code Documentation

1. **Analyze Code**
   - Read the code thoroughly
   - Understand purpose and behavior
   - Identify inputs and outputs
   - Note side effects

2. **Generate Documentation**
   - Add docstrings/JSDoc
   - Include examples
   - Document edge cases
   - Add type annotations

### For API Documentation

1. **Find All Endpoints**
   - Scan route definitions
   - Identify HTTP methods
   - Note authentication requirements

2. **Document Each Endpoint**
   - Request format
   - Response format
   - Error responses
   - Examples

### For README

1. **Analyze Project**
   - Purpose and features
   - Installation steps
   - Usage examples
   - Configuration

2. **Generate/Update**
   - Clear structure
   - Working examples
   - Up-to-date info

### For Changelog

1. **Analyze Commits**
   ```bash
   git log --oneline --since="last release"
   ```

2. **Categorize Changes**
   - Added
   - Changed
   - Fixed
   - Removed

## Templates

### Python Docstring
```python
def calculate_discount(price: float, percentage: float) -> float:
    """
    Calculate discounted price.

    Args:
        price: Original price in dollars.
        percentage: Discount percentage (0-100).

    Returns:
        The discounted price.

    Raises:
        ValueError: If percentage is not between 0 and 100.

    Example:
        >>> calculate_discount(100.0, 20)
        80.0
    """
```

### TypeScript JSDoc
```typescript
/**
 * Calculate discounted price.
 *
 * @param price - Original price in dollars
 * @param percentage - Discount percentage (0-100)
 * @returns The discounted price
 * @throws {RangeError} If percentage is not between 0 and 100
 *
 * @example
 * calculateDiscount(100, 20); // returns 80
 */
```

### API Endpoint
```markdown
## POST /api/orders

Create a new order.

### Authentication
Requires Bearer token.

### Request Body
```json
{
  "items": [
    { "productId": "123", "quantity": 2 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "zip": "10001"
  }
}
```

### Response (201 Created)
```json
{
  "id": "order_456",
  "status": "pending",
  "total": 99.99,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Errors
| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_ITEMS | Items array is empty |
| 401 | UNAUTHORIZED | Invalid or missing token |
| 422 | OUT_OF_STOCK | Item not available |
```

### README Section
```markdown
## Installation

```bash
npm install my-package
```

## Quick Start

```typescript
import { Client } from 'my-package';

const client = new Client({ apiKey: 'your-key' });
const result = await client.fetch();
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | Your API key |
| `timeout` | number | 5000 | Request timeout in ms |
```

### Changelog Entry
```markdown
## [1.2.0] - 2024-01-15

### Added
- Password reset functionality (#123)
- Email verification for new accounts

### Changed
- Improved error messages for validation failures
- Updated dependencies to latest versions

### Fixed
- Race condition in session handling (#456)
- Incorrect timezone in date displays
```

## Output

### Documentation Report

```markdown
## Documentation Updated

### Files Modified
- `src/services/auth.ts` - Added JSDoc comments
- `docs/api/auth.md` - New API documentation
- `README.md` - Updated configuration section

### Documentation Added

#### Code Comments
- `AuthService.login()` - Full JSDoc with examples
- `AuthService.logout()` - Parameter documentation
- `validateToken()` - Return type and exceptions

#### API Documentation
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh

### Coverage
- Functions documented: 15/18 (83%)
- Endpoints documented: 12/12 (100%)

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Documentation**
   - [ ] Verify documentation is complete and accurate
   - [ ] Check all code examples are correct and tested
   - [ ] Confirm documentation follows project style
   - [ ] Review for clarity and completeness

2. **Next Commands to Use**
   - Use `/review [doc-file]` to review documentation quality
   - Use `/commit [message]` to commit documentation changes
   - Use `/ship [message]` to commit and create PR for docs
   - Use `/test [scope]` to verify code examples work
   - Use `/feature [description]` if docs reveal missing features

3. **Update or Improve**
   - To update: Edit documentation files directly
   - To improve: Add more examples, diagrams, or explanations
   - To extend: Create additional documentation with `/doc [target]`

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/review` | Review documentation | After generating to verify quality |
| `/commit` | Commit documentation | When docs are ready |
| `/ship` | Ship documentation | To commit and create PR |
| `/test` | Test code examples | To verify examples in docs work |

### Common Workflows

**Workflow: Doc → Review → Ship**
```
/doc "api" → /review "api-docs.md" → /ship "docs: update API documentation"
```

**Workflow: Doc → Test Examples → Ship**
```
/doc "readme" → /test "examples" → /ship "docs: update README"
```

### Tips

- 💡 **Tip**: Always test code examples in documentation
- 💡 **Tip**: Keep documentation up-to-date with code changes
- 💡 **Tip**: Use `/review` to ensure documentation quality
- ⚠️ **Warning**: Don't include outdated or incorrect examples
- ⚠️ **Warning**: Ensure documentation matches actual code behavior
```

<!-- CUSTOMIZATION POINT -->
## Variations

Modify behavior via CLAUDE.md:
- Documentation format
- Required sections
- Example requirements
- API documentation tool

# /test - Test Generation Command

## Purpose

Generate comprehensive tests for specified code including unit tests, integration tests, and edge cases.

## Usage

```
/test [file path | function name | 'coverage' | 'all']
```

## Arguments

- `$ARGUMENTS`:
  - File path: Generate tests for specific file
  - Function name: Generate tests for specific function
  - `coverage`: Analyze and improve test coverage
  - `all`: Run all tests and report results

---

Generate comprehensive tests for: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/test`)
- Preferred skills: `test-first`, `testing-automation`
- Recommended agent: `tester`

## Workflow

### For File/Function Testing

1. **Analyze Target Code**
   - Read the code to understand functionality
   - Identify inputs, outputs, and side effects
   - Note dependencies to mock
   - Find existing tests for patterns

2. **Design Test Cases**
   - **Happy Path**: Normal operation with valid inputs
   - **Edge Cases**: Boundary values, empty inputs, limits
   - **Error Cases**: Invalid inputs, exceptions
   - **Integration Points**: External dependencies

3. **Generate Tests**
   - Follow project testing conventions
   - Use appropriate mocking strategies
   - Write clear, descriptive test names
   - Include setup and teardown

4. **Run and Verify**
   ```bash
   # Python
   pytest [test_file] -v

   # TypeScript
   pnpm test [test_file]
   ```

### For Coverage Analysis

1. **Run Coverage Report**
   ```bash
   # Python
   pytest --cov=src --cov-report=term-missing

   # TypeScript
   pnpm test --coverage
   ```

2. **Identify Gaps**
   - Find untested functions
   - Identify untested branches
   - Note missing edge cases

3. **Generate Missing Tests**
   - Prioritize by risk
   - Focus on critical paths
   - Add edge case coverage

## Test Templates

### Python (pytest)

```python
import pytest
from unittest.mock import Mock, patch
from src.module import function_under_test

class TestFunctionUnderTest:
    """Tests for function_under_test."""

    def test_with_valid_input_returns_expected(self):
        """Test that valid input produces expected output."""
        result = function_under_test("valid_input")
        assert result == "expected_output"

    def test_with_empty_input_returns_default(self):
        """Test that empty input returns default value."""
        result = function_under_test("")
        assert result == "default"

    def test_with_invalid_input_raises_error(self):
        """Test that invalid input raises ValueError."""
        with pytest.raises(ValueError, match="Invalid input"):
            function_under_test(None)

    @pytest.mark.parametrize("input_val,expected", [
        ("a", "result_a"),
        ("b", "result_b"),
        ("c", "result_c"),
    ])
    def test_parametrized_inputs(self, input_val, expected):
        """Test multiple input variations."""
        assert function_under_test(input_val) == expected

    @patch('src.module.external_service')
    def test_with_mocked_dependency(self, mock_service):
        """Test with mocked external dependency."""
        mock_service.call.return_value = "mocked_result"
        result = function_under_test("input")
        assert result == "expected_with_mock"
        mock_service.call.assert_called_once_with("input")
```

### TypeScript (vitest)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { functionUnderTest } from './module';

describe('functionUnderTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return expected output for valid input', () => {
    const result = functionUnderTest('valid_input');
    expect(result).toBe('expected_output');
  });

  it('should return default for empty input', () => {
    const result = functionUnderTest('');
    expect(result).toBe('default');
  });

  it('should throw error for invalid input', () => {
    expect(() => functionUnderTest(null)).toThrow('Invalid input');
  });

  it.each([
    ['a', 'result_a'],
    ['b', 'result_b'],
    ['c', 'result_c'],
  ])('should handle input %s correctly', (input, expected) => {
    expect(functionUnderTest(input)).toBe(expected);
  });

  it('should work with mocked dependency', async () => {
    vi.mock('./external-service', () => ({
      call: vi.fn().mockResolvedValue('mocked_result'),
    }));

    const result = await functionUnderTest('input');
    expect(result).toBe('expected_with_mock');
  });
});
```

### React Component (Testing Library)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserForm } from './UserForm';

describe('UserForm', () => {
  it('should render form fields', () => {
    render(<UserForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should call onSubmit with form data', async () => {
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'john@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'John',
        email: 'john@example.com',
      });
    });
  });

  it('should show validation error for invalid email', async () => {
    render(<UserForm onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'invalid' },
    });
    fireEvent.blur(screen.getByLabelText(/email/i));

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });
});
```

## Output

### Test Generation Report

```markdown
## Tests Generated

### Target
`src/services/auth.ts` - AuthService class

### Tests Created
- `tests/services/auth.test.ts`

### Test Cases
1. `login_with_valid_credentials_returns_token` - Happy path
2. `login_with_invalid_password_throws_error` - Error case
3. `login_with_nonexistent_user_throws_error` - Error case
4. `refresh_token_with_valid_token_returns_new_token` - Happy path
5. `refresh_token_with_expired_token_throws_error` - Edge case
6. `logout_invalidates_session` - Happy path

### Coverage Impact
- Before: 65%
- After: 88%
- New lines covered: 42

### Run Tests
```bash
pytest tests/services/auth.test.ts -v
```

### Notes
- Mocked database calls using pytest-mock
- Added edge case for token expiration
- Consider adding integration tests for full auth flow
```

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--coverage` | Generate coverage-focused tests | `--coverage` |
| `--type=[type]` | Test type to generate | `--type=integration` |
| `--format=[fmt]` | Output format (concise/detailed) | `--format=concise` |
| `--framework=[fw]` | Specify test framework | `--framework=vitest` |
| `--tdd` | Generate TDD-style with failing tests first | `--tdd` |
| `--edge-cases` | Focus on edge case coverage | `--edge-cases` |

### Flag Usage Examples

```bash
/test --coverage src/services/
/test --type=integration src/api/users.ts
/test --tdd src/utils/validator.ts
/test --edge-cases --framework=pytest src/models/user.py
```

### Test Types

| Type | Description |
|------|-------------|
| `unit` | Isolated function tests (default) |
| `integration` | Multi-component tests |
| `e2e` | End-to-end workflow tests |
| `snapshot` | Snapshot tests for UI |
| `property` | Property-based testing |

### Framework Options

| Framework | Language |
|-----------|----------|
| `pytest` | Python |
| `vitest` | TypeScript/JavaScript |
| `jest` | JavaScript |
| `playwright` | E2E (any) |

## MCP Integration

This command leverages MCP servers for enhanced testing:

### Playwright - E2E Testing (Primary for UI)
```
For E2E and browser tests:
- Use Playwright for cross-browser testing
- Automate user flow verification
- Capture screenshots for visual testing
- Test on different device emulations
```

### Filesystem - Test File Management
```
For test file operations:
- Use directory_tree to find test directories
- Use search_files to find existing tests
- Use read_file to check test patterns
- Use write_file to create new test files
```

### Context7 - Testing Best Practices
```
For framework-specific testing:
- Fetch current testing library docs
- Get latest assertions and matchers
- Find recommended testing patterns
```

### Memory - Test Patterns
```
Recall testing context:
- Remember project testing conventions
- Recall mock patterns used previously
- Store common test fixtures
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Tests**
   - [ ] Verify tests cover all scenarios and edge cases
   - [ ] Check test names are descriptive and follow conventions
   - [ ] Confirm edge cases and error scenarios are covered
   - [ ] Run tests to ensure they pass and are valid

2. **Next Commands to Use**
   - Use `/review [test-file]` to review test quality and coverage
   - Use `/tdd [feature]` for test-driven development workflow
   - Use `/feature [description]` to implement features with tests
   - Use `/fix [error]` if tests reveal bugs or failures

3. **Update or Improve**
   - To update: Edit test files directly to add more cases
   - To improve: Add more test cases or improve coverage
   - To extend: Add integration or E2E tests with `/test --type=e2e`

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/tdd` | Test-driven development | For new features (write tests first) |
| `/review` | Review test quality | After generating tests to verify quality |
| `/feature` | Full feature with tests | When implementing features (includes tests) |
| `/fix` | Fix bugs found by tests | When tests fail or reveal bugs |
| `/refactor` | Improve code structure | After tests pass, improve code quality |

### Common Workflows

**Workflow: TDD Development**
```
/tdd "feature" → Tests generated → Implementation → Tests pass → /review
```

**Workflow: Test → Review → Fix**
```
/test src/service.ts → /review tests/service.test.ts → /fix "test failures"
```

**Workflow: Feature → Test → Review**
```
/feature "new feature" → /test src/feature/ → /review tests/feature.test.ts
```

### Tips

- 💡 **Tip**: Use `/tdd` for critical features to ensure test coverage from the start
- 💡 **Tip**: Review generated tests before running to understand what they test
- 💡 **Tip**: Run tests after generation to verify they work correctly
- 💡 **Tip**: Use `--coverage` flag to check test coverage after generation
- ⚠️ **Warning**: Always run tests after generation to ensure they compile and pass
- ⚠️ **Warning**: Don't skip test review - generated tests may need adjustments

### File Naming

**Reference**: `.cursor/rules/file-naming-prefix.mdc`

Test files follow standard naming conventions:
- Python: `test_[module].py` or `[module]_test.py`
- TypeScript: `[component].test.ts` or `[component].spec.ts`
- Location: Adjacent to source files or in `tests/` directory

<!-- CUSTOMIZATION POINT -->
## Variations

Modify behavior via CLAUDE.md:
- Preferred test framework
- Minimum coverage targets
- Test naming conventions
- Required test categories

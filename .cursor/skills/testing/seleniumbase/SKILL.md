---
name: seleniumbase
description: Build and maintain browser E2E tests with SeleniumBase using stable selectors, deterministic waits, and CI-friendly execution. Use when users mention SeleniumBase, UI automation, browser tests, flaky E2E tests, or visual/browser regression checks.
---

# SeleniumBase

## What this skill does
- Create reliable SeleniumBase tests for critical user flows.
- Reduce flakiness with stable selectors and explicit state assertions.
- Structure page interactions using reusable helpers and base fixtures.
- Configure headless and CI-friendly runs with clear artifacts.
- Enforce secure test practices around credentials and data handling.

## When to use
Use this skill when:
- Writing new E2E tests for web UI flows.
- Fixing flaky Selenium/SeleniumBase tests.
- Running browser tests in CI or containerized environments.
- Debugging timing, selector, or cross-browser behavior issues.

## Test design principles
1. Prefer user-visible outcomes over implementation details.
2. Use deterministic selectors:
   - First choice: `data-testid` or stable semantic attributes.
   - Avoid brittle CSS chains tied to layout.
3. Keep each test focused on one business behavior.
4. Isolate test data; avoid cross-test dependencies.
5. Clean up created data when tests mutate shared environments.

## SeleniumBase workflow
1. Choose scenario and define expected user-visible result.
2. Prepare fixtures:
   - test user/account from env vars,
   - seeded data or API bootstrap step.
3. Implement test with SeleniumBase `BaseCase`:
   - open page,
   - authenticate if needed,
   - perform actions,
   - assert final state.
4. Run locally in headed mode first, then headless.
5. Add CI command and artifact collection (screenshots/logs) on failure.

## Flake reduction checklist
- Wait on state, not time (`wait_for_element_visible`, `assert_text`, URL checks).
- Avoid `sleep()` except for proven browser race workarounds.
- Use retry patterns sparingly; fix root cause first.
- Reset browser/session state between tests.
- Keep timeouts explicit and consistent across suites.

## Security and secrets
- Never hardcode credentials, API keys, or tenant secrets.
- Read test credentials from environment variables.
- Do not log tokens or sensitive user data in test output.
- Use lowest-privilege test accounts for protected flows.

## Minimal test template
```python
from seleniumbase import BaseCase


class TestLogin(BaseCase):
    def test_user_can_login(self):
        self.open("http://localhost:5173/login")
        self.type('[data-testid="email"]', self.get_env("E2E_USER_EMAIL"))
        self.type('[data-testid="password"]', self.get_env("E2E_USER_PASSWORD"))
        self.click('[data-testid="submit-login"]')
        self.assert_element('[data-testid="dashboard-page"]')
```

## CI execution hints
- Typical run: `pytest tests/e2e --headless --browser=chrome`
- On failures, preserve SeleniumBase artifacts (`latest_logs/`, screenshots, page source) as CI artifacts.
- Keep browser and driver versions pinned in CI image to reduce drift.

## Additional resources
- Add local `reference.md` for project-specific commands, fixtures, and environment setup when test suite grows.

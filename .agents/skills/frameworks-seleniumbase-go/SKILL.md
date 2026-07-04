---
name: frameworks-seleniumbase-go
description: Build Go-native browser automation with seleniumbase-go (Playwright-based), including profile persistence, cookie restore, retries, and integration patterns for desktop/veo3-plus.
---

# seleniumbase-go

## Description

Use `seleniumbase-go` to implement Go-native browser automation with a SeleniumBase-style API on top of Playwright.

This skill follows the official docs and is optimized for:
- writing robust Go automation with `sb.Run`, `sb.RunTest`, and `sb.NewPage`
- using the documented option system (`WithHeadless`, `WithTimeout`, `WithStealth`, etc.)
- applying supported selector translation (`id=`, `name=`, `link=`, `css=`, `xpath=`, Playwright-native selectors)
- integrating safely into `desktop/veo3-plus` profile/cookie workflows

## When to Use

- Building or refactoring Go browser flows using seleniumbase-go
- Converting Python/SeleniumBase flows to Go with API parity patterns
- Implementing test automation and runtime automation with shared primitives
- Adding profile persistence/cookie reuse for `desktop/veo3-plus`

---

## Installation and Runtime

### Install dependency

```bash
go get github.com/kyungw00k/seleniumbase-go
```

### Browser/runtime behavior

- seleniumbase-go auto-detects system Chrome and can auto-install bundled Playwright Chromium when needed.
- First run may be slower due to browser bootstrap.
- `WithStealth(true)` supports Chromium only and requires Chrome installed (or `WithChromePath`).

---

## Core Execution Patterns

### `sb.Run` (script/runtime flow)

Use for single automation jobs:

```go
err := sb.Run(func(p *sb.Page) error {
    if err := p.Open("https://example.com"); err != nil {
        return err
    }
    return p.AssertElement("h1")
}, sb.WithBrowser("chromium"), sb.WithHeadless(true))
```

### `sb.RunTest` (testing.T integration)

```go
func TestLogin(t *testing.T) {
    sb.RunTest(t, func(p *sb.Page) {
        p.Open("https://www.saucedemo.com")
        p.Type("#user-name", "standard_user")
        p.Type("#password", "secret_sauce")
        p.Click("#login-button")
        p.AssertElement("div.inventory_list")
    }, sb.WithHeadless(true))
}
```

Errors/panics in the callback are forwarded to `t.Fatal`.

### `sb.NewPage` (manual lifecycle)

Use when you need explicit lifecycle control:

```go
page, cleanup, err := sb.NewPage(sb.WithBrowser("chromium"), sb.WithHeadless(false))
if err != nil { return err }
defer cleanup()
```

---

## Configuration Options (Official)

Pass options to `sb.Run`, `sb.RunTest`, or `sb.NewPage`.

- Browser/session:
  - `WithBrowser("chromium"|"firefox"|"webkit")`
  - `WithHeadless(bool)`
  - `WithChannel("chrome"|"msedge")`
  - `WithIncognito(bool)`
  - `WithUserDataDir(dir)`
  - `WithChromePath(path)`
  - `WithExtraArgs(args...)`
- Networking/environment:
  - `WithProxy(server)`
  - `WithLocale(code)`
  - `WithUserAgent(agent)`
  - `WithIgnoreHTTPSErrors(bool)`
  - `WithRemoteCDPURL(url)`
  - `WithRemoteWSURL(url)`
- Timing/visual/device:
  - `WithTimeout(d)`
  - `WithSlowMo(ms)`
  - `WithViewportSize(w, h)`
  - `WithColorScheme("dark"|"light"|"no-preference")`
  - `WithMobile(bool)`
  - `WithDevice(name)`
- Tooling features:
  - `WithDemoMode(bool)`
  - `WithStealth(bool)` (Chromium only)
  - `WithScreenshotOnFailure(bool)`
  - `WithRecordVideo(dir)`
  - `WithRecordHAR(path)`
  - `WithDisableCSP(bool)`

Timeout constants:
- `sb.MiniTimeout` (2s)
- `sb.SmallTimeout` (7s)
- `sb.LargeTimeout` (10s default)
- `sb.ExtremeTimeout` (30s)
- `sb.PageLoadTimeout` (120s)

---

## API Surface (Official Groups)

All methods are on `*sb.Page`; methods that can fail return `error`.

- Navigation: `Open`, `Refresh`, `GoBack`, `GoForward`, `GetTitle`, `GetPageSource`
- Interaction: `Click`, `Type`, `SendKeys`, `Press`, `Hover`, `Check`, `Uncheck`, `SelectOption*`, `DragAndDrop`, `JsClick`
- Assertions: `AssertElement`, `AssertText`, `AssertExactText`, `AssertURLContains`, `AssertNoJsErrors`
- Wait: `WaitForElement`, `WaitForText`, `WaitForLoadState`, `WaitForURL`
- Query/state: `GetText`, `GetAttribute`, `GetValue`, `IsVisible`, `Count`, `FindElements`
- Cookies/storage: `GetCookies`, `AddCookie`, `SaveCookies`, `LoadCookies`, `SetLocalStorage`, `SetSessionStorage`
- JavaScript: `Evaluate`, `EvalOnSelector`, `SetAttribute`, `RemoveElement`, `SetValue`
- Window/frame: `OpenNewTab`, `SwitchToTab`, `SetViewportSize`, `FrameLocator`
- Output/debug: `Screenshot`, `FullPageScreenshot`, `ElementScreenshot`, `PDF` (Chromium), console capture
- Network/download: `Route`, `MockAPI`, `WaitForDownload`, `SaveDownload`
- Advanced: deferred assertions, highlight helpers, MFA/TOTP helpers

If wrapper methods are missing for a specific need, use escape hatches:
- `page.Playwright()` for raw `playwright.Page`
- `page.Context()` for raw `playwright.BrowserContext`
- `page.Locator(...)` for translated-locator access

---

## Selector Translation (Official)

Selectors passed as `sel string` are translated before Playwright execution.

Supported forms:
- `id=myId` -> `#myId`
- `name=fieldName` -> `[name="fieldName"]`
- `link=Exact Text` -> `a:has-text("Exact Text")`
- `partial_link=Text` -> `a:has-text("Text")`
- `css=div.header` -> `div.header`
- `xpath=//h1` -> `//h1`
- bare CSS -> passed through
- Playwright-native selectors (`text=`, `role=`, `label=`) -> passed through

XPath that starts with `//`, `./`, or `(//` is passed through directly.

---

## Feature Modules (Official)

- Recorder:
  - `StartRecording`/`StopRecording` + `GenerateGoCode`
  - `RunRecorder("recorded_test.go", ...)`
- Stealth mode:
  - avoids common Playwright launch fingerprints
  - Chromium only
- Visual testing:
  - `CheckWindow`, `AssertVisualMatch`, `UpdateBaseline`
  - baseline outputs in `visual_baseline/`
- Parallel runner:
  - `RunParallel`, `RunParallelTest`, `ParallelSummary`
- Reports:
  - `GenerateJUnitReport`, `GenerateHTMLReport`
- Remote browser:
  - CDP/WS endpoints via `WithRemoteCDPURL` / `WithRemoteWSURL`
- MasterQA:
  - manual verification checkpoints with `RunMasterQA`
- Browser bootstrap helpers:
  - `EnsureBrowser`, `FindSystemChrome`

---

## Integration Guidance for `desktop/veo3-plus`

Keep app architecture clean while using official seleniumbase-go APIs:

1. Put concrete seleniumbase-go code in a dedicated automation package (for example `internal/services/workflow` or `internal/automation/...`), not UI layers.
2. Use deterministic per-account profile dirs: `data/profiles/<account_id>`, with strict account ID validation.
3. Restore cookies before opening authenticated flows; capture and persist cookies after successful auth.
4. Use layered timeouts and bounded retries around browser startup/navigation.
5. Emit structured logs with context fields (`account_id`, `profile_dir`, `step`, `attempt`).

---

## Testing Checklist

Before merging:

1. Unit tests for:
   - profile path validation
   - cookie persist/load paths
   - retry/backoff decision logic
2. Integration smoke:
   - launch browser with intended options
   - selector interactions and assertions on target flow
3. If using batch workflows:
   - fail-soft behavior for per-item failures
4. Resource hygiene:
   - cleanup always called
   - no orphan browser processes or stale profile locks

---

## Common Pitfalls

- **Ignoring official selector formats**: use documented prefixes or Playwright-native selectors.
- **Overusing brittle CSS chains**: prefer stable semantics (`role=`, `label=`, `text=`, IDs).
- **No timeout strategy**: avoid infinite waits and single giant timeouts.
- **Leaking library calls into app/UI layers**: keep automation logic behind boundaries.
- **Unsafe profile path handling**: always validate account-derived directories.

---

## Definition of Done

A seleniumbase-go implementation is complete when:
1. It uses documented seleniumbase-go APIs/options (or explicit Playwright escape hatches where needed).
2. Selector usage follows official translation rules.
3. Timeout/retry/logging hygiene is in place.
4. Profile/cookie persistence behavior is deterministic and safe.
5. Unit/integration tests are green and stable.

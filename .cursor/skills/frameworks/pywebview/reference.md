# Pywebview Reference

## Official docs map
- Guide intro: scope, platform support, and high-level capabilities.
- Guide usage: lifecycle, window API, events, and server behavior.
- API: authoritative signatures and runtime properties.
- Examples: validated implementation patterns for specific features.

## Core primitives

### `webview.create_window(...)`
Primary constructor for a desktop window.

Common arguments:
- `title`: window title.
- `url`: remote URL, local path, or WSGI app.
- `html`: inline HTML (takes precedence over `url`).
- `js_api`: Python object exposed as `pywebview.api`.
- `width`, `height`, `resizable`, `fullscreen`, `frameless`, `minimized`.

### `webview.start(...)`
Starts GUI loop and displays created windows.

Key notes:
- Must run on main thread.
- Blocks until all windows close.
- Use callback form `webview.start(func, *args)` for startup/background orchestration.
- Useful options: `debug`, `gui`, `http_server`, `user_agent`, `ssl`.

## JavaScript <-> Python communication

### Python -> JavaScript
- `window.evaluate_js(script, callback=None)`
  - Returns last expression value.
  - Converts JS types to Python (`object -> dict`, `array -> list`).
  - Raises `JavascriptException` on errors.
  - Uses `eval` internally.
- `window.run_js(script)`
  - Fire-and-forget JS execution.
  - No return value and no exception bridge.
  - Useful for strict CSP contexts where `eval` is blocked.

### JavaScript -> Python
Two options:
1. `js_api=ApiInstance` in `create_window(...)`.
2. Runtime function exposure with `window.expose(fn1, fn2, ...)`.

Behavior:
- Called as `pywebview.api.methodName(...)` in JS.
- Always Promise-based in JS.
- Exceptions become rejected JS `Error`.
- Exposed functions run on separate threads (not thread-safe by default).

### Readiness event
`pywebview.api` may not be ready on `window.onload`.
Use:
```javascript
window.addEventListener('pywebviewready', () => {
  // safe to call pywebview.api.*
});
```

## Shared state (`6.0+`)
- Python side: `window.state`
- JS side: `pywebview.state`
- Top-level property changes sync bidirectionally per window.
- Subscribe on JS side: `pywebview.state += (eventType, key, value) => { ... }`

## Window lifecycle and events
Useful window events include:
- `loaded`, `before_load`, `before_show`, `shown`
- `resized`, `moved`, `minimized`, `maximized`, `restored`
- `closing`, `closed`

Subscribe in Python:
```python
window.events.closing += on_closing
window.events.shown += on_shown
```

## Reusing existing frontend

### Dev mode with frontend dev server
- Run frontend on local port (example `http://localhost:5173`).
- Point `create_window(..., url='http://localhost:5173')`.
- Keep hot-reload on frontend toolchain.

### Static bundle mode
- Build frontend to static artifacts.
- Point `create_window(..., url='dist/index.html')` (relative path served by pywebview local server).
- Avoid direct `file://` unless necessary for portability reasons.

### WSGI mode
- Pass WSGI app object directly as `url` argument for local backend + frontend composition.

## Examples catalog (recommended starting points)
- **Communication**: `Js Api`, `Expose`, `Evaluate Js`, `Evaluate Js Async`, `Run Js`.
- **Window lifecycle**: `Events`, `Window State`, `Destroy Window`, `Focus`, `Show/Hide`.
- **Layout/windowing**: `Frameless`, `Transparent`, `On Top`, `Fullscreen`, `Resize`, `Move`.
- **System integration**: `Menu`, `Open File Dialog`, `Save File Dialog`, `Screens`, `Cookies`.
- **Serving modes**: `Http Server`, `Localhost Ssl`, `Multiple Servers`.
- **App templates**: React boilerplates, serverless app, and Flask HTTP server app.

## Full sidebar examples index
Extracted from the pywebview examples sidebar and mapped to direct reference pages:

- [Cef](https://pywebview.flowrl.com/examples/cef.html)
- [Change Url](https://pywebview.flowrl.com/examples/change_url.html)
- [Confirm Close](https://pywebview.flowrl.com/examples/confirm_close.html)
- [Confirmation Dialog](https://pywebview.flowrl.com/examples/confirmation_dialog.html)
- [Cookies](https://pywebview.flowrl.com/examples/cookies.html)
- [Debug](https://pywebview.flowrl.com/examples/debug.html)
- [Destroy Window](https://pywebview.flowrl.com/examples/destroy_window.html)
- [Dom Events](https://pywebview.flowrl.com/examples/dom_events.html)
- [Dom Manipulation](https://pywebview.flowrl.com/examples/dom_manipulation.html)
- [Dom Traversal](https://pywebview.flowrl.com/examples/dom_traversal.html)
- [Downloads](https://pywebview.flowrl.com/examples/downloads.html)
- [Drag Drop](https://pywebview.flowrl.com/examples/drag_drop.html)
- [Drag Region](https://pywebview.flowrl.com/examples/drag_region.html)
- [Evaluate Js](https://pywebview.flowrl.com/examples/evaluate_js.html)
- [Evaluate Js Async](https://pywebview.flowrl.com/examples/evaluate_js_async.html)
- [Events](https://pywebview.flowrl.com/examples/events.html)
- [Expose](https://pywebview.flowrl.com/examples/expose.html)
- [Focus](https://pywebview.flowrl.com/examples/focus.html)
- [Frameless](https://pywebview.flowrl.com/examples/frameless.html)
- [Fullscreen](https://pywebview.flowrl.com/examples/fullscreen.html)
- [Get Current Url](https://pywebview.flowrl.com/examples/get_current_url.html)
- [Get Elements](https://pywebview.flowrl.com/examples/get_elements.html)
- [Headers](https://pywebview.flowrl.com/examples/headers.html)
- [Hide Window](https://pywebview.flowrl.com/examples/hide_window.html)
- [Http Server](https://pywebview.flowrl.com/examples/http_server.html)
- [Icon](https://pywebview.flowrl.com/examples/icon.html)
- [Js Api](https://pywebview.flowrl.com/examples/js_api.html)
- [Links](https://pywebview.flowrl.com/examples/links.html)
- [Load Css](https://pywebview.flowrl.com/examples/load_css.html)
- [Load Html](https://pywebview.flowrl.com/examples/load_html.html)
- [Loading Animation](https://pywebview.flowrl.com/examples/loading_animation.html)
- [Localhost Ssl](https://pywebview.flowrl.com/examples/localhost_ssl.html)
- [Localization](https://pywebview.flowrl.com/examples/localization.html)
- [Menu](https://pywebview.flowrl.com/examples/menu.html)
- [Min Size](https://pywebview.flowrl.com/examples/min_size.html)
- [Move Window](https://pywebview.flowrl.com/examples/move_window.html)
- [Multiple Servers](https://pywebview.flowrl.com/examples/multiple_servers.html)
- [Multiple Windows](https://pywebview.flowrl.com/examples/multiple_windows.html)
- [Multiprocess](https://pywebview.flowrl.com/examples/multiprocess.html)
- [On Top](https://pywebview.flowrl.com/examples/on_top.html)
- [Open File Dialog](https://pywebview.flowrl.com/examples/open_file_dialog.html)
- [Py2app Setup](https://pywebview.flowrl.com/examples/py2app_setup.html)
- [Pystray Icon](https://pywebview.flowrl.com/examples/pystray_icon.html)
- [Qt Test](https://pywebview.flowrl.com/examples/qt_test.html)
- [Remote Debugging](https://pywebview.flowrl.com/examples/remote_debugging.html)
- [Resize](https://pywebview.flowrl.com/examples/resize.html)
- [Run Js](https://pywebview.flowrl.com/examples/run_js.html)
- [Save File Dialog](https://pywebview.flowrl.com/examples/save_file_dialog.html)
- [Screens](https://pywebview.flowrl.com/examples/screens.html)
- [Settings](https://pywebview.flowrl.com/examples/settings.html)
- [Simple Browser](https://pywebview.flowrl.com/examples/simple_browser.html)
- [State](https://pywebview.flowrl.com/examples/state.html)
- [Toggle Fullscreen](https://pywebview.flowrl.com/examples/toggle_fullscreen.html)
- [Transparent](https://pywebview.flowrl.com/examples/transparent.html)
- [User Agent](https://pywebview.flowrl.com/examples/user_agent.html)
- [Vibrancy](https://pywebview.flowrl.com/examples/vibrancy.html)
- [Window State](https://pywebview.flowrl.com/examples/window_state.html)
- [Window Title Change](https://pywebview.flowrl.com/examples/window_title_change.html)

## Security baseline
- Prefer local SSL when using built-in HTTP server:
  - `webview.start(ssl=True)` with `cryptography` installed.
- For local REST endpoints:
  - Use CSRF token exposed at:
    - Python: `webview.token`
    - JavaScript: `window.pywebview.token`
- Keep exposed APIs minimal; validate all inputs crossing JS boundary.

## Minimal architecture template
```text
desktop-app/
  src/
    app.py                # create_window + start
    api.py                # js_api methods
    services/             # background/business logic
  frontend/               # existing React/Vite or static app
```

## Recommended development loop
1. Implement one small API method in `js_api`.
2. Call it from frontend after `pywebviewready`.
3. Add error path validation (bad payload, timeout, exceptions).
4. Stress-test long task path to ensure no UI freeze.
5. Harden token checks if using local REST endpoints.
6. Compare final approach with the closest official example before merge.

---
name: pywebview
description: Build desktop apps with pywebview using window lifecycle, JS-Python bridge, state sync, threading, and security practices. Use when users mention pywebview, desktop webview app, create_window, webview.start, or Python-JavaScript bridge.
---

# Pywebview

## What this skill does
- Scaffold and structure pywebview desktop apps.
- Integrate existing frontend assets into a native Python window.
- Implement two-way communication via `js_api`, `window.expose`, and `evaluate_js`.
- Handle GUI lifecycle and background work without freezing UI.
- Apply secure local-server and token handling patterns.
- Apply cross-platform considerations for Windows, macOS, Linux, and Android.

## When to use
Use this skill when working on a desktop app powered by pywebview, especially for:
- Creating or refactoring `webview.create_window(...)` + `webview.start(...)`.
- Reusing an existing frontend (React/Vite/static) inside pywebview.
- Designing Python <-> JavaScript RPC/API boundaries.
- Troubleshooting load, threading, or event timing issues.

## Quick workflow
1. **Choose content source**
   - Remote URL.
   - Local HTML path (auto local server for relative paths).
   - WSGI app object (Flask/FastAPI adapter) when backend routes are needed.
2. **Create window**
   - Set title, url/html, dimensions, and `js_api` only as needed.
3. **Start loop on main thread**
   - Always call `webview.start(...)` from main thread.
   - Put backend logic in `webview.start(func, args...)` or worker threads.
4. **Bridge JS <-> Python**
   - JS to Python: `pywebview.api.methodName(...).then(...)`.
   - Python to JS: `window.evaluate_js(...)` or `window.run_js(...)`.
5. **Harden and verify**
   - If local HTTP server is used, enable `ssl=True` when feasible.
   - For REST endpoints, validate CSRF token parity (`webview.token` vs `window.pywebview.token`).
   - Validate `pywebviewready` timing before calling `pywebview.api`.

## Docs-first research flow
When asked to research pywebview before implementation, follow this order:
1. Read Guide intro and usage to confirm architecture and lifecycle.
2. Read API docs for exact signatures of methods being implemented.
3. Use Examples catalog to pick closest working sample before coding.
4. Prefer proven example patterns over inventing new integration style.

# Debugging | pywebview

# Debugging

10/19/18Less than 1 minute

---


# Javascript–Python bridge | pywebview

# Javascript–Python bridge

11/29/19About 2 min

---

# [Javascript–Python bridge](#javascript–python-bridge)

_pywebview_ offers two-way communication between Javascript and Python, enabling interaction between the two languages without a HTTP server.

## [Shared state](#shared-state)

`NEW 6.0` Data can be shared via the `Window.state` (Python) and `pywebview.state` (Javascript) objects. Modifying any property on either state object will result in the state being updated on the other side and vice versa. For example, setting `window.state.hello = 'world'` in Python will automatically propagate to `pywebview.state.hello` in Javascript. Only changes on the top level are propagated, ie if you mutate an object, it won't be updated on the other side. State is specific to its window and is preserved between page (re)loads. Binary data can be passed by converting it to Base64 or such.

State changes trigger events that can be subscribed to using `pywebview.state += lambda event_type, key, value: pass`. The `event_type` is either `change` or `delete`. The `key` is the property name, and the `value` is the property's value (`None` for delete events).

## [Run Javascript from Python](#run-javascript-from-python)

`window.evaluate_js(code, callback=None)` allows you to execute arbitrary Javascript code with a last value returned synchronously. If callback function is supplied, then promises are resolved and the callback function is called with the result as a parameter. Javascript types are converted to Python types, eg. JS objects to dicts, arrays to lists, undefined to None. If executed Javascript code results in an error, the error is rethrown as a `webview.util.JavascriptException` in Python. `evaluate_js` wraps Javascript code in a helper wrapper and executes it using `eval`.

[See example](/examples/evaluate_js.html)

`Window.run_js(code)` executes Javascript code as is without any wrapper code. `run_js` does not return a result or handle exceptions. This can be useful in scenarios, where you need to execute Javascript code with the `unsafe-eval` CSP policy set.

## [Run Python from Javascript](#run-python-from-javascript)

Executing Python functions from Javascript can be done with two different mechanisms.

-   by exposing an instance of a Python class to the `js_api` parameter of `create_window`. All the callable methods of the class will be exposed to the JS domain as `pywebview.api.method_name` with correct parameter signatures. Method name must not start with an underscore. Nested classes are allowed and are converted into a nested objects in Javascript. Class attributes starting with an underscore are not exposed. Also nested classes that have `_serializable = False` class attribute are ommited. See an [example](/examples/js_api.html).
    
-   by passing your function(s) to window object's `expose(func)`. This will expose a function or functions to the JS domain as `pywebview.api.func_name`. Unlike JS API, `expose` allows to expose functions also at the runtime. If there is a name clash between JS API and exposed functions, the latter takes precedence. See an [example](/examples/expose.html).
    

Exposed function returns a promise that is resolved to its result value. Exceptions are rejected and encapsulated inside a Javascript `Error` object. Stacktrace is available via `error.stack`. Exposed functions are executed in separate threads and are not thread-safe.

`pywebview.api` is not guaranteed to be available on the `window.onload` event. Subscribe to the `window.pywebviewready` event instead to make sure that `pywebview.api` is ready.

[See example](/examples/js_api.html).


# [Debugging](#debugging)

To debug Javascript, set `webview.start(debug=True)`.

```python
import webview

webview.create_window('Woah dude!', 'https://pywebview.flowrl.com/hello')
webview.start(debug=True)
```

This will enable web inspector on macOS, GTK and QT (QTWebEngine only). To open the web inspector on macOS, right click on the page and select Inspect. To disable auto-opening of DevTools, set `webview.settings['OPEN_DEVTOOLS_IN_DEBUG'] = False` before invoking `webview.start()`.

Debugging Python code on Android is not possible apart from printing message to `logcat`. Use `adb -s <DEVICE_ID> logcat | grep python` for displaying log messages related to Python. Frontend code can be debugged with WebView remote debugging. Refer to [this guide](https://developer.chrome.com/docs/devtools/remote-debugging/webviews/) for details.

Remote debugging is supported with the `edgechromium` and `qt` renderers. To take remote debugging into use set `webview.settings['REMOTE_DEBUGGING_PORT']` to the port number you wish to run a debugger on.

There is no way to attach an external debugger to MSHTML. The `debug` flag enables Javascript error reporting and right-click context menu.

To turn on debug logging for `pywebiew` itself, set `PYWEBVIEW_LOG=debug` environment variable before starting the application.


## Default implementation pattern
```python
import threading
import webview


class Api:
    def ping(self, name: str):
        return {"message": f"Hello {name}"}


def startup(window: webview.Window):
    def background():
        result = window.evaluate_js("1 + 1")
        print("JS returned:", result)

    threading.Thread(target=background, daemon=True).start()


if __name__ == "__main__":
    api = Api()
    window = webview.create_window(
        "Desktop App",
        url="http://localhost:5173",
        js_api=api,
        width=1200,
        height=800,
    )
    webview.start(startup, window, debug=False)
```

## Frontend bridge checklist
- Wait for `window.pywebviewready` before accessing `pywebview.api`.
- Treat all `pywebview.api.*` returns as Promise-based.
- Return only JSON-serializable/basic objects from Python methods.
- Keep long-running Python tasks off UI-sensitive paths.
- Prefer explicit method names and version your API surface when app grows.

## Security checklist
- Enable `webview.start(ssl=True)` for local server mode when practical (`cryptography` required).
- Use session token to protect local REST calls.
- Do not expose privileged methods blindly through `js_api`.
- Validate untrusted inputs from JS before file/OS operations.

## Troubleshooting quick hits
- **Window opens but app is blank**: verify URL/path, local dev server status, and CSP rules.
- **`pywebview.api` undefined**: bind handlers after `pywebviewready`.
- **UI freezes**: move heavy Python work into background thread/process.
- **JS eval fails under CSP**: use `window.run_js(...)` instead of `evaluate_js(...)` for strict CSP with `unsafe-eval` blocked.

## Example-driven implementation map
- **Bridge/API calls**: start from examples `Js Api`, `Expose`, `Evaluate Js`, `Run Js`.
- **Window behavior**: start from `Events`, `Window State`, `Multiple Windows`, `Frameless`.
- **Local serving**: start from `Http Server`, `Localhost Ssl`, `Multiple Servers`.
- **Frontend architecture**: use React boilerplate examples for packaging flow and project shape.
- **Server-backed flow**: use Flask HTTP server example when backend routes are required.

## Additional resources
- For API and patterns, see [reference.md](reference.md).
- For full per-feature examples links, use the "Full sidebar examples index" section in [reference.md](reference.md).

## References
- Example docs: [examples.md](examples.md).
- Function docs: [functions.md](functions.md).
- Official API docs: [pywebview API](https://pywebview.flowrl.com/api/)
- Official usage guide: [Usage](https://pywebview.flowrl.com/guide/usage)
- Official JS-Python bridge guide: [Javascript-Python bridge](https://pywebview.flowrl.com/guide/interdomain.html)
- Official security guide: [Security](https://pywebview.idepy.com/en/guide/security)
- Official examples:
  - [Expose example](https://pywebview.flowrl.com/3.7/examples/expose.html)
  - [Evaluate JS example](https://pywebview.flowrl.com/examples/evaluate_js)
  - [JS API example](https://pywebview.flowrl.com/3.7/examples/js_api)

## Expert guardrails derived from docs
- Always initialize bridge calls after `pywebviewready`; do not rely on `window.onload`.
- Keep `webview.start(...)` on the main thread; offload heavy work to background threads.
- Prefer least-privilege `js_api` surface and validate all JS-provided input.
- Use session token parity (`webview.token` and `window.pywebview.token`) when protecting local HTTP calls.
- If local server mode is used in sensitive flows, prefer TLS (`ssl=True`) where practical.

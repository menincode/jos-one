# Cef | pywebview

# Cef

2/13/19Less than 1 minute

---

# [Cef](#cef)

Create a CEF window with custom Chrome settings. Available only on Windows.

```python
import webview

# To pass custom settings to CEF, import and update settings dict
from webview.platforms.cef import browser_settings, settings

settings.update({'persist_session_cookies': True})
browser_settings.update({'dom_paste_disabled': False})

if __name__ == '__main__':
    webview.create_window('CEF browser', 'https://pywebview.flowrl.com/hello')
    webview.start(gui='cef')
```

# Change Url | pywebview

# Change Url

11/20/14Less than 1 minute

---

# [Change Url](#change-url)

Change URL ten seconds after the first URL is loaded.

```python
import time

import webview

def change_url(window):
    # wait a few seconds before changing url:
    time.sleep(10)

    # change url:
    window.load_url('https://pywebview.flowrl.com/hello')

if __name__ == '__main__':
    window = webview.create_window('URL Change Example', 'http://www.google.com')
    webview.start(change_url, window)
```

# Confirm Close | pywebview

# Confirm Close

Less than 1 minute

---

# [Confirm Close](#confirm-close)

A window with a quit confirmation dialog.

```python
import webview

if __name__ == '__main__':
    # Create a standard webview window
    webview.create_window(
        'Confirm Quit Example', 'https://pywebview.flowrl.com/hello', confirm_close=True
    )
    webview.start()
```

# Confirmation Dialog | pywebview

# Confirmation Dialog

11/15/22Less than 1 minute

---

# [Confirmation Dialog](#confirmation-dialog)

A window with a confirmation dialog.

```python
import webview

def open_confirmation_dialog(window):
    result = window.create_confirmation_dialog('Question', 'Are you ok with this?')
    if result:
        print('User clicked OK')
    else:
        print('User clicked Cancel')

if __name__ == '__main__':
    window = webview.create_window(
        'Confirmation dialog example', 'https://pywebview.flowrl.com/hello'
    )
    webview.start(open_confirmation_dialog, window)
```

# Cookies | pywebview

# Cookies

1/13/23Less than 1 minute

---

# [Cookies](#cookies)

A cookies and local storage example.

```python
import webview

def read_cookies(window):
    cookies = window.get_cookies()
    for c in cookies:
        print(c.output())

class Api:
    def clearCookies(self):
        window.clear_cookies()

if __name__ == '__main__':
    window = webview.create_window('Cookie example', 'assets/cookies.html', js_api=Api())

    # We need to explicitly set a http port to persist cookies between sessions
    webview.start(read_cookies, window, private_mode=False, http_server=True, http_port=13377)
```

# Debug | pywebview

# Debug

10/19/18Less than 1 minute

---

# [Debug](#debug)

A debug window example that opens DevTools.

```python
import webview

if __name__ == '__main__':
    webview.create_window('Debug window', 'https://pywebview.flowrl.com/hello')
    webview.start(debug=True)
```

# Destroy Window | pywebview

# Destroy Window

2/12/16Less than 1 minute

---

# [Destroy Window](#destroy-window)

Programmatically destroy created window after five seconds.

```python
import time

import webview

def destroy(window):
    # show the window for a few seconds before destroying it:
    time.sleep(5)
    print('Destroying window..')
    window.destroy()
    print('Destroyed!')

if __name__ == '__main__':
    window = webview.create_window('Destroy Window Example', 'https://pywebview.flowrl.com/hello')
    webview.start(destroy, window)
    print('Window is destroyed')
```

# Dom Events | pywebview

# Dom Events

Less than 1 minute

---

# [Dom Events](#dom-events)

This example demonstrates how to expose Python functions to the Javascript domain.

```python
import webview
from webview.dom import DOMEventHandler

window = None

def click_handler(e):
    print(e)

def input_handler(e):
    print(e['target']['value'])

def remove_handlers(scroll_event, click_event, input_event):
    scroll_event -= scroll_handler
    click_event -= click_handler
    input_event -= input_handler

def scroll_handler(e):
    scroll_top = window.dom.window.node['scrollY']
    print(f'Scroll position {scroll_top}')

def link_handler(e):
    print(f'Link target is {e["target"]["href"]}')

def bind(window):
    window.dom.document.events.scroll += DOMEventHandler(scroll_handler, debounce=100)

    button = window.dom.get_element('#button')
    button.events.click += click_handler

    input = window.dom.get_element('#input')
    input.events.input += input_handler

    remove_events = window.dom.get_element('#remove')
    remove_events.on(
        'click',
        lambda e: remove_handlers(
            window.dom.document.events.scroll, button.events.click, input.events.input
        ),
    )

    link = window.dom.get_element('#link')
    link.events.click += DOMEventHandler(link_handler, prevent_default=True)

if __name__ == '__main__':
    window = webview.create_window(
        'DOM Event Example',
        html="""
            <html>
                <head>
                <style>
                    button {
                        font-size: 100%;
                        padding: 0.5rem;
                        margin: 0.3rem;
                        text-transform: uppercase;
                    }
                </style>
                </head>
                <body style="height: 200vh;">
                    <div>
                        <input id="input" placeholder="Enter text">
                        <button id="button">Click me</button>
                        <a id="link" href="https://pywebview.flowrl.com">Click me</a>
                    </div>
                    <button id="remove" style="margin-top: 1rem;">Remove events</button>
                </body>
            </html>
        """,
    )
    webview.start(bind, window)
```

# Dom Events | pywebview

# Dom Events

Less than 1 minute

---

# [Dom Events](#dom-events)

This example demonstrates how to expose Python functions to the Javascript domain.

```python
import webview
from webview.dom import DOMEventHandler

window = None

def click_handler(e):
    print(e)

def input_handler(e):
    print(e['target']['value'])

def remove_handlers(scroll_event, click_event, input_event):
    scroll_event -= scroll_handler
    click_event -= click_handler
    input_event -= input_handler

def scroll_handler(e):
    scroll_top = window.dom.window.node['scrollY']
    print(f'Scroll position {scroll_top}')

def link_handler(e):
    print(f'Link target is {e["target"]["href"]}')

def bind(window):
    window.dom.document.events.scroll += DOMEventHandler(scroll_handler, debounce=100)

    button = window.dom.get_element('#button')
    button.events.click += click_handler

    input = window.dom.get_element('#input')
    input.events.input += input_handler

    remove_events = window.dom.get_element('#remove')
    remove_events.on(
        'click',
        lambda e: remove_handlers(
            window.dom.document.events.scroll, button.events.click, input.events.input
        ),
    )

    link = window.dom.get_element('#link')
    link.events.click += DOMEventHandler(link_handler, prevent_default=True)

if __name__ == '__main__':
    window = webview.create_window(
        'DOM Event Example',
        html="""
            <html>
                <head>
                <style>
                    button {
                        font-size: 100%;
                        padding: 0.5rem;
                        margin: 0.3rem;
                        text-transform: uppercase;
                    }
                </style>
                </head>
                <body style="height: 200vh;">
                    <div>
                        <input id="input" placeholder="Enter text">
                        <button id="button">Click me</button>
                        <a id="link" href="https://pywebview.flowrl.com">Click me</a>
                    </div>
                    <button id="remove" style="margin-top: 1rem;">Remove events</button>
                </body>
            </html>
        """,
    )
    webview.start(bind, window)
```

# Dom Traversal | pywebview

# Dom Traversal

Less than 1 minute

---

# [Dom Traversal](#dom-traversal)

This example demonstrates how to traverse DOM in Python.

```python
import webview

def bind(window):
    container = window.dom.get_element('#container')
    container_button = window.dom.get_element('#container-button')
    blue_rectangle = window.dom.get_element('#blue-rectangle')
    blue_parent_button = window.dom.get_element('#blue-parent-button')
    blue_next_button = window.dom.get_element('#blue-next-button')
    blue_previous_button = window.dom.get_element('#blue-previous-button')

    container_button.events.click += lambda e: print(container.children)
    blue_parent_button.events.click += lambda e: print(blue_rectangle.parent)
    blue_next_button.events.click += lambda e: print(blue_rectangle.next)
    blue_previous_button.events.click += lambda e: print(blue_rectangle.previous)

if __name__ == '__main__':
    window = webview.create_window(
        'DOM Manipulations Example',
        html="""
            <html>
                <head>
                <style>
                    button {
                        font-size: 100%;
                        padding: 0.5rem;
                        margin: 0.3rem;
                        text-transform: uppercase;
                    }

                    .rectangle {
                        width: 100px;
                        height: 100px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        color: white;
                        margin-right: 5px;
                    }
                </style>
                </head>
                <body>
                    <h1>Container</h1>
                    <div id="container" style="border: 1px #eee solid; display: flex; padding: 10px 0;">
                        <div id="red-rectangle" class="rectangle" style="background-color: red;">RED</div>
                        <div id="blue-rectangle" class="rectangle" style="background-color: blue;">BLUE</div>
                        <div id="green-rectangle" class="rectangle" style="background-color: green;">GREEN</div>
                    </div>
                    <button id="container-button">Get container's children</button>
                    <button id="blue-parent-button">Get blue's parent</button>
                    <button id="blue-next-button">Get blue's next element</button>
                    <button id="blue-previous-button">Get blue's previous element</button>
                </body>
            </html>
        """,
    )
    webview.start(bind, window)
```

# Dom Traversal | pywebview

# Dom Traversal

Less than 1 minute

---

# [Dom Traversal](#dom-traversal)

This example demonstrates how to traverse DOM in Python.

```python
import webview

def bind(window):
    container = window.dom.get_element('#container')
    container_button = window.dom.get_element('#container-button')
    blue_rectangle = window.dom.get_element('#blue-rectangle')
    blue_parent_button = window.dom.get_element('#blue-parent-button')
    blue_next_button = window.dom.get_element('#blue-next-button')
    blue_previous_button = window.dom.get_element('#blue-previous-button')

    container_button.events.click += lambda e: print(container.children)
    blue_parent_button.events.click += lambda e: print(blue_rectangle.parent)
    blue_next_button.events.click += lambda e: print(blue_rectangle.next)
    blue_previous_button.events.click += lambda e: print(blue_rectangle.previous)

if __name__ == '__main__':
    window = webview.create_window(
        'DOM Manipulations Example',
        html="""
            <html>
                <head>
                <style>
                    button {
                        font-size: 100%;
                        padding: 0.5rem;
                        margin: 0.3rem;
                        text-transform: uppercase;
                    }

                    .rectangle {
                        width: 100px;
                        height: 100px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        color: white;
                        margin-right: 5px;
                    }
                </style>
                </head>
                <body>
                    <h1>Container</h1>
                    <div id="container" style="border: 1px #eee solid; display: flex; padding: 10px 0;">
                        <div id="red-rectangle" class="rectangle" style="background-color: red;">RED</div>
                        <div id="blue-rectangle" class="rectangle" style="background-color: blue;">BLUE</div>
                        <div id="green-rectangle" class="rectangle" style="background-color: green;">GREEN</div>
                    </div>
                    <button id="container-button">Get container's children</button>
                    <button id="blue-parent-button">Get blue's parent</button>
                    <button id="blue-next-button">Get blue's next element</button>
                    <button id="blue-previous-button">Get blue's previous element</button>
                </body>
            </html>
        """,
    )
    webview.start(bind, window)
```

# Drag Drop | pywebview

# Drag Drop

Less than 1 minute

---

# [Drag Drop](#drag-drop)

This example demonstrates how to expose Python functions to the Javascript domain.

```python
import webview
from webview.dom import DOMEventHandler

def on_drag(e):
    pass

def on_drop(e):
    files = e['dataTransfer']['files']
    if len(files) == 0:
        return

    print(f'Event: {e["type"]}. Dropped files:')

    for file in files:
        print(file.get('pywebviewFullPath'))

def bind(window):
    window.dom.document.events.dragenter += DOMEventHandler(on_drag, True, True)
    window.dom.document.events.dragstart += DOMEventHandler(on_drag, True, True)
    window.dom.document.events.dragover += DOMEventHandler(on_drag, True, True, debounce=500)
    window.dom.document.events.drop += DOMEventHandler(on_drop, True, True)

if __name__ == '__main__':
    window = webview.create_window(
        'Drag & drop example',
        html="""
            <html>
                <body style="height: 100vh;"->
                    <h1>Drag files here</h1>
                </body>
            </html>
        """,
    )
    webview.start(bind, window)
```

# Drag Region | pywebview

# Drag Region

Less than 1 minute

---

# [Drag Region](#drag-region)

Demonstrates the use of dynamic draggable regions in a frameless window using pywebview.

```python
import webview

html = """
<!DOCTYPE html>
<html>
<head>
    <style type="text/css">
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f0f0f0;
        }

        .header {
            background: #333;
            color: white;
            padding: 10px;
            text-align: center;
            margin-bottom: 20px;
        }

        .pywebview-drag-region {
            width: 120px;
            height: 40px;
            background: orange;
            border: 2px solid #ff8c00;
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: move;
            margin: 10px;
            padding: 5px;
            font-weight: bold;
            color: white;
        }

        .content {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 20px;
        }

        .controls {
            text-align: center;
            padding: 20px;
        }

        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }

        button:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <div class="content">
        <div class="pywebview-drag-region">Drag me!</div>
    </div>

    <div class="controls">
        <button onclick="addDragRegion()">Add New Drag Region</button>
        <p>Click the button to add more draggable regions, or drag the orange areas to move the window.</p>
    </div>

    <script>
        function addDragRegion() {
            const newDiv = document.createElement('div');
            newDiv.className = 'pywebview-drag-region';
            newDiv.textContent = 'New drag region!';

            const content = document.querySelector('.content');
            content.appendChild(newDiv);
        }
    </script>
</body>
</html>
"""

if __name__ == '__main__':
    window = webview.create_window(
        'API example',
        html=html,
        frameless=True,
        easy_drag=False,
    )
    webview.start()
```

# Evaluate Js | pywebview

# Evaluate Js

Less than 1 minute

---

# [Evaluate Js](#evaluate-js)

Run Javascript code from Python.

```python
import webview
from webview.errors import JavascriptException

def evaluate_js(window):
    result = window.evaluate_js(
        r"""
        var h1 = document.createElement('h1')
        var text = document.createTextNode('Hello pywebview')
        h1.appendChild(text)
        document.body.appendChild(h1)

        document.body.style.backgroundColor = '#212121'
        document.body.style.color = '#f2f2f2'

        // Return user agent
        'User agent:\n' + navigator.userAgent;
        """
    )

    print(result)

    try:
        result = window.evaluate_js('syntaxerror#$%#$')
    except JavascriptException as e:
        print('Javascript exception occured: ', e)

if __name__ == '__main__':
    window = webview.create_window('Evaluate JavaScript', html='<html><body></body></html>')
    webview.start(evaluate_js, window)
```


# Evaluate Js Async | pywebview

# Evaluate Js Async

Less than 1 minute

---

# [Evaluate Js Async](#evaluate-js-async)

Run asynchronous Javascript code and invoke a callback.

```python
import webview

def callback(result):
    print(result)

def evaluate_js_async(window):
    window.evaluate_js(
        """
        new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('Whaddup!');
            }, 300);
        });
        """,
        callback,
    )

if __name__ == '__main__':
    window = webview.create_window('Run async Javascript', html='<html><body></body></html>')
    webview.start(evaluate_js_async, window)
```

# Events | pywebview

# Events

7/7/19Less than 1 minute

---

# [Events](#events)

Subscribe and unsubscribe to pywebview events.

```python
import webview

def on_before_show(window):
    print('Native window object', window.native)

def on_closed():
    print('pywebview window is closed')

def on_closing():
    print('pywebview window is closing')

def on_initialized(renderer):
    # return False to cancel initialization
    print(f'GUI is initialized with renderer: {renderer}')

def on_shown():
    print('pywebview window shown')

def on_minimized():
    print('pywebview window minimized')

def on_restored():
    print('pywebview window restored')

def on_maximized():
    print('pywebview window maximized')

def on_resized(width, height):
    print(f'pywebview window is resized. new dimensions are {width} x {height}')

# you can supply optional window argument to access the window object event was triggered on
def on_loaded(window):
    print('DOM is ready')

    # unsubscribe event listener
    window.events.loaded -= on_loaded
    window.load_url('https://pywebview.flowrl.com/hello')

def on_moved(x, y):
    print(f'pywebview window is moved. new coordinates are x: {x}, y: {y}')

if __name__ == '__main__':
    window = webview.create_window(
        'Simple browser', 'https://pywebview.flowrl.com/', confirm_close=True
    )

    window.events.closed += on_closed
    window.events.closing += on_closing
    window.events.before_show += on_before_show
    window.events.initialized += on_initialized
    window.events.shown += on_shown
    window.events.loaded += on_loaded
    window.events.minimized += on_minimized
    window.events.maximized += on_maximized
    window.events.restored += on_restored
    window.events.resized += on_resized
    window.events.moved += on_moved

    webview.start()
```

# Expose | pywebview

# Expose

11/20/19Less than 1 minute

---

# [Expose](#expose)

Exposing Python functions to the Javascript domain.

```python
import webview

def lol():
    print('LOL')

def wtf():
    print('WTF')

def echo(arg1, arg2, arg3):
    print(arg1)
    print(arg2)
    print(arg3)

def expose(window):
    window.expose(echo)  # expose a function during the runtime

    window.evaluate_js('pywebview.api.lol()')
    window.evaluate_js('pywebview.api.wtf()')
    window.evaluate_js('pywebview.api.echo(1, 2, 3)')

if __name__ == '__main__':
    window = webview.create_window(
        'JS Expose Example',
        html='<html><head></head><body><h1>JS API function Expose</body></html>',
    )
    window.expose(lol, wtf)  # expose functions beforehand

    webview.start(expose, window)
```

# Focus | pywebview

# Focus

3/30/23Less than 1 minute

---

# [Focus](#focus)

Create a non-focusable window that can be useful for onscreen floating tools.

```python
import webview

if __name__ == '__main__':
    webview.create_window(
        'Nonfocusable window',
        html='<html><head></head><body><p>You shouldnt be able to type into this window...</p><input type="text"><p>...but still you can click elements in this window...</p><input type="checkbox"></body></html>',
        focus=False,
    )
    webview.start()
```


# Frameless | pywebview

# Frameless

2/17/19Less than 1 minute

---

# [Frameless](#frameless)

Create a frameless window. The window can be moved around by dragging any point.

```python
import webview

if __name__ == '__main__':
    # Create a resizable webview window with minimum size constraints
    webview.create_window(
        'Frameless window', 'http://pywebview.flowrl.com/hello', frameless=True, easy_drag=True
    )
    webview.start()
```

# Frameless | pywebview

# Frameless

2/17/19Less than 1 minute

---

# [Frameless](#frameless)

Create a frameless window. The window can be moved around by dragging any point.

```python
import webview

if __name__ == '__main__':
    # Create a resizable webview window with minimum size constraints
    webview.create_window(
        'Frameless window', 'http://pywebview.flowrl.com/hello', frameless=True, easy_drag=True
    )
    webview.start()
```

# Frameless | pywebview

# Frameless

2/17/19Less than 1 minute

---

# [Frameless](#frameless)

Create a frameless window. The window can be moved around by dragging any point.

```python
import webview

if __name__ == '__main__':
    # Create a resizable webview window with minimum size constraints
    webview.create_window(
        'Frameless window', 'http://pywebview.flowrl.com/hello', frameless=True, easy_drag=True
    )
    webview.start()
```

# Frameless | pywebview

# Frameless

2/17/19Less than 1 minute

---

# [Frameless](#frameless)

Create a frameless window. The window can be moved around by dragging any point.

```python
import webview

if __name__ == '__main__':
    # Create a resizable webview window with minimum size constraints
    webview.create_window(
        'Frameless window', 'http://pywebview.flowrl.com/hello', frameless=True, easy_drag=True
    )
    webview.start()
```

# Frameless | pywebview

# Frameless

2/17/19Less than 1 minute

---

# [Frameless](#frameless)

Create a frameless window. The window can be moved around by dragging any point.

```python
import webview

if __name__ == '__main__':
    # Create a resizable webview window with minimum size constraints
    webview.create_window(
        'Frameless window', 'http://pywebview.flowrl.com/hello', frameless=True, easy_drag=True
    )
    webview.start()
```

# Hide Window | pywebview

# Hide Window

10/28/19Less than 1 minute

---

# [Hide Window](#hide-window)

Programmatically hide and show window.

```python
import time

import webview

def hide_show(window):
    print('Window is started hidden')

    time.sleep(5)
    print('Showing window')
    window.show()

    time.sleep(5)
    print('Hiding window')
    window.hide()

    time.sleep(5)
    print('And showing again')
    window.show()

if __name__ == '__main__':
    window = webview.create_window(
        'Hide / show window', 'https://pywebview.flowrl.com/hello', hidden=True
    )
    webview.start(hide_show, window)
```


# Http Server | pywebview

# Http Server

Less than 1 minute

---

# [Http Server](#http-server)

A built-in HTTP server example.

```python
import webview

if __name__ == '__main__':
    webview.create_window('My first HTML5 application', 'assets/index.html')
    # HTTP server is started automatically for local relative paths
    webview.start(ssl=True)
```


# Icon | pywebview

# Icon

Less than 1 minute

---

# [Icon](#icon)

Set window icon using \`webview.start(icon=<file\_path>). This is supported only on GTK and QT. For other platforms, icon is set during freezing.

```python
import webview

if __name__ == '__main__':
    window = webview.create_window('Set window icon', 'https://pywebview.flowrl.com/hello')
    webview.start(icon='../assets/logo.png')
```

# Js Api | pywebview

# Js Api

11/8/17About 1 min

---

# [Js Api](#js-api)

Create an application without a HTTP server. The application uses Javascript API object to communicate between Python and Javascript.

```python
import random
import sys
import threading
import time

import webview

html = """
<!DOCTYPE html>
<html>
<head lang="en">
<meta charset="UTF-8">

<style>
    #response-container {
        display: none;
        padding: 1rem;
        margin: 3rem 5%;
        font-size: 120%;
        border: 5px dashed #ccc;
        word-wrap: break-word;
    }

    label {
        margin-left: 0.3rem;
        margin-right: 0.3rem;
    }

    button {
        font-size: 100%;
        padding: 0.5rem;
        margin: 0.3rem;
        text-transform: uppercase;
    }

</style>
</head>
<body>

<h1>JS API Example</h1>
<p id='pywebview-status'><i>pywebview</i> is not ready</p>

<button onClick="initialize()">Hello Python</button><br/>
<button id="heavy-stuff-btn" onClick="doHeavyStuff()">Perform a heavy operation</button><br/>
<button onClick="getRandomNumber()">Get a random number</button><br/>
<label for="name_input">Say hello to:</label><input id="name_input" placeholder="put a name here">
<button onClick="greet()">Greet</button><br/>
<button onClick="catchException()">Catch Exception</button><br/>

<div id="response-container"></div>
<script>
    window.addEventListener('pywebviewready', function() {
        var container = document.getElementById('pywebview-status')
        container.innerHTML = '<i>pywebview</i> is ready'
    })

    function showResponse(response) {
        var container = document.getElementById('response-container')

        container.innerText = response.message
        container.style.display = 'block'
    }

    function initialize() {
        pywebview.api.init().then(showResponse)
    }

    function doHeavyStuff() {
        var btn = document.getElementById('heavy-stuff-btn')

        pywebview.api.heavy_stuff.doHeavyStuff().then(function(response) {
            showResponse(response)
            btn.onclick = doHeavyStuff
            btn.innerText = 'Perform a heavy operation'
        })

        showResponse({message: 'Working...'})
        btn.innerText = 'Cancel the heavy operation'
        btn.onclick = cancelHeavyStuff
    }

    function cancelHeavyStuff() {
        pywebview.api.heavy_stuff.cancelHeavyStuff()
    }

    function getRandomNumber() {
        pywebview.api.getRandomNumber().then(showResponse)
    }

    function greet() {
        var name_input = document.getElementById('name_input').value;
        pywebview.api.sayHelloTo(name_input).then(showResponse)
    }

    function catchException() {
        pywebview.api.error().catch(showResponse)
    }

</script>
</body>
</html>
"""

class HeavyStuffAPI:
    def __init__(self):
        self.cancel_heavy_stuff_flag = False

    def doHeavyStuff(self):
        time.sleep(0.1)  # sleep to prevent from the ui thread from freezing for a moment
        now = time.time()
        self.cancel_heavy_stuff_flag = False
        for i in range(0, 1000000):
            _ = i * random.randint(0, 1000)
            if self.cancel_heavy_stuff_flag:
                response = {'message': 'Operation cancelled'}
                break
        else:
            then = time.time()
            response = {
                'message': f'Operation took {then - now:.1f} seconds on the thread {threading.current_thread()}'
            }
        return response

    def cancelHeavyStuff(self):
        time.sleep(0.1)
        self.cancel_heavy_stuff_flag = True

class NotExposedApi:
    _serializable = False

    def notExposedMethod(self):
        return 'This method is not exposed'

class Api:
    heavy_stuff = HeavyStuffAPI()
    _this_wont_be_exposed = HeavyStuffAPI()
    this_wont_be_exposed = NotExposedApi()

    def init(self):
        response = {'message': f'Hello from Python {sys.version}'}
        return response

    def getRandomNumber(self):
        response = {
            'message': f'Here is a random number courtesy of randint: {random.randint(0, 100000000)}'
        }
        return response

    def sayHelloTo(self, name):
        response = {'message': f'Hello {name}!'}
        return response

    def error(self):
        raise Exception('This is a Python exception')

if __name__ == '__main__':
    api = Api()
    window = webview.create_window('JS API example', html=html, js_api=api)
    webview.start()
```

# Links | pywebview

# Links

7/7/19Less than 1 minute

---

# [Links](#links)

Demonstrate a difference between different link types

```python
import webview

html = """
  <html>
    <head></head>
    <body>
      <h2>Links</h2>

      <p><a href='https://pywebview.flowrl.com'>Regular links</a> are opened in the application window.</p>
      <p><a href='https://pywebview.flowrl.com' target='_blank'>target='_blank' links</a> are opened in an external browser.</p>

    </body>
  </html>
"""

if __name__ == '__main__':
    window = webview.create_window('Link types', html=html)
    webview.start()
```

# Load Css | pywebview

# Load Css

Less than 1 minute

---

# [Load Css](#load-css)

Loading custom CSS in a webview window

```python
import webview

def load_css(window):
    window.load_css('body { background: red !important; }')

if __name__ == '__main__':
    window = webview.create_window('Load CSS Example', 'https://pywebview.flowrl.com/hello')
    webview.start(load_css, window)
```

# Load Html | pywebview

# Load Html

Less than 1 minute

---

# [Load Html](#load-html)

Loading new HTML after the window is created

```python
from time import sleep

import webview

def load_html(window):
    sleep(5)
    window.load_html('<h1>This is dynamically loaded HTML</h1>')

if __name__ == '__main__':
    window = webview.create_window('Load HTML Example', html='<h1>This is initial HTML</h1>')
    webview.start(load_html, window)
```

# Loading Animation | pywebview

# Loading Animation

5/17/17About 1 min

---

# [Loading Animation](#loading-animation)

Create a loading animation that is displayed before application is loaded.

```python
import webview

html = """
    <style>
        body {
            background-color: #333;
            color: white;
            font-family: Helvetica Neue, Helvetica, Arial, sans-serif;
        }

        .main-container {
            width: 100%;
            height: 90vh;
            display: flex;
            display: -webkit-flex;
            align-items: center;
            -webkit-align-items: center;
            justify-content: center;
            -webkit-justify-content: center;
            overflow: hidden;
        }

        .loading-container {
        }

        .loader {
          font-size: 10px;
          margin: 50px auto;
          text-indent: -9999em;
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          background: #ffffff;
          background: -moz-linear-gradient(left, #ffffff 10%, rgba(255, 255, 255, 0) 42%);
          background: -webkit-linear-gradient(left, #ffffff 10%, rgba(255, 255, 255, 0) 42%);
          background: -o-linear-gradient(left, #ffffff 10%, rgba(255, 255, 255, 0) 42%);
          background: -ms-linear-gradient(left, #ffffff 10%, rgba(255, 255, 255, 0) 42%);
          background: linear-gradient(to right, #ffffff 10%, rgba(255, 255, 255, 0) 42%);
          position: relative;
          -webkit-animation: load3 1.4s infinite linear;
          animation: load3 1.4s infinite linear;
          -webkit-transform: translateZ(0);
          -ms-transform: translateZ(0);
          transform: translateZ(0);
        }
        .loader:before {
          width: 50%;
          height: 50%;
          background: #ffffff;
          border-radius: 100% 0 0 0;
          position: absolute;
          top: 0;
          left: 0;
          content: '';
        }
        .loader:after {
          background: #333;
          width: 75%;
          height: 75%;
          border-radius: 50%;
          content: '';
          margin: auto;
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
        }
        @-webkit-keyframes load3 {
          0% {
            -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
          }
          100% {
            -webkit-transform: rotate(360deg);
            transform: rotate(360deg);
          }
        }
        @keyframes load3 {
          0% {
            -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
          }
          100% {
            -webkit-transform: rotate(360deg);
            transform: rotate(360deg);
          }
        }

        .loaded-container {
            display: none;
        }

    </style>
    <body>
      <div class="main-container">
          <div id="loader" class="loading-container">
              <div class="loader">Loading...</div>
          </div>

          <div id="main" class="loaded-container">
              <h1>Content is loaded!</h1>
          </div>
      </div>

      <script>
          setTimeout(function() {
              document.getElementById('loader').style.display = 'none'
              document.getElementById('main').style.display = 'block'
          }, 5000)
      </script>
    </body>
"""

if __name__ == '__main__':
    window = webview.create_window('Loading Animation', html=html, background_color='#333333')
    webview.start()
```

# Localhost Ssl | pywebview

# Localhost Ssl

Less than 1 minute

---

# [Localhost Ssl](#localhost-ssl)

Use SSL with a local HTTP server.

```python
import webview

if __name__ == '__main__':
    webview.create_window('Local SSL Test', 'assets/index.html')
    webview.start(ssl=True)
```

# Localization | pywebview

# Localization

11/13/16Less than 1 minute

---

# [Localization](#localization)

Localize system text string used by pywebview. For a full list of used string, refer to the `webview/localization.py` file.

```python
import webview

if __name__ == '__main__':
    localization = {
        'global.saveFile': 'Сохранить файл',
        'cocoa.menu.about': 'О программе',
        'cocoa.menu.services': 'Cлужбы',
        'cocoa.menu.view': 'Вид',
        'cocoa.menu.hide': 'Скрыть',
        'cocoa.menu.hideOthers': 'Скрыть остальные',
        'cocoa.menu.showAll': 'Показать все',
        'cocoa.menu.quit': 'Завершить',
        'cocoa.menu.fullscreen': 'Перейти ',
        'windows.fileFilter.allFiles': 'Все файлы',
        'windows.fileFilter.otherFiles': 'Остальлные файльы',
        'linux.openFile': 'Открыть файл',
        'linux.openFiles': 'Открыть файлы',
        'linux.openFolder': 'Открыть папку',
    }

    window_localization_override = {
        'global.saveFile': 'Save file',
    }

    webview.create_window(
        'Localization Example',
        'https://pywebview.flowrl.com/hello',
        localization=window_localization_override,
    )
    webview.start(localization=localization)
```

# Menu | pywebview

# Menu

4/24/22Less than 1 minute

---

# [Menu](#menu)

Create an application menu.

```python
import webview
from webview.menu import Menu, MenuAction, MenuSeparator

def change_active_window_content():
    active_window = webview.active_window()
    if active_window:
        active_window.load_html('<h1>You changed this window!</h1>')

def click_me():
    active_window = webview.active_window()
    if active_window:
        active_window.load_html('<h1>You clicked me!</h1>')

def test():
    active_window = webview.active_window()
    if active_window:
        active_window.load_html('<h1>This is a test!</h1>')

def do_nothing():
    pass

def say_this_is_window_2():
    active_window = webview.active_window()
    if active_window:
        active_window.load_html('<h1>This is window 2</h2>')

def open_save_file_dialog():
    active_window = webview.active_window()
    active_window.create_file_dialog(
        webview.FileDialog.SAVE, directory='/', save_filename='test.file'
    )

def open_preferences():
    active_window = webview.active_window()
    if active_window:
        active_window.load_html(
            '<h1>Preferences</h1><p>App preferences would open here (macOS app menu)</p>'
        )

def check_for_updates():
    active_window = webview.active_window()
    if active_window:
        active_window.load_html(
            '<h1>Check for Updates</h1><p>Checking for updates... (macOS app menu)</p>'
        )

if __name__ == '__main__':
    # App menu items (macOS only - appears between About and Services)
    # On other platforms, this menu is ignored
    macos_app_menu = Menu(
        '__app__',
        [
            MenuAction('Preferences...', open_preferences),
            MenuSeparator(),
            MenuAction('Check for Updates', check_for_updates),
        ],
    )

    window_menu = [Menu('Window', [MenuAction('Test', test)])]

    app_menu = [
        macos_app_menu,  # macOS app menu items
        Menu(
            'Menu 1',
            [
                MenuAction('Change Active Window Content', change_active_window_content),
                MenuSeparator(),
                Menu(
                    'Random',
                    [
                        MenuAction('Click Me', click_me),
                        MenuAction('File Dialog', open_save_file_dialog),
                    ],
                ),
            ],
        ),
        Menu('Menu 2', [MenuAction('This will do nothing', do_nothing)]),
    ]

    window_1 = webview.create_window(
        'Application Menu Example', 'https://pywebview.flowrl.com/hello'
    )
    window_2 = webview.create_window(
        'Window Menu Example',
        html='<h1>Another window to test application menu</h1>',
        menu=window_menu,
    )

    webview.start(menu=app_menu)
```

# Min Size | pywebview

# Min Size

11/19/15Less than 1 minute

---

# [Min Size](#min-size)

Set minimum window dimensions.

```python
import webview

if __name__ == '__main__':
    # Create a resizable webview window with minimum size constraints
    webview.create_window(
        'Minimum window size', 'https://pywebview.flowrl.com/hello', min_size=(400, 200)
    )
    webview.start()
```

# Move Window | pywebview

# Move Window

10/19/19Less than 1 minute

---

# [Move Window](#move-window)

Set window coordinates and move window after its creation.

```python
from time import sleep

import webview

def move(window):
    print(f'Window coordinates are ({window.x}, {window.y})')
    print(f'Window dimensions are ({window.width}x{window.height})')

    # Get the primary screen to calculate relative position
    screens = webview.screens
    if screens:
        primary_screen = screens[0]
        print(f'Primary screen: {primary_screen.width}x{primary_screen.height}')

        # Move to bottom-right area of screen (with some padding)
        new_x = primary_screen.width - window.width - 100
        new_y = primary_screen.height - window.height - 100
    else:
        # Fallback to absolute coordinates
        new_x, new_y = 500, 500

    sleep(2)
    window.move(new_x, new_y)
    print(f'Moving window to ({new_x}, {new_y})...')
    sleep(1)
    print(f'Window coordinates are now ({window.x}, {window.y})')

if __name__ == '__main__':
    window = webview.create_window('Move window example', html='<h1>Move window</h1>', x=300, y=300)
    webview.start(move, window)
```
# Multiple Servers | pywebview

# Multiple Servers

About 1 min

---

# [Multiple Servers](#multiple-servers)

Create multiple windows, some of which have their own servers, both before and after `webview.start()` is called.

```python
import bottle

import webview

# We'll have a global list of our windows so our web app can give us information
# about them
windows = []

# A simple function to format a description of our servers
def serverDescription(server):
    return f'{str(server).replace("<", "").replace(">", "")}'

# Define a couple of simple web apps using Bottle
app1 = bottle.Bottle()

@app1.route('/')
def hello():
    return '<h1>Second Window</h1><p>This one is a web app and has its own server.</p>'

app2 = bottle.Bottle()

@app2.route('/')
def hello2():
    head = """  <head>
                    <style type="text/css">
                        table {
                          font-family: arial, sans-serif;
                          border-collapse: collapse;
                          width: 100%;
                        }

                        td, th {
                          border: 1px solid #dddddd;
                          text-align: center;
                          padding: 8px;
                        }

                        tr:nth-child(even) {
                          background-color: #dddddd;
                        }
                    </style>
                </head>
            """
    body = f""" <body>
                    <h1>Third Window</h1>
                    <p>This one is another web app and has its own server. It was started after webview.start.</p>
                    <p>Server Descriptions: </p>
                    <table>
                        <tr>
                            <th>Window</th>
                            <th>Object</th>
                            <th>IP Address</th>
                        </tr>
                        <tr>
                            <td>Global Server</td>
                            <td>{serverDescription(webview.http.global_server)}</td>
                            <td>{webview.http.global_server.address if webview.http.global_server is not None else 'None'}</td>
                        </tr>
                        <tr>
                            <td>First Window</td>
                            <td>{serverDescription(windows[0]._server)}</td>
                            <td>{windows[0]._server.address if windows[0]._server is not None else 'None'}</td>
                        </tr>
                        <tr>
                            <td>Second Window</td>
                            <td>{serverDescription(windows[1]._server)}</td>
                            <td>{windows[1]._server.address}</td>
                        </tr>
                        <tr>
                            <td>Third Window</td>
                            <td>{serverDescription(windows[2]._server)}</td>
                            <td>{windows[2]._server.address}</td>
                        </tr>
                    </table>
                </body>
            """
    return head + body

def third_window():
    # Create a new window after the loop started
    windows.append(webview.create_window('Window #3', url=app2))

if __name__ == '__main__':
    # Master window
    windows.append(
        webview.create_window(
            'Window #1',
            html='<h1>First window</h1><p>This one is static HTML and just uses the global server for api calls.</p>',
        )
    )
    windows.append(webview.create_window('Window #2', url=app1, http_port=3333))
    webview.start(third_window, http_server=True, http_port=3334)
```


# Multiple Windows | pywebview

# Multiple Windows

10/15/17Less than 1 minute

---

# [Multiple Windows](#multiple-windows)

Create multiple windows.

```python
import webview

def third_window():
    # Create a new window after the loop started
    webview.create_window('Window #3', html='<h1>Third Window</h1>')

if __name__ == '__main__':
    # Master window
    master_window = webview.create_window('Window #1', html='<h1>First window</h1>')
    second_window = webview.create_window('Window #2', html='<h1>Second window</h1>')
    webview.start(third_window)
```

# Multiprocess | pywebview

# Multiprocess

About 1 min

---

# [Multiprocess](#multiprocess)

Example of running pywebview in a separate process with shared state. Main thread is not blocked in this example.

```python
import multiprocessing
import threading
import time

import webview

html = """
<!DOCTYPE html>
<html>
    <head>
       <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
    </head>

    <script>
        window.addEventListener('pywebviewready', () => {
            window.pywebview.state.addEventListener('change', event => {
                console.log('State changed:', event)
                document.getElementById('counter').innerText = pywebview.state.counter
                document.getElementById('message').innerText = pywebview.state.message
            })
        })
    </script>

    <body>
        <h1>Multiprocess State Example</h1>

        <p>Counter value: <span id="counter">0</span></p>
        <p>Message from main process: <span id="message">Waiting...</span></p>
    </body>
</html>
Function to run webview in a separate process with shared state."""

    def on_counter_change(type, key, value):
        print(f'Webview process - {key}: {value}')

    def sync_from_shared_state():
        """Sync webview state from shared dictionary."""
        try:
            # Check if shared state has changed and update webview state
            if window.state.counter != shared_dict.get('counter', 0):
                window.state.counter = shared_dict['counter']
            if window.state.message != shared_dict.get('message', 'Waiting...'):
                window.state.message = shared_dict['message']
        except Exception as e:
            print(f'Error syncing state: {e}')

    def on_loaded(window):
        window.state += on_counter_change
        # Sync initial state from shared dictionary
        window.state.counter = shared_dict.get('counter', 0)
        window.state.message = shared_dict.get('message', 'Waiting...')

        def periodic_sync():
            while True:
                try:
                    time.sleep(0.5)  # Check every 500ms
                    sync_from_shared_state()
                except Exception:
                    break  # Exit if window is closed

        sync_thread = threading.Thread(target=periodic_sync, daemon=True)
        sync_thread.start()

    window = webview.create_window('Multiprocess State Example', html=html)
    window.state.counter = shared_dict.get('counter', 0)
    window.state.message = shared_dict.get('message', 'Waiting...')
    window.events.loaded += on_loaded
    webview.start()

if __name__ == '__main__':
    # Create shared state between processes
    manager = multiprocessing.Manager()
    shared_dict = manager.dict()
    shared_dict['counter'] = 0
    shared_dict['message'] = 'Waiting...'

    # Create and start the webview process
    webview_process = multiprocessing.Process(target=run_webview, args=(shared_dict,))
    webview_process.start()

    # Main process is free to do other work
    print('Webview started in separate process')
    print('Main process is free to do other work...')

    # Simulate some work in the main process and update state
    for i in range(10):
        time.sleep(2)
        # Update shared state from main process
        shared_dict['counter'] = i + 1
        shared_dict['message'] = f'Main process step {i+1}/10'
        print(f"Main process working... {i+1}/10 (counter: {shared_dict['counter']})")

    shared_dict['message'] = 'Main process completed!'
    print('Main process finished its work')
    print('Waiting for webview process to complete...')

    # Wait for the webview process to finish
    webview_process.join()
    print('Webview process completed')
```

# On Top | pywebview

# On Top

3/26/20Less than 1 minute

---

# [On Top](#on-top)

Create a window that stays on top of other windows.

```python
import time

import webview

def deactivate(window):
    # window starts as on top of and reverts back to normal after 20 seconds
    time.sleep(20)
    window.on_top = False
    window.load_html('<h1>This window is no longer on top of other windows</h1>')

if __name__ == '__main__':
    # Create webview window that stays on top of, all other windows
    window = webview.create_window(
        'Topmost window', html='<h1>This window is on top of other windows</h1>', on_top=True
    )
    webview.start(deactivate, window)
```

# Open File Dialog | pywebview

# Open File Dialog

9/28/15Less than 1 minute

---

# [Open File Dialog](#open-file-dialog)

Create an open file dialog after page content is loaded.

```python
import webview

def open_file_dialog(window):
    file_types = ('Image Files (*.bmp;*.jpg;*.gif)', 'All files (*.*)')

    result = window.create_file_dialog(
        webview.FileDialog.OPEN, allow_multiple=True, file_types=file_types
    )
    print(result)

if __name__ == '__main__':
    window = webview.create_window('Open file dialog example', 'https://pywebview.flowrl.com/hello')
    webview.start(open_file_dialog, window)
```

# Py2app Setup | pywebview

# Py2app Setup

Less than 1 minute

---

# [Py2app Setup](#py2app-setup)

An example of py2app setup.py script for freezing your pywebview application

Usage: `python setup.py py2app`

```python
import os

from setuptools import setup

def tree(src):
    return [
        (root, map(lambda f: os.path.join(root, f), files))
        for (root, dirs, files) in os.walk(os.path.normpath(src))
    ]

ENTRY_POINT = ['simple_browser.py']

DATA_FILES = tree('DATA_FILES_DIR') + tree('DATA_FILE_DIR2')
OPTIONS = {
    'argv_emulation': False,
    'strip': True,
    #'iconfile': 'icon.icns', # uncomment to include an icon
    'includes': ['WebKit', 'Foundation', 'webview'],
}

setup(
    app=ENTRY_POINT,
    data_files=DATA_FILES,
    options={'py2app': OPTIONS},
    setup_requires=['py2app'],
)
```

# Pystray Icon | pywebview

# Pystray Icon

Less than 1 minute

---

# [Pystray Icon](#pystray-icon)

Run pywebview alongside with pystray to display a system tray icon.

```python
import multiprocessing
import sys

from PIL import Image
from pystray import Icon, Menu, MenuItem

import webview

if sys.platform == 'darwin':
    ctx = multiprocessing.get_context('spawn')
    Process = ctx.Process
    Queue = ctx.Queue
else:
    Process = multiprocessing.Process
    Queue = multiprocessing.Queue

webview_process = None

def run_webview():
    webview.create_window('Webview', 'https://pywebview.flowrl.com/hello')
    webview.start()

if __name__ == '__main__':

    def start_webview_process():
        global webview_process
        webview_process = Process(target=run_webview)
        webview_process.start()

    def on_open(icon, item):
        global webview_process
        if not webview_process.is_alive():
            start_webview_process()

    def on_exit(icon, item):
        icon.stop()

    start_webview_process()

    image = Image.open('assets/logo.png')
    menu = Menu(MenuItem('Open', on_open), MenuItem('Exit', on_exit))
    icon = Icon('Pystray', image, menu=menu)
    icon.run()

    webview_process.terminate()
```

# Qt Test | pywebview

# Qt Test

Less than 1 minute

---

# [Qt Test](#qt-test)

Create a pywebview windows using QT (normally GTK is preferred)

```python
import webview

if __name__ == '__main__':
    # Create a non-resizable webview window with 800x600 dimensions
    webview.create_window('Qt Example', 'http://flowrl.com')
    webview.start(gui='qt')
```

# Remote Debugging | pywebview

# Remote Debugging

Less than 1 minute

---

# [Remote Debugging](#remote-debugging)

Enable remote debugging when using `edgechromium`. This can be used to write tests for the application using Playwright. See [https://playwright.dev/docs/webview2](https://playwright.dev/docs/webview2) for how to configure it.

```python
import webview

if __name__ == '__main__':
    webview.settings['REMOTE_DEBUGGING_PORT'] = 9222

    window = webview.create_window('Webview', 'https://pywebview.flowrl.com/hello')
    webview.start()
```

# Resize | pywebview

# Resize

Less than 1 minute

---

# [Resize](#resize)

Resize window.

```python
from time import sleep

import webview

def resize(window):
    print(f'Window size is ({window.width}, {window.height})')
    sleep(2)
    window.resize(420, 420)
    print(f'Window size is ({window.width}, {window.height})')

if __name__ == '__main__':
    window = webview.create_window(
        'Resize window example', html='<h1>Resize window</h1>', width=800, height=600
    )
    webview.start(resize, window)
```

# Run Js | pywebview

# Run Js

Less than 1 minute

---

# [Run Js](#run-js)

Run Javascript code from Python.

```python
import webview

def run_js(window):
    result = window.run_js(
        r"""
        var h1 = document.createElement('h1')
        var text = document.createTextNode('Hello pywebview')
        h1.appendChild(text)
        document.body.appendChild(h1)

        function test() {
            return 420
        }

        test()
        """
    )

    print(result)

if __name__ == '__main__':
    window = webview.create_window('Run JavaScript', html='<html><body></body></html>')
    webview.start(run_js, window)
```

# Save File Dialog | pywebview

# Save File Dialog

11/20/15Less than 1 minute

---

# [Save File Dialog](#save-file-dialog)

Create a save file dialog after a delay.

```python
import webview

def save_file_dialog(window):
    import time

    time.sleep(5)
    result = window.create_file_dialog(
        webview.FileDialog.SAVE, directory='/', save_filename='test.file'
    )
    print(result)

if __name__ == '__main__':
    window = webview.create_window('Save file dialog', 'https://pywebview.flowrl.com/hello')
    webview.start(save_file_dialog, window)
```

# Screens | pywebview

# Screens

3/17/21Less than 1 minute

---

# [Screens](#screens)

Get available display information using `webview.screens`

```python
import webview

if __name__ == '__main__':
    screens = webview.screens
    print('Available screens:')

    for i, screen in enumerate(screens):
        print(f'\nScreen {i + 1}:')
        print(f'  Position: ({screen.x}, {screen.y})')
        print(f'  Size: {screen.width}x{screen.height}')
        print(f'  Scale: {screen.scale}x')
        print(f'  DPI: {screen.dpi}')
        print(f'  Physical Size: {screen.physical_width}x{screen.physical_height}')

        webview.create_window('', html=f'placed on the monitor {i + 1}', screen=screen)

    webview.start()
```

# Settings | pywebview

# Settings

Less than 1 minute

---

# [Settings](#settings)

Use application flags to modify default behaviour of pywebview

```python
import webview

html = """
  <html>
    <head></head>
    <body>
      <h2></h2>
      <p><a href='https://pywebview.flowrl.com' target='_blank'>target='_blank' link</a> will be opened in the current window.</p>
    </body>
  </html>
"""

if __name__ == '__main__':
    print(webview.settings)
    webview.settings['OPEN_EXTERNAL_LINKS_IN_BROWSER'] = False
    webview.settings['OPEN_DEVTOOLS_IN_DEBUG'] = False

    window = webview.create_window('Application flags', html=html)
    webview.start()
```

# Simple Browser | pywebview

# Simple Browser

Less than 1 minute

---

# [Simple Browser](#simple-browser)

The most basic example of creating a webview window.

```python
import webview

if __name__ == '__main__':
    # Create a standard webview window
    window = webview.create_window('Simple browser', 'https://pywebview.flowrl.com/hello')
    webview.start()
```

# State | pywebview

# State

Less than 1 minute

---

# [State](#state)

Demonstrate usage of the state object to share state between Python and JavaScript.

```python
import webview

html = """
<!DOCTYPE html>
<html>
    <head>
       <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
    </head>

    <script>
        window.addEventListener('pywebviewready', () => {
            window.pywebview.state.addEventListener('change', event => {
                console.log('Counter value changed:', event)
                document.getElementById('counter').innerText = pywebview.state.counter
            })
        })

        function increaseCounter() {
            pywebview.state.counter++
            document.getElementById('counter').innerText = pywebview.state.counter
        }
    </script>

    <body>
        <h1>State</h1>

        <p>Counter value: <span id="counter">0</span></p>

        <button onclick="increaseCounter()">Increase counter from JS</button>
        <button onclick="pywebview.api.decrease_counter()">Decrease counter from Python</button>
    </body>
</html>
"""

def on_counter_change(type, key, value):
    print(f'Event {type} for {key} value : {value}')

def decrease_counter():
    window.state.counter -= 1

def on_loaded(window):
    window.expose(decrease_counter)
    window.state += on_counter_change

if __name__ == '__main__':
    global window
    window = webview.create_window('State example', html=html)
    window.state.counter = 0
    window.events.loaded += on_loaded
    webview.start(debug=True)
```

# Toggle Fullscreen | pywebview

# Toggle Fullscreen

2/8/17Less than 1 minute

---

# [Toggle Fullscreen](#toggle-fullscreen)

Switch application window to a full-screen mode after five seconds..

```python
import time

import webview

def toggle_fullscreen(window):
    # wait a few seconds before toggle fullscreen:
    time.sleep(5)

    window.toggle_fullscreen()

if __name__ == '__main__':
    window = webview.create_window('Full-screen window', 'https://pywebview.flowrl.com/hello')
    webview.start(toggle_fullscreen, window)
```

# Transparent | pywebview

# Transparent

Less than 1 minute

---

# [Transparent](#transparent)

Create a transparent frameless window with custom chrome.

```python
import webview

html = """
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8">
        <title>Test app</title>
        <style>
            .frame {
                border-radius: 5px 5px 0 0;
                position: fixed;
                box-sizing: border-box;
                width: 90%;
                height: 90%;
                background-color: #0055e4;
                box-shadow: inset 1px 1px 1px 0px rgba(255,255,255,.25), inset -1px -1px 1px 0px rgba(0,0,0,.25), inset 0px 2px 4px -2px rgba(255,255,255,1);
            }
            .frame>tbody>tr>td {
                vertical-align: top;
            }
            .header {
                box-sizing: border-box;
                padding: 5px;
                height: 20px;
                font-weight: bold;
                color: white;
            }
            .header>img {
                height: 16px;
                transform: translateY(3px);
            }
            .content {
                box-sizing: border-box;
                background-color: #f0f0e8;
                margin: 0 5px 5px 5px ;
            }
            .bodypanel {
                background-color: #f0f0e8;
                height: 100%;
                box-shadow: 1px 1px 1px 0px rgba(255,255,255,.25), -1px -1px 1px 0px rgba(0,0,0,.25), inset 0px 0px 3px -2px rgba(0,0,0,1);
                padding: 5px;
            }
        </style>
	</head>
	<body>
        <table class="frame">
            <tbody>
                <tr>
                    <td class="header">
                        <img src="folder.png"/>
                        Danger!
                    </td>
                </tr>
                <tr>
                    <td class="body">
                        <div class="bodypanel">
                            <b>Alert!</b><br>
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit
                            <button>Button</button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
	</body>
</html>
"""

if __name__ == '__main__':
    # Create a transparent webview window
    webview.create_window(
        'Transparent window', html=html, transparent=True, frameless=True
    )  # , hidden=True)
    webview.start()
```

# User Agent | pywebview

# User Agent

4/30/20Less than 1 minute

---

# [User Agent](#user-agent)

Change the user-agent of a window.

```python
import webview

if __name__ == '__main__':
    webview.create_window('User Agent Test', 'https://pywebview.flowrl.com/hello')
    webview.start(user_agent='Custom user agent')
```

# Vibrancy | pywebview

# Vibrancy

1/13/23Less than 1 minute

---

# [Vibrancy](#vibrancy)

This example demonstrates how to set vibrancy on macOS.

```python
import webview

def load_css(window):
    window.load_css('body { background: transparent !important; }')

if __name__ == '__main__':
    window = webview.create_window(
        'Vibrancy example', 'https://pywebview.flowrl.com/hello', transparent=True, vibrancy=True
    )
    webview.start(load_css, window)
```

# Window State | pywebview

# Window State

Less than 1 minute

---

# [Window State](#window-state)

Minimize, restore and maximize window programmatically

```python
from time import sleep

import webview

def minimize(window):
    print('Window is started minimized')

    sleep(5)
    print('Restoring window')
    window.restore()

    sleep(5)
    print('Maximizing window')
    window.maximize()

    sleep(5)
    print('Minimizing window')
    window.minimize()

if __name__ == '__main__':
    window = webview.create_window(
        'Minimize window example', html='<h1>Minimize window</h1>', minimized=True
    )
    webview.start(minimize, window)
```

# Window Title Change | pywebview

# Window Title Change

1/26/18Less than 1 minute

---

# [Window Title Change](#window-title-change)

Change window title every three seconds.

```python
import webview

def change_title(window):
    """changes title every 3 seconds"""
    for i in range(1, 100):
        # exit loop when window is closed
        if window.events.closed.wait(3):
            break

        window.title = f'New Title #{i}'
        print(window.title)

if __name__ == '__main__':
    window = webview.create_window('Change title example', 'https://pywebview.flowrl.com/hello')
    webview.start(change_title, window)
```

# Security | pywebview

# Security

10/19/18Less than 1 minute

---

# [Security](#security)

It is advisable to enable SSL for local HTTP server. To accomplish this, simply start the application with the `ssl` paramater set to True `webview.start(ssl=True)`. You need to have `cryptography` pip dependency installed in order to use `ssl`. It is not installed by default.

If you employ a REST API, [CSRF attacks](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_\(CSRF\)) can be a major concern. _pywebview_ mitigates this risk by generating a session-unique token that is accessible in Python as `webview.token` and in JavaScript as `window.pywebview.token`. For more information on securing APIs, refer to the [CSRF Prevention Cheat Sheet](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_\(CSRF\)_Prevention_Cheat_Sheet). You can also see a practical example in the [Flask app](https://github.com/r0x0r/pywebview/tree/master/examples/flask_app).

# Security | pywebview

# Security

10/19/18Less than 1 minute

---

# [Security](#security)

It is advisable to enable SSL for local HTTP server. To accomplish this, simply start the application with the `ssl` paramater set to True `webview.start(ssl=True)`. You need to have `cryptography` pip dependency installed in order to use `ssl`. It is not installed by default.

If you employ a REST API, [CSRF attacks](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_\(CSRF\)) can be a major concern. _pywebview_ mitigates this risk by generating a session-unique token that is accessible in Python as `webview.token` and in JavaScript as `window.pywebview.token`. For more information on securing APIs, refer to the [CSRF Prevention Cheat Sheet](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_\(CSRF\)_Prevention_Cheat_Sheet). You can also see a practical example in the [Flask app](https://github.com/r0x0r/pywebview/tree/master/examples/flask_app).

# Debugging | pywebview

# Debugging

10/19/18Less than 1 minute

---

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


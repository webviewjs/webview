# Event Loop

WebviewJS uses **winit**'s non-blocking `pump_events()` internally so the GUI never blocks Node.js's event loop.

## How it works

`app.run()` is a thin JS wrapper that sets up a `setInterval` calling `app.pumpEvents()` on every tick:

```js
// Equivalent to what app.run() does
const timer = setInterval(() => {
  if (!app.pumpEvents()) app.stop();
}, 16); // ~60 FPS
```

Each call to `pumpEvents()` drains the OS message queue without waiting, then returns `true` if the app is still alive or `false` when it should shut down.

Because this runs inside a Node.js timer, all Node APIs (file I/O, network, child processes, etc.) work normally alongside the GUI.

## Controlling the interval

```js
// 30 FPS (more CPU-friendly for simple apps)
app.run({ interval: 33 });

// Let the process exit naturally even while the GUI is open
// (useful for scripts that should end when async work finishes)
app.run({ ref: false });
```

| Option     | Default | Description                                                             |
| ---------- | ------- | ----------------------------------------------------------------------- |
| `interval` | `16`    | Milliseconds between event pumps (~60 FPS)                              |
| `ref`      | `true`  | If `false`, the timer is `unref()`'d so it won't keep the process alive |

## Stopping manually

```js
app.stop(); // clears the interval but leaves windows open
app.exit(); // stop() + hides all windows + marks app as exited
```

`stop()` without `exit()` is useful if you want to take over the loop yourself:

```js
app.stop();
// run a tight loop for a CPU-intensive frame:
while (frames-- > 0) app.pumpEvents();
app.run(); // hand back to the interval
```

## macOS note

On macOS the main thread must own the GUI. WebviewJS always runs the event loop on the main thread (the thread that called `new Application()`). Do **not** create Application or BrowserWindow from a worker thread.

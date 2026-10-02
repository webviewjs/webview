---
title: 'Event loop'
description: 'How the non-blocking native event pump works with the JavaScript runtime.'
---

The native window system has its own event queue. WebviewJS processes it by calling `app.pumpEvents()`; it does not keep a second blocking loop running beside Node.js.

## `run()` and `pumpEvents()`

`app.run()` starts a JavaScript `setInterval` that pumps native events every 16 ms by default. The call returns immediately. The timer runs in the normal JavaScript event loop, so timers, I/O, and promises continue to run.

```js
app.run({ interval: 16 }); // about 60 event-pump calls per second
```

The interval is a polling cadence, not a frame-rate guarantee. `app.run({ ref: false })` calls `unref()` on the timer so it does not by itself keep the runtime alive. Calling `run()` when a timer is already active does not replace it or update its options. Deno added Node-style timer handles in 2.8; on earlier Deno 2 releases, leave `ref` at its default because the global timer returns a number. See [Deno's timer compatibility notes](https://docs.deno.com/runtime/fundamentals/node/#use-node-globals-like-process-and-buffer).

`app.pumpEvents()` processes one non-blocking batch and returns `true` while the application is active, or `false` after shutdown. `run()` uses that result to stop its timer. Use `pumpEvents()` directly only if you are managing the cadence yourself.

## Readiness

The `ready` event is emitted on the first `pumpEvents()` call, or immediately before `runSync()` enters the native event loop. `whenReady()` starts the pump automatically unless `{ autoRun: false }` is passed:

```js
await app.whenReady();
const win = app.createBrowserWindow();
```

Manual mode gives the caller responsibility for pumping at least once:

```js
const ready = app.whenReady({ autoRun: false });
app.pumpEvents();
await ready;
```

With `autoRun: false`, `interval` and `ref` are invalid options because no timer is created.

## Blocking mode

`app.runSync()` enters Tao's native event loop on the current thread and blocks JavaScript until the native loop exits. Use it only when stopping JavaScript execution during the GUI loop is acceptable. `run()` is the normal choice when the app also needs Node.js or Bun asynchronous work.

## Stop and exit

```js
app.stop(); // stop only the JavaScript timer; windows and native resources remain
app.exit(); // dispose application-owned native resources and mark the app exited
```

`stop()` is useful before taking over event pumping yourself. It does not close or dispose windows. `exit()` prevents creation of new resources; a running `run()` timer stops on its next pump. See [Application lifecycle](../guides/application-lifecycle) for shutdown and window-close behavior.

On macOS, create and use `Application` on the main JavaScript thread. Do not move GUI calls to a worker thread.

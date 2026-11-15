// Real addon only: this child must run on the AppKit main thread, outside the test runner.
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const { Application } = require('../../../index.js');
const app = new Application();
const windows = [];
const views = [];

function check(value, message) {
  if (!value) throw new Error(message);
}

async function until(predicate, message) {
  const deadline = Date.now() + 10000;
  while (!predicate()) {
    check(Date.now() < deadline, message);
    await delay(50);
  }
}

try {
  // Match CanvasWindowManager, including the unreferenced 50ms pump.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await app.whenReady({ interval: 50, ref: false });
    if (process.argv[2] === 'shadows') {
      let combinations = 0;
      for (const decorations of [false, true]) {
        for (const resizable of [false, true]) {
          for (const minimizable of [false, true]) {
            for (const shadow of [false, true]) {
              const win = app.createBrowserWindow({ decorations, resizable, minimizable, macosHasShadow: shadow });
              windows.push(win);
              const view = win.createWebview({ html: '<h1>Shadow regression</h1>' });
              views.push(view);
              check(
                win.hasShadow() === shadow,
                `initial shadow: ${JSON.stringify({ decorations, resizable, minimizable, shadow })}`,
              );
              for (const enabled of [true, false]) {
                win.setDecorations(enabled);
                win.setResizable(enabled);
                win.setMinimizable(enabled);
                check(win.hasShadow() === shadow, 'style mutation changed shadow');
              }
              for (const enabled of [!shadow, shadow]) {
                win.setHasShadow(enabled);
                check(win.hasShadow() === enabled, 'runtime shadow mutation');
              }
              view.dispose();
              win.dispose();
              combinations++;
            }
          }
        }
      }
      console.log(JSON.stringify({ combinations }));
    } else {
      const url = process.argv[3];
      const html = `<h1>hello</h1><script>window.ticks=0;setInterval(()=>{window.ticks++;window.ipc.postMessage('tick')},100)</script>`;
      let ipc = 0;
      const messages = [];
      for (const options of [{ url }, { html }, { url: `data:text/html,${encodeURIComponent(html)}` }]) {
        const win = app.createBrowserWindow({
          title: 'WKWebView pump regression',
          width: 400,
          height: 250,
          logical: true,
        });
        windows.push(win);
        const view = win.createWebview(options);
        views.push(view);
        const received = { count: 0 };
        messages.push(received);
        view.onIpcMessage(() => {
          ipc++;
          received.count++;
        });
        // Verify each page before creating another window or requesting focus.
        let result;
        await until(() => {
          if (result === undefined)
            view.evaluateScriptWithCallback("document.querySelector('h1')?.textContent", (error, value) => {
              if (error) throw error;
              result = value;
            });
          if (result && !result.includes('hello')) result = undefined;
          return result?.includes('hello');
        }, 'page never loaded without interaction');
        view.evaluateScript("document.querySelector('h1').textContent='updated';window.ipc.postMessage('evaluated')");
      }
      // Wry 0.55.1 drops data: IPC because http::Uri rejects opaque data URLs.
      // Check data-page JS timers directly; require IPC from HTTP and inline HTML.
      await until(
        () => messages.slice(0, 2).every((message) => message.count >= 3),
        'IPC and page timers did not progress',
      );
      // Match the issue's observation period, with no focus or input intervention.
      await delay(7000);
      const dataTicks = await new Promise((resolve, reject) =>
        views[2].evaluateScriptWithCallback('window.ticks', (error, value) => (error ? reject(error) : resolve(value))),
      );
      check(Number(dataTicks) >= 2, 'data page timer did not progress');
      app.stop();
      for (let i = 0; i < 20; i++) {
        check(app.pumpEvents(), 'repeated external pump stopped early');
        await delay(50);
      }
      app.run({ interval: 50, ref: false });
      // Only manipulate native windows after unaided navigation has passed.
      for (const win of windows) {
        win.setSize(460, 300, true);
        win.focus();
        await delay(100);
        check(win.isFocused(), 'window did not receive focus');
        check(win.getInnerSize(true).width === 460, 'resize failed');
      }
      for (const view of views) {
        const value = await new Promise((resolve) =>
          view.evaluateScriptWithCallback("document.querySelector('h1').textContent", (error, value) => {
            if (error) throw error;
            resolve(value);
          }),
        );
        check(value.includes('updated'), 'JavaScript DOM mutation failed');
      }
      console.log(JSON.stringify({ pages: views.length, ipc, dataTicks: Number(dataTicks) }));
    }
  } finally {
    clearInterval(keepAlive);
  }
} finally {
  for (const view of views) if (!view.isDisposed()) view.dispose();
  for (const win of windows) {
    if (!win.isDisposed()) win.dispose();
    check(win.isDisposed(), 'window cleanup failed');
  }
  app.exit();
  app.stop();
  for (let i = 0; i < 3; i++) app.pumpEvents();
}
// Keep the embedding host alive after shutdown to expose stale native observers.
await delay(200);

// Repro for @webviewjs/webview 0.4.5 on Linux / X11 / GTK3.
//
// Tray app pattern: an invisible anchor window keeps the app alive, and the
// visible window is meant to hide on close and come back from the tray.
//
// Run: node repro-close-quit.mjs        (xdotool is used to press the WM close
//                                        button; close it by hand if missing)
import { Application } from '../index.js';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 23)}]`, ...a);
const step = (name, fn) => {
  try {
    const r = fn();
    log(`OK   ${name}`, r === undefined ? '' : `-> ${r}`);
    return r;
  } catch (e) {
    log(`FAIL ${name}: ${e?.message ?? e}`);
  }
};

process.on('uncaughtException', (e) => log('uncaughtException:', e?.stack ?? e));

const PAGE = "<body style='background:#c33;font:700 40px sans-serif'>PAINTED</body>";
const PROFILE = mkdtempSync(join(tmpdir(), 'webview-repro-'));

const app = new Application();
await app.whenReady();

// Invisible anchor window: keeps the tray alive with no visible windows.
app.createBrowserWindow({ visible: false });

// 16x16 PNG.
const icon = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGElEQVR4nGNgqLj+nyI8asCoAaMGDBcDAAwzTh8JA9THAAAAAElFTkSuQmCC',
  'base64',
);
app.createTrayIcon({ icon: { data: icon }, tooltip: 'repro', menu: { items: [{ id: 'quit', label: 'Quit' }] } });

let win = null;
let webContext = null;
let reuseContext = true; // second pass flips this to show the difference

function openWindow() {
  win = app.createBrowserWindow({ title: 'repro-close-quit', width: 420, height: 300 });
  // Intended "hide instead of destroy" behaviour. Never fires on Linux.
  win.on('close', (event) => {
    log('close event');

    event.preventDefault();

    step('close event -> win.hide()', () => win.hide());
  });

  if (!webContext || !reuseContext) {
    webContext = app.createWebContext({ dataDirectory: PROFILE });
  }
  if (!webContext.isCustomProtocolRegistered('app')) {
    win.registerProtocol('app', async () => {
      log('protocol handler called');
      return new Response(PAGE, { headers: { 'Content-Type': 'text/html' } });
    });
  }
  const wv = win.createWebview({ url: 'app://localhost/index.html', webContext, enableDevtools: false });
  wv.on('page-load-finished', (e) => log('page-load-finished', e.url));
  log('window created');
}

const wmClose = () => {
  const ids = execFileSync('xdotool', ['search', '--name', '^repro-close-quit$']).toString().trim().split('\n');

  const id = ids[ids.length - 1];

  execFileSync('xdotool', ['windowactivate', '--sync', id, 'key', '--clearmodifiers', 'alt+F4']);
};

openWindow();

setTimeout(() => {
  log('--- 1. pressing the WM close button ---');
  step('wm close', wmClose);
}, 3000);

setTimeout(() => {
  log('--- 2. the JS handle after the WM close ---');
  step('win.isDisposed()', () => win.isDisposed());
  step('win.isVisible()', () => win.isVisible());
  step('win.show()', () => win.show());
}, 5000);

setTimeout(() => {
  log('--- 3. rebuilding the window, REUSING the same WebContext ---');
  reuseContext = true;
  openWindow();
}, 6000);

setTimeout(() => {
  log('(look at the window: it stays blank, and no page-load-finished above)');
  step('wm close', wmClose);
}, 11000);

setTimeout(() => {
  log('--- 4. rebuilding the window with a FRESH WebContext on the same dataDirectory ---');
  reuseContext = false;
  openWindow();
}, 12000);

setTimeout(() => {
  log('(this one paints)');
  log('--- 5. quitting ---');
  step('app.exit()', () => app.exit());
  setTimeout(() => {
    log('still running 1s after app.exit(); falling back to process.exit(0)');
    process.exit(0);
  }, 1000);
}, 17000);

app.run();

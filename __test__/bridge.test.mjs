import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { Application, BrowserWindow, SerializationError, Webview } from '../index.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));

function protocolWindow() {
  return {
    completed: [],
    _registerProtocol(_name, callback) {
      this.callback = callback;
    },
    _completeProtocol(id, response) {
      this.completed.push([id, response]);
    },
  };
}

function exposedWebview() {
  return {
    scripts: [],
    _exposeInternal(_name, _statics, _functions, callback) {
      this.callback = callback;
    },
    evaluateScript(script) {
      this.scripts.push(script);
    },
  };
}

function eventApplication() {
  return {
    onEvent(callback) {
      this.applicationEventCallback = callback;
    },
  };
}

test('Application dispatches native events through named EventEmitter events', () => {
  const app = eventApplication();
  const received = [];

  Application.prototype.on.call(app, 'window-close-requested', (event) => received.push(['window', event]));
  Application.prototype.on.call(app, 'application-close-requested', (event) => received.push(['application', event]));
  Application.prototype.on.call(app, 'custom-menu-click', (event) => received.push(['menu', event]));

  const windowEvent = { event: 0 };
  const applicationEvent = { event: 1 };
  const menuEvent = { event: 2, customMenuEvent: { id: 'save', windowId: 7 } };
  app.applicationEventCallback(windowEvent);
  app.applicationEventCallback(applicationEvent);
  app.applicationEventCallback(menuEvent);

  assert.deepEqual(received, [
    ['window', windowEvent],
    ['application', applicationEvent],
    ['menu', menuEvent],
  ]);
});

test('Application EventEmitter methods are chainable and removable', () => {
  const app = eventApplication();
  const listener = () => {};

  assert.equal(Application.prototype.on.call(app, 'window-close-requested', listener), app);
  assert.equal(Application.prototype.off.call(app, 'window-close-requested', listener), app);
  assert.equal(Application.prototype.listenerCount.call(app, 'window-close-requested'), 0);
});

test('registerProtocol completes an asynchronous handler response', async () => {
  const win = protocolWindow();

  BrowserWindow.prototype.registerProtocol.call(win, 'app', async (request) => ({
    statusCode: 200,
    body: Buffer.from(request.url),
    mimeType: 'text/plain',
  }));

  win.callback(JSON.stringify({ id: 9, url: 'app://localhost/index.html', method: 'GET', headers: [], body: null }));
  await flush();

  assert.deepEqual(win.completed, [
    [
      9,
      {
        statusCode: 200,
        body: Buffer.from('app://localhost/index.html'),
        mimeType: 'text/plain',
      },
    ],
  ]);
});

test('registerProtocol maps a rejected asynchronous handler to a text 500 response', async () => {
  const win = protocolWindow();

  BrowserWindow.prototype.registerProtocol.call(win, 'app', async () => {
    throw new Error('read failed');
  });

  win.callback(JSON.stringify({ id: 10, url: 'app://localhost/missing', method: 'GET', headers: [], body: null }));
  await flush();

  assert.equal(win.completed[0][0], 10);
  assert.equal(win.completed[0][1].statusCode, 500);
  assert.equal(win.completed[0][1].mimeType, 'text/plain');
  assert.equal(win.completed[0][1].body.toString(), 'read failed');
});

test('expose rejects circular static values with SerializationError', () => {
  const webview = exposedWebview();
  const circular = {};
  circular.self = circular;

  assert.throws(() => Webview.prototype.expose.call(webview, 'native', { circular }), SerializationError);
});

test('expose rejects a duplicate namespace at registration time', () => {
  const webview = exposedWebview();

  Webview.prototype.expose.call(webview, 'native', { first: true });

  assert.throws(() => Webview.prototype.expose.call(webview, 'native', { second: true }), /already registered/);
});

test('expose resolves asynchronous Node functions in the page bridge', async () => {
  const webview = exposedWebview();

  Webview.prototype.expose.call(webview, 'native', { answer: async () => 42, isCool: true });
  webview.callback({ ns: 'native', method: 'answer', id: 1, argsJson: '[]' });
  await flush();

  assert.match(webview.scripts.at(-1), /resolve\(1,42\)/);
});

test('expose sends a SerializationError name to the page for non-serializable results', async () => {
  const webview = exposedWebview();

  Webview.prototype.expose.call(webview, 'native', { broken: () => 1n });
  webview.callback({ ns: 'native', method: 'broken', id: 2, argsJson: '[]' });
  await flush();

  assert.match(webview.scripts.at(-1), /SerializationError/);
});

test('expose example uses an app protocol instead of a file origin for IPC', async () => {
  const source = await readFile(new URL('../examples/expose.mjs', import.meta.url), 'utf8');

  assert.match(source, /window\.registerProtocol\('app', async/);
  assert.match(source, /url:\s*'app:\/\/localhost\/index\.html'/);
  assert.doesNotMatch(source, /new URL\('\.\/assets\/expose\/index\.html'/);
});

test('Hono custom protocol example forwards Fetch requests to dynamic routes', async () => {
  const source = await readFile(new URL('../examples/custom-protocol-hono.mjs', import.meta.url), 'utf8');

  assert.match(source, /import\s+\{\s*Hono\s*\}\s+from\s+'hono'/);
  assert.match(source, /router\.get\(['"]\/\*['"]/);
  assert.match(source, /router\.fetch\(request\)/);
  assert.match(source, /href="\/"/);
  assert.match(source, /href="\/about"/);
  assert.match(source, /href="\/products"/);
  assert.match(source, /href="\/contact"/);
  assert.doesNotMatch(source, /statusCode\s*:/);
});

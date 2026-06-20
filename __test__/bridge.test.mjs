import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { BrowserWindow, SerializationError, Webview } from '../index.js';

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

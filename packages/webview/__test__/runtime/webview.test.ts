import { createRequire } from 'node:module';
import { expect, test } from 'bun:test';

const require = createRequire(import.meta.url);
const { Application } = require('../../dist/index.js');
const { native } = require('../native/harness.ts');

test('createWebview forwards native options, webContext, and callbacks in native argument order', () => {
  const app = new Application();
  const win = app.createBrowserWindow();
  const context = app.createWebContext({ dataDirectory: '/tmp/webview-profile' });
  const navigationHandler = (url) => url.startsWith('app://');
  const newWindowHandler = (event) => event.url !== 'https://blocked.test/';
  const options = {
    url: 'app://localhost/index.html',
    width: 640,
    height: 480,
    webContext: context,
    navigationHandler,
    newWindowHandler,
  };

  const view = win.createWebview(options);
  const args = native.webview(view).createArgs;
  expect(args[0]).toEqual({ url: options.url, width: 640, height: 480 });
  expect(args[1]).toBe(context);
  expect(typeof args[2]).toBe('function');
  expect(args[3]).toBe(navigationHandler);
  expect(typeof args[4]).toBe('function');
  expect(native.window(win).navigate(view, 'app://localhost/next')).toBe(true);
  expect(native.window(win).navigate(view, 'https://external.test/')).toBe(false);
  expect(native.window(win).requestNewWindow(view, { event: 'new-window', url: 'https://blocked.test/' })).toBe(false);
});

test('createWebview supplies null defaults and returns the native Webview runtime class', () => {
  const app = new Application();
  const win = app.createBrowserWindow();
  const view = win.createWebview({ html: '<h1>hello</h1>' });

  expect(native.webview(view).createArgs).toEqual([
    { html: '<h1>hello</h1>' },
    null,
    native.webview(view).createArgs[2],
    null,
    null,
  ]);
  expect(view.constructor).toBe(require('../../dist/index.js').Webview);
});

test('native webview events reach listeners on the returned webview instance', () => {
  const win = new Application().createBrowserWindow();
  const view = win.createWebview();
  const received = [];
  view.on('navigation', (event) => received.push(event));
  view.on('page-load', (event) => received.push(event));

  native.webview(view).emit('navigation', { url: 'app://localhost/' });
  native.webview(view).emit({ event: 'page-load', status: 'finished' });

  expect(received).toEqual([
    { event: 'navigation', url: 'app://localhost/' },
    { event: 'page-load', status: 'finished' },
  ]);
});

test('native event callback forwards error-first failures', () => {
  const view = new Application().createBrowserWindow().createWebview();
  const failure = new Error('native callback failed');
  let received: unknown;
  try {
    native.webview(view).emitError(failure);
  } catch (error) {
    received = error;
  }
  expect(received).toBe(failure);
});

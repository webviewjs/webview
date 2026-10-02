import { createRequire } from 'node:module';
import { expect, test } from 'bun:test';

const require = createRequire(import.meta.url);
const { Application } = require('../../dist/index.js');
const { native } = require('../native/harness.ts');

test('Symbol.dispose is wired for every native resource wrapper', () => {
  const app = new Application();
  const win = app.createBrowserWindow();
  const view = win.createWebview();
  const context = app.createWebContext();
  const tray = app.createTrayIcon({});

  for (const resource of [app, win, view, context, tray]) {
    expect(typeof resource[Symbol.dispose]).toBe('function');
  }

  app[Symbol.dispose]();
  win[Symbol.dispose]();
  view[Symbol.dispose]();
  context[Symbol.dispose]();
  tray[Symbol.dispose]();

  expect(native.application(app).exited).toBe(true);
  expect(native.window(win).disposed).toBe(true);
  expect(native.webview(view).disposed).toBe(true);
  expect(win.isDisposed()).toBe(true);
  expect(context.isDisposed()).toBe(true);
  expect(tray.isDisposed()).toBe(true);
});

test('disposed native resources reject later methods instead of silently accepting calls', () => {
  const app = new Application();
  const win = app.createBrowserWindow();
  const view = win.createWebview();
  const context = app.createWebContext();
  const tray = app.createTrayIcon({});

  win.dispose();
  view.dispose();
  context.dispose();
  tray.dispose();

  expect(() => win.setTitle('closed')).toThrow(/disposed/);
  expect(() => view.evaluateScript('1 + 1')).toThrow(/disposed/);
  expect(() => context.setAllowsAutomation(true)).toThrow(/disposed/);
  expect(() => tray.setTitle('closed')).toThrow(/disposed/);
  expect(native.window(win).emit('focus')).toBe(false);
  expect(native.webview(view).emit('page-load')).toBe(false);
  expect(native.tray(tray).emit('click')).toBe(false);
});

import { createRequire } from 'node:module';
import { expect, test } from 'bun:test';

const require = createRequire(import.meta.url);
const { Application } = require('../../dist/index.js');
const { native } = require('../native/harness.ts');

function window() {
  return new Application().createBrowserWindow();
}

test('BrowserWindow forwards native events through a per-instance EventEmitter', () => {
  const first = window();
  const second = window();
  const received = [];
  const listener = (payload) => received.push(['first', payload]);

  first.on('resize', listener).once('focus', (payload) => received.push(['once', payload]));
  second.on('resize', (payload) => received.push(['second', payload]));
  native.window(first).emit('resize', { width: 800, height: 600 });
  native.window(first).emit('focus');
  native.window(first).emit('focus');
  native.window(second).emit('resize', { width: 400, height: 300 });
  first.off('resize', listener);

  expect(received).toEqual([
    ['first', { event: 'resize', width: 800, height: 600 }],
    ['once', { event: 'focus' }],
    ['second', { event: 'resize', width: 400, height: 300 }],
  ]);
  expect(first.listenerCount('resize')).toBe(0);
  expect(second.listenerCount('resize')).toBe(1);
  expect(native.window(first).calls.filter((call) => call.method === '_onWindowEvent').length).toBe(1);
});

test('close cancellation is dispatch-scoped and repeated preventDefault calls are idempotent', () => {
  const win = window();
  const observed = [];
  let closeEvent;

  win.on('close', (event) => {
    closeEvent = event;
    observed.push(['first', event.defaultPrevented]);
    event.preventDefault();
    observed.push(['after-prevent', event.defaultPrevented]);
    event.preventDefault();
  });
  win.on('close', (event) => observed.push(['second', event.defaultPrevented]));

  native.window(win).emit('close');
  closeEvent.preventDefault();

  expect(observed).toEqual([
    ['first', false],
    ['after-prevent', true],
    ['second', true],
  ]);
  expect(native.window(win).calls.filter((call) => call.method === '_preventClose').length).toBe(1);
  expect(closeEvent.defaultPrevented).toBe(true);
});

test('a failed native close cancellation stays unprevented and may be retried', () => {
  const win = window();
  const observed = [];
  native.window(win).setPreventCloseResult(false);
  win.on('close', (event) => {
    event.preventDefault();
    observed.push(event.defaultPrevented);
    event.preventDefault();
  });

  native.window(win).emit('close');
  expect(observed).toEqual([false]);
  expect(native.window(win).calls.filter((call) => call.method === '_preventClose').length).toBe(2);
});

test('close listeners run in order, prevention resets per dispatch, and reentrant hide is safe', () => {
  const win = window();
  const observed = [];
  let preventNext = true;
  let retained;
  win.on('close', (event) => {
    retained ??= event;
    observed.push(['first', event.defaultPrevented]);
    if (preventNext) {
      event.preventDefault();
      preventNext = false;
      win.hide();
    }
  });
  win.on('close', (event) => observed.push(['second', event.defaultPrevented]));

  native.window(win).emit('close');
  native.window(win).emit('close');
  retained.preventDefault();

  expect(observed).toEqual([
    ['first', false],
    ['second', true],
    ['first', false],
    ['second', false],
  ]);
  expect(native.window(win).calls.filter((call) => call.method === '_preventClose').length).toBe(1);
  expect(native.window(win).calls.filter((call) => call.method === 'hide').length).toBe(1);
});

test('preventDefault after dispatch cannot call the native close hook', () => {
  const win = window();
  let saved;
  win.on('close', (event) => {
    saved = event;
  });

  native.window(win).emit('close');
  const callsBefore = native.window(win).calls.filter((call) => call.method === '_preventClose').length;
  saved.preventDefault();

  expect(saved.defaultPrevented).toBe(false);
  expect(native.window(win).calls.filter((call) => call.method === '_preventClose').length).toBe(callsBefore);
});

test('dispose is available through Symbol.dispose and blocks later native operations', () => {
  const win = window();
  win[Symbol.dispose]();

  expect(native.window(win).disposed).toBe(true);
  expect(native.window(win).calls.filter((call) => call.method === 'dispose').length).toBe(1);
  expect(native.window(win).emit('focus')).toBe(false);
  expect(() => win.setTitle('after disposal')).toThrow(/disposed/);
});

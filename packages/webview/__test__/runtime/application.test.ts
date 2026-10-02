import { createRequire } from 'node:module';
import { expect, jest, test } from 'bun:test';

const require = createRequire(import.meta.url);
const { Application } = require('../../dist/index.js');
const { native } = require('../native/harness.ts');

function calls(application, name) {
  return native.application(application).calls.filter((call) => call.method === name);
}

test('native application events subscribe once and use isolated EventEmitters', () => {
  const first = new Application();
  const second = new Application();
  const received = [];

  first.on('ready', (event) => received.push(['first', event]));
  first.once('custom-menu-click', (event) => received.push(['once', event]));
  second.on('ready', (event) => received.push(['second', event]));
  first.on('ready', (event) => received.push(['also-first', event]));

  expect(calls(first, 'onEvent').length).toBe(1);
  expect(calls(second, 'onEvent').length).toBe(1);
  const ready = { event: 'ready' };
  const menu = { event: 'custom-menu-click', customMenuEvent: { id: 'save' } };
  native.application(first).emit(ready);
  native.application(first).emit(menu);
  native.application(first).emit(menu);
  native.application(second).emit(ready);

  expect(received).toEqual([
    ['first', ready],
    ['also-first', ready],
    ['once', menu],
    ['second', ready],
  ]);
  expect(first.listenerCount('custom-menu-click')).toBe(0);
});

test('run is idempotent, defaults to 16ms, honors ref false, and stop clears its timer', () => {
  jest.useFakeTimers();
  try {
    const setInterval = jest.spyOn(globalThis, 'setInterval');
    const app = new Application();

    app.run({ ref: false });
    app.run({ interval: 5, ref: true });
    expect(setInterval.mock.calls.length).toBe(1);
    expect(setInterval.mock.calls[0][1]).toBe(16);
    expect(setInterval.mock.results[0].value.hasRef()).toBe(false);
    expect(jest.getTimerCount()).toBe(1);

    jest.advanceTimersByTime(15);
    expect(calls(app, 'pumpEvents').length).toBe(0);
    jest.advanceTimersByTime(1);
    expect(calls(app, 'pumpEvents').length).toBe(1);

    app.stop();
    app.stop();
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

test('run uses the requested interval and a false pump result stops polling', () => {
  jest.useFakeTimers();
  try {
    const app = new Application();
    native.application(app).setPumpResult(false);

    app.run({ interval: 24 });
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(23);
    expect(calls(app, 'pumpEvents').length).toBe(0);
    jest.advanceTimersByTime(1);
    expect(calls(app, 'pumpEvents').length).toBe(1);
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

test('whenReady starts the default pump and resolves on the ready event', async () => {
  jest.useFakeTimers();
  try {
    const app = new Application();
    const ready = app.whenReady();

    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(15);
    native.application(app).emit('ready');
    await ready;
    expect(app.isReady()).toBe(true);
    app.stop();
  } finally {
    jest.useRealTimers();
  }
});

test('whenReady resolves asynchronously when already ready and supports manual pumping', async () => {
  jest.useFakeTimers();
  try {
    const readyApp = new Application();
    native.application(readyApp).setReady();
    let resolved = false;
    const alreadyReady = readyApp.whenReady();
    alreadyReady.then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);
    await alreadyReady;
    expect(jest.getTimerCount()).toBe(1);

    readyApp.stop();
    const manualApp = new Application();
    const manualReady = manualApp.whenReady({ autoRun: false });
    expect(jest.getTimerCount()).toBe(0);
    native.application(manualApp).emit('ready');
    await manualReady;
    expect(() => manualApp.whenReady({ autoRun: false, interval: 10 })).toThrow(TypeError);
    expect(() => manualApp.whenReady({ autoRun: false, ref: false })).toThrow(TypeError);
  } finally {
    jest.useRealTimers();
  }
});

test('legacy onEvent and bind update one callback alongside EventEmitter listeners', () => {
  const app = new Application();
  const received = [];
  app.on('ready', (event) => received.push(['emitter', event]));
  app.onEvent((event) => received.push(['old', event]));
  app.bind((event) => received.push(['bind', event]));
  native.application(app).emit('ready');
  app.onEvent(null);
  native.application(app).emit('ready');

  expect(received.map(([kind]) => kind)).toEqual(['emitter', 'bind', 'emitter']);
  expect(calls(app, 'onEvent').length).toBe(1);
});

test('Application Symbol.dispose exits the native application', () => {
  const app = new Application();
  app[Symbol.dispose]();
  expect(calls(app, 'exit').length).toBe(1);
  expect(native.application(app).exited).toBe(true);
});

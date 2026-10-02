import { createRequire } from 'node:module';
import { expect, test } from 'bun:test';

const require = createRequire(import.meta.url);
const { Application } = require('../../dist/index.js');
const { native } = require('../native/harness.ts');

test('tray events forward through one native subscription and isolate instances', () => {
  const app = new Application();
  const first = app.createTrayIcon({ tooltip: 'first' });
  const second = app.createTrayIcon({ tooltip: 'second' });
  const received = [];

  first.on('click', (event) => received.push(['first', event]));
  first.once('move', (event) => received.push(['once', event]));
  first.on('click', (event) => received.push(['also-first', event]));
  second.on('click', (event) => received.push(['second', event]));
  native.tray(first).emit('click', { x: 4, y: 8 });
  native.tray(first).emit('move', { x: 5, y: 9 });
  native.tray(first).emit('move', { x: 6, y: 10 });
  native.tray(second).emit('click', { x: 1, y: 2 });

  expect(received).toEqual([
    ['first', { event: 'click', x: 4, y: 8 }],
    ['also-first', { event: 'click', x: 4, y: 8 }],
    ['once', { event: 'move', x: 5, y: 9 }],
    ['second', { event: 'click', x: 1, y: 2 }],
  ]);
  expect(native.tray(first).createdWith.tooltip).toBe('first');
  expect(native.tray(first).calls.filter((call) => call.method === '_onTrayEvent').length).toBe(1);
  expect(native.tray(second).calls.filter((call) => call.method === '_onTrayEvent').length).toBe(1);
});

test('tray disposal disconnects native events and rejects later native operations', () => {
  const tray = new Application().createTrayIcon({});
  tray[Symbol.dispose]();

  expect(native.tray(tray).disposed).toBe(true);
  expect(native.tray(tray).emit('click')).toBe(false);
  expect(() => tray.setTitle('after disposal')).toThrow(/disposed/);
});

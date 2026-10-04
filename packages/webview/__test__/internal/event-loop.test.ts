import { createRequire } from 'node:module';
import { expect, jest, test } from 'bun:test';

const require = createRequire(import.meta.url);
const { ApplicationEventLoop } = require('../../dist/internal/application/event-loop.js');

test('event loop starts once with a 16ms default and stops cleanly', () => {
  jest.useFakeTimers();
  try {
    const pumpCalls = [];
    const loop = new ApplicationEventLoop(() => {
      pumpCalls.push('pump');
      return true;
    });

    loop.start();
    loop.start({ interval: 3 });
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(15);
    expect(pumpCalls).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(pumpCalls).toEqual(['pump']);
    loop.stop();
    loop.stop();
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

test('event loop stops itself when native pumping returns false', () => {
  jest.useFakeTimers();
  try {
    let pumps = 0;
    const loop = new ApplicationEventLoop(() => {
      pumps += 1;
      return false;
    });

    loop.start({ interval: 10, ref: false });
    jest.advanceTimersByTime(10);
    jest.advanceTimersByTime(100);
    expect(pumps).toBe(1);
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

test('a native pump error stops polling and preserves the original error', () => {
  jest.useFakeTimers();
  const intervalSpy = jest.spyOn(globalThis, 'setInterval');
  try {
    const failure = new Error('iOS does not support event-loop pumping');
    let pumps = 0;
    const loop = new ApplicationEventLoop(() => {
      pumps += 1;
      throw failure;
    });

    loop.start();
    const tick = intervalSpy.mock.calls[0][0] as () => void;
    expect(tick).toThrow(failure);
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(100);
    expect(pumps).toBe(1);
  } finally {
    intervalSpy.mockRestore();
    jest.useRealTimers();
  }
});

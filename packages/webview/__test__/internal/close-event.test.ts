import { createRequire } from 'node:module';
import { expect, test } from 'bun:test';

const require = createRequire(import.meta.url);
const { BrowserWindowCloseEvent } = require('../../dist/internal/events/browser-window-close-event.js');

test('close event cancellation is idempotent and ends with dispatch', () => {
  let prevented = 0;
  const event = new BrowserWindowCloseEvent({ event: 'close', reason: 'user' }, () => {
    prevented += 1;
    return true;
  });

  expect(event.reason).toBe('user');
  expect(event.defaultPrevented).toBe(false);
  event.preventDefault();
  event.preventDefault();
  expect(event.defaultPrevented).toBe(true);
  event.finishDispatch();
  event.preventDefault();
  expect(prevented).toBe(1);
  expect(event.defaultPrevented).toBe(true);
});

test('failed cancellation remains retryable only while dispatch is active', () => {
  let calls = 0;
  const event = new BrowserWindowCloseEvent({ event: 'close' }, () => {
    calls += 1;
    return false;
  });

  event.preventDefault();
  event.preventDefault();
  expect(event.defaultPrevented).toBe(false);
  expect(calls).toBe(2);
  event.finishDispatch();
  event.preventDefault();
  expect(calls).toBe(2);
});

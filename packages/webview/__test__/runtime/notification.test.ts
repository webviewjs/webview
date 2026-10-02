import { createRequire } from 'node:module';
import { expect, test } from 'bun:test';

const require = createRequire(import.meta.url);
const { Notification } = require('../../dist/index.js');
const { native } = require('../native/harness.ts');

test('notification options normalize defaults and pass exact native constructor arguments', () => {
  const image = Buffer.from([1, 2, 3]);
  const notification = new Notification('Title', {
    body: 'Body',
    icon: '/icon.png',
    image,
    badge: '/badge.png',
    tag: 'updates',
    data: { id: 7 },
    dir: 'rtl',
    lang: 'en',
    renotify: true,
    requireInteraction: true,
    persistent: true,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'save', title: 'Save', icon: '/save.png' },
    ],
    silent: true,
    timestamp: 123,
    vibrate: [100, 50],
  });
  const fake = native.notification(notification);

  expect(fake.constructorArgs[0]).toEqual({
    title: 'Title',
    body: 'Body',
    icon: '/icon.png',
    imagePath: undefined,
    imageData: image,
    requireInteraction: true,
    persistent: true,
    actions: [
      { action: 'open', title: 'Open', icon: undefined },
      { action: 'save', title: 'Save', icon: '/save.png' },
    ],
  });
  expect(typeof fake.constructorArgs[1]).toBe('function');
  expect(notification.title).toBe('Title');
  expect(notification.body).toBe('Body');
  expect(notification.icon).toBe('/icon.png');
  expect(notification.image).toBe(image);
  expect(notification.badge).toBe('/badge.png');
  expect(notification.tag).toBe('updates');
  expect(notification.data).toEqual({ id: 7 });
  expect(notification.dir).toBe('rtl');
  expect(notification.lang).toBe('en');
  expect(notification.renotify).toBe(true);
  expect(notification.requireInteraction).toBe(true);
  expect(notification.persistent).toBe(true);
  expect(notification.actions[0].icon).toBe('');
  expect(notification.silent).toBe(true);
  expect(notification.timestamp).toBe(123);
  expect(notification.vibrate).toEqual([100, 50]);

  const defaults = new Notification('Defaults', { timestamp: 456 });
  expect({
    body: defaults.body,
    icon: defaults.icon,
    image: defaults.image,
    badge: defaults.badge,
    tag: defaults.tag,
    dir: defaults.dir,
    lang: defaults.lang,
    renotify: defaults.renotify,
    requireInteraction: defaults.requireInteraction,
    persistent: defaults.persistent,
    actions: defaults.actions,
    silent: defaults.silent,
    timestamp: defaults.timestamp,
    vibrate: defaults.vibrate,
  }).toEqual({
    body: '',
    icon: '',
    image: '',
    badge: '',
    tag: '',
    dir: 'auto',
    lang: '',
    renotify: false,
    requireInteraction: false,
    persistent: false,
    actions: [],
    silent: false,
    timestamp: 456,
    vibrate: [],
  });
});

test('notification validates image and persistent action options', () => {
  expect(() => new Notification('Bad image', { image: 3 })).toThrow(/image/i);
  expect(() => new Notification('Bad actions', { actions: {} })).toThrow(/actions/i);
  expect(
    () =>
      new Notification('Actions need persistence', {
        actions: [{ action: 'open', title: 'Open' }],
      }),
  ).toThrow(/persistent/i);
  expect(() => new Notification('Bad action item', { persistent: true, actions: [null] })).toThrow(TypeError);
  expect(() => {
    new Notification('Bad DOM handler').onclick = 2;
  }).toThrow(/function or null/i);
});

test('native show, click, close, and error events dispatch to EventEmitter and DOM handlers', () => {
  const notification = new Notification('Events', { persistent: true });
  const fake = native.notification(notification);
  const received = [];
  notification.on('show', (event) => received.push(['emitter', event]));
  notification.onshow = (event) => received.push(['dom', event]);
  fake.show();
  expect(received[0][1]).toBe(received[1][1]);
  expect(received[0][1].type).toBe('show');
  expect(received[0][1].target).toBe(notification);

  notification.on('click', (event) => received.push(['click-emitter', event]));
  notification.onclick = (event) => received.push(['click-dom', event]);
  fake.emit('click', { action: 'open' });
  expect(received[2][1]).toBe(received[3][1]);
  expect(received[2][1].action).toBe('open');

  let closeEvent;
  notification.onclose = (event) => {
    closeEvent = event;
  };
  fake.emit('close');
  expect(closeEvent.type).toBe('close');
  let errorEvent;
  notification.on('error', (event) => received.push(['error-emitter', event]));
  notification.onerror = (event) => {
    errorEvent = event;
  };
  fake.fail(new Error('native failure'));
  expect(errorEvent.error.message).toBe('native failure');
  expect(received.at(-1)[1]).toBe(errorEvent);

  notification.close();
  expect(fake.closed).toBe(true);
  expect(fake.calls.filter((call) => call.method === 'close').length).toBe(1);
});

test('native notification state stays isolated for equal titles with different options', () => {
  const first = new Notification('Duplicate title', { body: 'first', persistent: true });
  const second = new Notification('Duplicate title', { body: 'second', persistent: true });
  const received = [];
  first.on('click', (event) => received.push(event));
  second.on('click', (event) => received.push(event));

  const firstNative = native.notification(first);
  const secondNative = native.notification(second);
  firstNative.emit('click', { action: 'first' });
  secondNative.emit('click', { action: 'second' });

  expect(firstNative.instance).not.toBe(secondNative.instance);
  expect(firstNative.calls).not.toBe(secondNative.calls);
  expect(received.map((event) => [event.target, event.action])).toEqual([
    [first, 'first'],
    [second, 'second'],
  ]);
});

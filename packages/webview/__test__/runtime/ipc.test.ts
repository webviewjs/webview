import { createRequire } from 'node:module';
import { expect, test } from 'bun:test';

const require = createRequire(import.meta.url);
const { Application, SerializationError } = require('../../dist/index.js');
const { native } = require('../native/harness.ts');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function webview() {
  return new Application().createBrowserWindow().createWebview();
}

test('generic IPC replaces and removes handlers over one native transport callback', () => {
  const view = webview();
  const received = [];
  const first = (message) => received.push(['first', message]);
  const second = (message) => received.push(['second', message]);

  view.onIpcMessage(first);
  const transport = native.webview(view).ipcHandler;
  view.onIpcMessage(second);
  expect(native.webview(view).ipcHandler).toBe(transport);
  expect(native.webview(view).calls.filter((call) => call.method === 'onIpcMessage').length).toBe(1);

  const message = { body: Buffer.from('hello') };
  native.webview(view).postIpc(message);
  expect(received).toEqual([['second', message]]);
  view.onIpcMessage(null);
  expect(native.webview(view).ipcHandler).toBe(null);
  expect(native.webview(view).calls.filter((call) => call.method === 'onIpcMessage').length).toBe(2);
});

test('expose sends static JSON and dispatches sync and async methods with their target as this', async () => {
  const view = webview();
  const target = {
    prefix: 'hello ',
    greet(name) {
      return this.prefix + name;
    },
    async answer(value) {
      return this.prefix + value;
    },
  };
  view.expose('native', target);
  const exposed = native.webview(view).exposed[0];

  expect(JSON.parse(exposed.staticsJson)).toEqual({ prefix: 'hello ' });
  expect(exposed.functions).toEqual(['greet', 'answer']);
  native.webview(view).callExposed({ ns: 'native', method: 'greet', id: 19, args: ['Ada'] });
  native.webview(view).callExposed({ ns: 'native', method: 'answer', id: 20, args: ['42'] });
  await flush();

  expect(native.webview(view).scripts[0]).toMatch(/resolve\(19,"hello Ada"\)/);
  expect(native.webview(view).scripts[1]).toMatch(/resolve\(20,"hello 42"\)/);
});

test('exposed thrown and rejected errors are returned to the page', async () => {
  const view = webview();
  view.expose('native', {
    syncFailure() {
      throw new Error('sync method failure');
    },
    asyncFailure() {
      return Promise.reject(new Error('async method failure'));
    },
  });

  native.webview(view).callExposed({ ns: 'native', method: 'syncFailure', id: 1, args: [] });
  native.webview(view).callExposed({ ns: 'native', method: 'asyncFailure', id: 2, args: [] });
  await flush();

  expect(native.webview(view).scripts[0]).toMatch(/reject\(1,"sync method failure","Error"\)/);
  expect(native.webview(view).scripts[1]).toMatch(/reject\(2,"async method failure","Error"\)/);
});

test('malformed calls and unknown namespaces or methods return useful errors', async () => {
  const view = webview();
  view.expose('known', { answer: () => 42 });
  const incoming = [];
  view.onIpcMessage((message) => incoming.push(message));
  native.webview(view).callExposed({ ns: 'known', method: 'answer', id: 3, args: { bad: true } });
  native.webview(view).callExposed({ ns: 'missing', method: 'answer', id: 4, args: [] });
  native.webview(view).callExposed({ ns: 'known', method: 'missing', id: 5, args: [] });
  const malformed = { body: Buffer.from('{broken') };
  native.webview(view).postIpc(malformed);
  await flush();

  expect(native.webview(view).scripts[0]).toMatch(/SerializationError/);
  expect(native.webview(view).scripts[0]).toMatch(/Arguments must be an array/);
  expect(native.webview(view).scripts[1]).toMatch(/No such method: answer/);
  expect(native.webview(view).scripts[2]).toMatch(/No such method: missing/);
  expect(incoming).toEqual([malformed]);
});

test('expose rejects duplicate namespaces, invalid names, targets, and non-JSON static values', () => {
  const view = webview();
  expect(() => view.expose('not-valid', {})).toThrow(/identifier/);
  expect(() => view.expose('native', null)).toThrow(/target/);
  view.expose('native', { first: true });
  expect(() => view.expose('native', { second: true })).toThrow(/already registered/);
  expect(() => view.expose('badValue', { value: 1n })).toThrow(SerializationError);
  const circular = {};
  circular.self = circular;
  expect(() => view.expose('circular', { value: circular })).toThrow(SerializationError);
});

test('non-serializable exposed return values report SerializationError', async () => {
  const view = webview();
  const circular = {};
  circular.self = circular;
  view.expose('native', { bigint: () => 1n, circular: () => circular, undefined: () => undefined });

  for (const [id, method] of [
    [6, 'bigint'],
    [7, 'circular'],
    [8, 'undefined'],
  ]) {
    native.webview(view).callExposed({ ns: 'native', method, id, args: [] });
  }
  await flush();

  expect(native.webview(view).scripts.length).toBe(3);
  for (const script of native.webview(view).scripts) expect(script).toMatch(/SerializationError/);
});

test('only one transport handles both user IPC and exposed methods, isolated per webview', async () => {
  const first = webview();
  const second = webview();
  const received = [];
  first.onIpcMessage((message) => received.push(['first', message.body.toString()]));
  first.expose('native', { answer: () => 'first' });
  second.expose('native', { answer: () => 'second' });

  expect(native.webview(first).calls.filter((call) => call.method === 'onIpcMessage').length).toBe(1);
  expect(native.webview(second).calls.filter((call) => call.method === 'onIpcMessage').length).toBe(1);
  native.webview(first).postIpc('generic');
  native.webview(first).callExposed({ ns: 'native', method: 'answer', id: 9, args: [] });
  native.webview(second).callExposed({ ns: 'native', method: 'answer', id: 9, args: [] });
  await flush();

  expect(received).toEqual([['first', 'generic']]);
  expect(native.webview(first).scripts[0]).toMatch(/resolve\(9,"first"\)/);
  expect(native.webview(second).scripts[0]).toMatch(/resolve\(9,"second"\)/);
});

test('pending exposed results after disposal do not evaluate scripts', async () => {
  const view = webview();
  let finish;
  view.expose('native', {
    pending: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  native.webview(view).callExposed({ ns: 'native', method: 'pending', id: 10, args: [] });
  await flush();
  view[Symbol.dispose]();
  finish('late');
  await flush();

  expect(native.webview(view).scripts).toEqual([]);
  expect(native.webview(view).ipcHandler).toBe(null);
});

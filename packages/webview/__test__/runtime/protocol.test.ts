import { createRequire } from 'node:module';
import { expect, test } from 'bun:test';

const require = createRequire(import.meta.url);
const { Application } = require('../../dist/index.js');
const { native } = require('../native/harness.ts');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function window() {
  return new Application().createBrowserWindow();
}

function request(id, overrides = {}) {
  return {
    id,
    url: 'app://localhost/index.html',
    method: 'GET',
    headers: [],
    body: Buffer.alloc(0),
    ...overrides,
  };
}

test('protocol handlers receive Fetch Requests and asynchronously complete native responses', async () => {
  const win = window();
  let received;
  win.registerProtocol('app', async (request) => {
    received = request;
    await Promise.resolve();
    return {
      statusCode: 201,
      body: Buffer.from(await request.text()),
      mimeType: 'text/plain',
      headers: [{ key: 'x-handler', value: 'async' }],
    };
  });

  native.window(win).requestProtocol(
    'app',
    request(10, {
      method: 'POST',
      headers: [{ key: 'X-Request', value: 'yes' }],
      body: Buffer.from('payload'),
    }),
  );
  await flush();

  expect(received.method).toBe('POST');
  expect(received.url).toBe('app://localhost/index.html');
  expect(received.headers.get('x-request')).toBe('yes');
  expect(received.body.locked).toBe(true);
  expect(native.window(win).completedProtocols).toEqual([
    {
      id: 10,
      response: {
        statusCode: 201,
        body: Buffer.from('payload'),
        mimeType: 'text/plain',
        headers: [{ key: 'x-handler', value: 'async' }],
      },
    },
  ]);
});

test('GET and HEAD requests ignore native bodies while POST bodies are preserved', async () => {
  const win = window();
  const requests = [];
  win.registerProtocol('app', async (incoming) => {
    requests.push(incoming);
    return { body: Buffer.alloc(0) };
  });

  native.window(win).requestProtocol('app', request(1, { method: 'GET', body: Buffer.from('ignored') }));
  native.window(win).requestProtocol('app', request(2, { method: 'HEAD', body: Buffer.from('ignored') }));
  native.window(win).requestProtocol('app', request(3, { method: 'POST', body: Buffer.from([0, 255, 1]) }));
  await flush();

  expect(requests.slice(0, 2).map((incoming) => [incoming.method, incoming.body])).toEqual([
    ['GET', null],
    ['HEAD', null],
  ]);
  expect(Buffer.from(await requests[2].arrayBuffer())).toEqual(Buffer.from([0, 255, 1]));
});

test('synchronous throws and rejected promises become text 500 responses', async () => {
  const win = window();
  win.registerProtocol('sync', () => {
    throw new Error('sync failure');
  });
  win.registerProtocol('async', async () => {
    throw new Error('async failure');
  });

  native.window(win).requestProtocol('sync', request(11));
  native.window(win).requestProtocol('async', request(12));
  await flush();

  expect(
    native
      .window(win)
      .completedProtocols.map(({ id, response }) => [
        id,
        response.statusCode,
        response.mimeType,
        response.body.toString(),
      ]),
  ).toEqual([
    [11, 500, 'text/plain', 'sync failure'],
    [12, 500, 'text/plain', 'async failure'],
  ]);
});

test('Fetch Response conversion preserves binary bytes, status, and non-content-type headers', async () => {
  const win = window();
  win.registerProtocol(
    'app',
    () =>
      new Response(new Uint8Array([0, 255, 2]), {
        status: 206,
        headers: { 'content-type': 'application/octet-stream', 'x-response': 'yes' },
      }),
  );

  native.window(win).requestProtocol('app', request(15));
  await flush();
  const response = native.window(win).completedProtocols[0].response;

  expect(response.statusCode).toBe(206);
  expect(response.mimeType).toBe('application/octet-stream');
  expect(response.body).toEqual(Buffer.from([0, 255, 2]));
  expect(response.headers).toEqual([{ key: 'x-response', value: 'yes' }]);
});

test('concurrent requests can resolve out of order without crossing request IDs or windows', async () => {
  const first = window();
  const second = window();
  let resolveFirst;
  let resolveSecond;
  first.registerProtocol(
    'app',
    () =>
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
  );
  second.registerProtocol(
    'app',
    () =>
      new Promise((resolve) => {
        resolveSecond = resolve;
      }),
  );

  native.window(first).requestProtocol('app', request(77, { url: 'app://first' }));
  native.window(second).requestProtocol('app', request(77, { url: 'app://second' }));
  await flush();
  resolveSecond({ body: Buffer.from('second') });
  resolveFirst({ body: Buffer.from('first') });
  await flush();

  expect(native.window(first).completedProtocols.map(({ id, response }) => [id, response.body.toString()])).toEqual([
    [77, 'first'],
  ]);
  expect(native.window(second).completedProtocols.map(({ id, response }) => [id, response.body.toString()])).toEqual([
    [77, 'second'],
  ]);
});

test('disposed windows do not complete a pending protocol request', async () => {
  const win = window();
  let finish;
  win.registerProtocol(
    'app',
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );

  native.window(win).requestProtocol('app', request(18));
  await flush();
  win[Symbol.dispose]();
  finish({ body: Buffer.from('late') });
  await flush();

  expect(native.window(win).completedProtocols).toEqual([]);
});

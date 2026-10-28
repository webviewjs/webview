import assert from 'node:assert/strict';
import { test } from 'node:test';

const hasLinuxDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
const shouldSkip = process.platform === 'linux' && !hasLinuxDisplay;
const timeoutMs = 20_000;

test(
  'custom protocol preserves text and binary POST request bodies',
  { skip: shouldSkip && 'requires an X11 or Wayland graphical session on Linux', timeout: timeoutMs + 5_000 },
  async () => {
    const { Application } = await import('../index.js');
    const textBody = 'webview custom protocol: café';
    const binaryBody = Buffer.from([0x00, 0x01, 0x7f, 0x80, 0xfe, 0xff, 0x0a]);
    const received = new Map();
    let resolvePage;
    let rejectPage;
    const pageResult = new Promise((resolve, reject) => {
      resolvePage = resolve;
      rejectPage = reject;
    });

    const page = `<!doctype html>
<meta charset="utf-8">
<script>
  const requests = [
    fetch('/get'),
    fetch('/text', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: ${JSON.stringify(textBody)},
    }),
    fetch('/binary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array([0, 1, 127, 128, 254, 255, 10]),
    }),
    fetch('/empty', { method: 'POST' }),
  ];

  Promise.all(requests)
    .then((responses) => {
      if (responses.some((response) => !response.ok)) throw new Error('A custom protocol fetch failed');
      window.ipc.postMessage('custom-protocol-test:done');
    })
    .catch((error) => window.ipc.postMessage('custom-protocol-test:error:' + error.message));
</script>`;

    const app = new Application();
    let timer;

    try {
      const window = app.createBrowserWindow({
        title: 'Custom protocol request body test',
        width: 320,
        height: 240,
        visible: false,
      });

      window.registerProtocol('webviewjs-test', async (request) => {
        const pathname = new URL(request.url).pathname;
        if (pathname === '/') {
          return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        const body = request.body === null ? null : Buffer.from(await request.arrayBuffer());
        received.set(pathname, { method: request.method, body });
        return new Response('ok');
      });

      const webview = window.createWebview({ url: 'webviewjs-test://localhost/' });
      webview.onIpcMessage(({ body }) => {
        const message = body.toString('utf8');
        if (message === 'custom-protocol-test:done') {
          resolvePage();
        } else if (message.startsWith('custom-protocol-test:error:')) {
          rejectPage(new Error(message.slice('custom-protocol-test:error:'.length)));
        }
      });

      timer = setTimeout(
        () => rejectPage(new Error(`Timed out waiting for custom protocol requests (${timeoutMs}ms)`)),
        timeoutMs,
      );
      app.run();
      await pageResult;

      assert.deepEqual(received.get('/get'), { method: 'GET', body: null });
      assert.equal(received.get('/text')?.method, 'POST');
      assert.deepEqual(received.get('/text')?.body, Buffer.from(textBody));
      assert.equal(received.get('/binary')?.method, 'POST');
      assert.deepEqual(received.get('/binary')?.body, binaryBody);
      assert.deepEqual(received.get('/empty'), { method: 'POST', body: null });
    } finally {
      clearTimeout(timer);
      app.stop();
      app.exit();
    }
  },
);

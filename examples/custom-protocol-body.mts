import { Application } from '../index.js';

const app = new Application();

const window = app.createBrowserWindow({
  title: 'Custom Protocol Example',
  width: 800,
  height: 600,
});

window.registerProtocol('webviewjs-demo', async (request) => {
  const { pathname } = new URL(request.url);

  if (pathname === '/') {
    return new Response(
      `<!doctype html>
      <html>
        <head><title>Custom Protocol</title></head>
        <body>
          <h2>Custom Protocol Demo</h2>
          <pre id="output"></pre>

          <script>
            const output = document.querySelector('#output');

            async function main() {
              const requests = [
                fetch('/get'),
                fetch('/text', {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                  body: 'Hello from webview! café',
                }),
                fetch('/binary', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/octet-stream' },
                  body: new Uint8Array([0, 1, 127, 128, 254, 255]),
                }),
                fetch('/empty', { method: 'POST' }),
              ];

              const responses = await Promise.all(requests);

              for (const response of responses) {
                output.textContent +=
                  await response.text() + '\\n';
              }
            }

            main().catch((error) => {
              output.textContent = error.stack;
            });
          </script>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }

  const body = request.body ? Buffer.from(await request.arrayBuffer()) : null;

  console.log({
    method: request.method,
    pathname,
    body,
  });

  return Response.json({
    method: request.method,
    pathname,
    body: body ? [...body] : null,
  });
});

window.createWebview({
  url: 'webviewjs-demo://localhost/',
});

app.run();

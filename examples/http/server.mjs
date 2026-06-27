import { serve } from 'nodeia';

export function createServer() {
  const { promise, resolve, reject } = Promise.withResolvers();

  serve({
    fetch(_req) {
      const html = `<!DOCTYPE html>
          <html>
              <head>
                  <title>Webview</title>
              </head>
              <body>
                  <h1>Hello world!</h1>
                  <p>The date is ${new Date().toLocaleString()}</p>
              </body>
          </html>`;

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    },
    listening(hostname, port) {
      console.log(`Server listening on http://${hostname}:${port}`);
      resolve();
    },
    error(err) {
      console.error('Server error:', err);
      reject(err);
    },
    port: 3000,
  }).unref();

  return promise;
}

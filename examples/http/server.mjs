import { serve } from 'nodeia';
import { parentPort } from 'worker_threads';

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
    parentPort?.postMessage('ready');
  },
  port: 3000,
});

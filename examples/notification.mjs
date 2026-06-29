import { readFile } from 'node:fs/promises';

import { Application, Notification } from '../index.js';

const notificationImage = await readFile(new URL('../assets/preview.png', import.meta.url));

const app = new Application();
const window = app.createBrowserWindow({
  title: 'Notification Example',
  width: 400,
  height: 300,
});

const webview = window.createWebview({
  html: `<!DOCTYPE html>
    <html>
        <head>
            <title>Notification Example</title>
        </head>
        <body>
            <h1>Notification Example</h1>
            <p>This example demonstrates native desktop notifications.</p>
            <button id="notifyButton">Show Notification</button>
            <script>
                document.getElementById('notifyButton').addEventListener('click', () => {
                  native.showNotification('WebviewJS notification', {
                    body: 'Native desktop notifications use a browser-familiar API.',
                  });
                });
            </script>
        </body>
    </html>`,
});

webview.expose('native', {
  showNotification: (title, options) => {
    const notification = new Notification(title, {
      body: options.body,
      persistent: true,
      actions: [
        { action: 'reply', title: 'Reply' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      image: notificationImage,
    });

    notification.on('show', () => console.log('notification shown'));
    notification.on('click', ({ action }) => {
      console.log('notification clicked:', action || 'default');
      app.exit();
    });
    notification.on('close', () => console.log('notification closed'));
    notification.on('error', ({ error }) => console.error('notification error:', error));
  },
});

webview.on('page-load-finished', () => {
  console.log('webview page load finished');
});

app.run();

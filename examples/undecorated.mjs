import { Application, Theme } from '../index.js';

let app = new Application();
let window = app.createBrowserWindow({
  width: 400,
  height: 300,
  title: 'Undecorated Window',
  decorations: false,
  resizable: true,
});

const _webview = window.createWebview({
  html: `<!DOCTYPE html>
    <html>
        <head>
            <title>Undecorated Window</title>
        </head>
        <body>
            <h1>Undecorated Window</h1>
            <p>This window has no title bar or borders.</p>
        </body>
    </html>`,
  enableDevtools: false,
  theme: Theme.Light,
});

app.run();

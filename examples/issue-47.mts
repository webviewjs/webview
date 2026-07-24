import { Application } from '../index.js';

const app = new Application();
const window = app.createBrowserWindow();

const webview = window.createWebview({
  html: `<!DOCTYPE html>
      <html>
          <head>
              <title>Webview</title>
          </head>
          <body>
              <h1 id="output">Hello world!</h1>
          </body>
      </html>
      `,
});

app.run();

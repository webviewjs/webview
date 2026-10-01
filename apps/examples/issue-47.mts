import { Application } from '@webviewjs/webview';

const app = new Application();
const window = app.createBrowserWindow();

const _webview = window.createWebview({
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

import { Application } from '@webviewjs/webview';

const app = new Application();
const window = app.createBrowserWindow({
  transparent: true,
  decorations: false,
  windowsNoRedirectionBitmap: true,
});

const _webview = window.createWebview({
  html: /* html */ `
      <html>
        <body style="background-color:rgba(87,87,87,0.5);">
          <h1>Hello, transparent!</h1>
        </body>
      </html>`,
  transparent: true,
  enableDevtools: true,
});

app.run();

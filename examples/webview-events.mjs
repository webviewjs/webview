import { Application, WebviewApplicationEvent } from '../index.js';

const app = new Application();
const window = app.createBrowserWindow({
  title: 'Webview events',
  width: 900,
  height: 600,
});

const webview = window.createWebview({
  html: `
    <title>Webview event example</title>
    <main>
      <h1>Webview events</h1>
      <p><a href="https://example.com">Navigate to example.com</a></p>
      <p><a href="https://example.com" target="_blank">Request a new window</a></p>
    </main>
  `,
});

for (const name of [
  'page-load-started',
  'page-load-finished',
  'title-changed',
  'download-started',
  'download-completed',
  'navigation',
  'new-window',
]) {
  webview.on(name, (event) => console.log(name, event));
}

app.onEvent((event) => {
  if (event.event === WebviewApplicationEvent.ApplicationCloseRequested) {
    app.exit();
  }
});

app.run();

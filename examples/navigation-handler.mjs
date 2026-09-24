import { Application } from '../index.js';

const app = new Application();
const window = app.createBrowserWindow({
  title: 'Navigation handler',
  width: 900,
  height: 600,
});

const webview = window.createWebview({
  html: `
    <main>
      <h1>Navigation handler</h1>
      <p><a href="https://example.com">Allowed navigation</a></p>
      <p><a href="https://blocked.example/navigation">Blocked navigation</a></p>
      <p><a href="https://blocked.example/popup" target="_blank">Blocked new window</a></p>
    </main>
  `,
  navigationHandler(url) {
    console.log('navigation request', url);
    return !url.startsWith('https://blocked.example/navigation');
  },
  newWindowHandler(event) {
    console.log('new window request', event.target, event.url, event.windowFeatures);
    return !event.url?.startsWith('https://blocked.example/popup');
  },
});

webview.on('navigation', ({ url, target }) => console.log('navigation attempted', target, url));
webview.on('new-window', ({ url, target, windowFeatures }) =>
  console.log('new window attempted', target, url, windowFeatures),
);

app.on('application-close-requested', () => app.exit());

app.run();

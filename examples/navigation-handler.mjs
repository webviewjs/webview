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
      <p><a href="https://blocked.example">Blocked navigation</a></p>
    </main>
  `,
  navigationHandler(url) {
    const allowed = !url.startsWith('https://blocked.example');
    console.log(allowed ? 'allow' : 'block', url);
    return allowed;
  },
});

webview.on('navigation', ({ url }) => console.log('navigation attempted', url));

app.on('application-close-requested', () => app.exit());

app.run();

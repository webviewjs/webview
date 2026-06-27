import { Application, Theme } from '../index.js';

const app = new Application();
const window = app.createBrowserWindow();

const _webview = window.createWebview({
  title: 'Hello world',
  url: 'https://nodejs.org',
});

const iconRes = await fetch('https://nodejs.org/static/images/favicons/favicon.png').then((res) => res.arrayBuffer());

const icon = Buffer.from(iconRes);

window.setTheme(Theme.Dark);
window.setWindowIcon(icon);

app.run();

import { Application, Theme } from '../index.js';

const app = new Application();
const window = app.createBrowserWindow();

window.createWebview({
  title: 'Hello world',
  url: 'https://nodejs.org',
});

window.setTheme(Theme.Dark);

app.run();

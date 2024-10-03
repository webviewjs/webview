import { Application, Theme } from '../dist/index.js';

const app = new Application();
const window = app.createBrowserWindow({
  title: 'Hello world',
  url: 'https://nodejs.org',
});

window.setTheme(Theme.Dark);

app.run();

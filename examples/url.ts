import { Application, Theme } from '../index.js';

const app = new Application();
const window = app.createBrowserWindow({
 title: 'Hello world',
});

window.createWebview({
  url: 'https://nodejs.org',
});

app.run();

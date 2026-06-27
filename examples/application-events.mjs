import { Application } from '../index.js';

const app = new Application();
const window = app.createBrowserWindow({
  title: 'Application and window events',
  width: 900,
  height: 600,
});

window.createWebview({
  html: `
    <main>
      <h1>Application and window events</h1>
      <p>Move, resize, focus, type, or drop a file onto this window.</p>
      <input autofocus placeholder="Type to emit keyboard and IME events">
    </main>
  `,
});

const eventNames = [
  'move',
  'resize',
  'focus',
  'blur',
  'key-down',
  'key-up',
  'file-drop',
  'scale-factor-changed',
  'theme-changed',
  'ime',
  'touch',
];

for (const name of eventNames) {
  window.on(name, (event) => console.log(name, event));
}

app.on('window-close-requested', (event) => {
  console.log('window close requested', event);
});

app.on('custom-menu-click', ({ customMenuEvent }) => {
  console.log('custom menu clicked', customMenuEvent);
});

app.on('application-close-requested', () => {
  app.exit();
});

app.run();

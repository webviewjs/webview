import { Application } from '../index.js';

const app = new Application();

const size = 16;
const rgba = Buffer.alloc(size * size * 4);

for (let offset = 0; offset < rgba.length; offset += 4) {
  rgba[offset] = 70;
  rgba[offset + 1] = 150;
  rgba[offset + 2] = 240;
  rgba[offset + 3] = 255;
}

let tray;
let quitting = false;

await app.whenReady();

const window = app.createBrowserWindow({
  title: 'Hide to Tray Test',
  width: 600,
  height: 400,
});

window.createWebview({
  html: /* html */ `
    <!doctype html>
    <html>
      <body style="
        font-family: sans-serif;
        display: grid;
        place-items: center;
        height: 100vh;
        margin: 0;
      ">
        <div style="text-align:center">
          <h1>WebviewJS tray test</h1>
          <p>Close the window to hide it in the tray.</p>
          <p>Restore it using the tray icon.</p>
        </div>
      </body>
    </html>
  `,
});

tray = app.createTrayIcon({
  id: 'example',
  icon: {
    data: rgba,
    width: size,
    height: size,
  },
  tooltip: 'WebviewJS tray example',
  menu: {
    items: [
      {
        id: 'show',
        label: 'Show window',
      },
      {
        id: 'hide',
        label: 'Hide window',
      },
      {
        id: 'quit',
        label: 'Quit',
      },
    ],
  },
});

tray.on('click', ({ button, buttonState }) => {
  console.log('tray click', button, buttonState);

  if (button === 'left' && buttonState === 'up') {
    window.show();
  }
});

window.on('close', (event) => {
  if (quitting) return;

  event.preventDefault();
  window.hide();
});

app.on('custom-menu-click', ({ customMenuEvent }) => {
  console.log('menu:', customMenuEvent.id);

  switch (customMenuEvent.id) {
    case 'show':
      window.show();
      break;

    case 'hide':
      window.hide();
      break;

    case 'quit':
      quitting = true;
      app.exit();
      break;
  }
});

app.on('application-close-requested', () => {
  if (quitting) {
    app.exit();
  }
});

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

let tray = null;

app.whenReady().then(() => {
  tray = app.createTrayIcon({
    id: 'example',
    icon: { data: rgba, width: size, height: size },
    tooltip: 'WebviewJS tray example',
    menu: {
      items: [
        { id: 'show', label: 'Show window' },
        { id: 'quit', label: 'Quit' },
      ],
    },
  });
  tray.on('click', ({ button, buttonState }) => console.log('tray click', button, buttonState));
});

const window = app.createBrowserWindow({ title: 'Tray Example' });
const _webview = window.createWebview({ html: '<h1>WebviewJS tray example</h1>' });

app.on('custom-menu-click', ({ customMenuEvent }) => {
  if (customMenuEvent.id === 'show') window.show();
  if (customMenuEvent.id === 'quit') app.exit();
});

app.on('application-close-requested', () => app.exit());

import { Application } from '../index.js';

const app = new Application();

// Handle menu events
app.on('custom-menu-click', ({ customMenuEvent: menuEvent }) => {
  console.log(`Menu "${menuEvent.id}" clicked on window ${menuEvent.windowId}`);

  switch (menuEvent.id) {
    case 'close-window':
      console.log('Closing window...');
      // In a real app, you would close the specific window
      break;
    case 'window-1-action':
      console.log('Window 1 specific action!');
      break;
    case 'window-2-action':
      console.log('Window 2 specific action!');
      break;
    case 'global-action':
      console.log('Global action from any window!');
      break;
    case 'quit':
      console.log('Quitting application...');
      app.exit();
      break;
  }
});

// Set a global application menu
app.setMenu({
  items: [
    {
      label: 'App',
      submenu: {
        items: [
          { id: 'global-action', label: 'Global Action', accelerator: 'CmdOrCtrl+G' },
          { role: 'separator' },
          { id: 'quit', label: 'Quit', accelerator: 'CmdOrCtrl+Q' },
        ],
      },
    },
  ],
});

console.log('🪟 Window-Specific Menu Example');
console.log('Creating two windows with different menus...\n');

// Create first window with custom menu
const window1 = app.createBrowserWindow({
  title: 'Window 1 - Custom Menu',
  width: 400,
  height: 300,
  x: 100,
  y: 100,
  menu: {
    items: [
      {
        label: 'Window 1',
        submenu: {
          items: [
            { id: 'window-1-action', label: 'Window 1 Action', accelerator: 'Ctrl+1' },
            { role: 'separator' },
            { id: 'close-window', label: 'Close Window', accelerator: 'Ctrl+W' },
          ],
        },
      },
      {
        label: 'Edit',
        submenu: {
          items: [{ role: 'copy' }, { role: 'paste' }],
        },
      },
    ],
  },
});

const _webview1 = window1.createWebview({
  html: `<!DOCTYPE html>
  <html>
    <head>
      <title>Window 1</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          padding: 20px;
          background: linear-gradient(45deg, #ff6b6b, #ee5a24);
          color: white;
          text-align: center;
        }
        .card {
          background: rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🪟 Window 1</h1>
        <p><strong>Custom Menu:</strong></p>
        <p>• Window 1 → Window 1 Action (Ctrl+1)</p>
        <p>• Window 1 → Close Window (Ctrl+W)</p>
        <p>• Edit → Copy, Paste</p>
        <br>
        <p>This window has its <strong>own menu</strong>!</p>
        <p>Try the menu items above 👆</p>
      </div>
    </body>
  </html>`,
});

// Create second window with different custom menu
const window2 = app.createBrowserWindow({
  title: 'Window 2 - Different Menu',
  width: 400,
  height: 300,
  x: 520,
  y: 100,
  menu: {
    items: [
      {
        label: 'Window 2',
        submenu: {
          items: [
            { id: 'window-2-action', label: 'Window 2 Action', accelerator: 'Ctrl+2' },
            { role: 'separator' },
            { id: 'close-window', label: 'Close Window', accelerator: 'Ctrl+W' },
          ],
        },
      },
      {
        label: 'Tools',
        submenu: {
          items: [{ role: 'selectall' }, { role: 'separator' }, { id: 'tool-action', label: 'Special Tool' }],
        },
      },
    ],
  },
});

const _webview2 = window2.createWebview({
  html: `<!DOCTYPE html>
  <html>
    <head>
      <title>Window 2</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          padding: 20px;
          background: linear-gradient(45deg, #4834d4, #686de0);
          color: white;
          text-align: center;
        }
        .card {
          background: rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🪟 Window 2</h1>
        <p><strong>Different Menu:</strong></p>
        <p>• Window 2 → Window 2 Action (Ctrl+2)</p>
        <p>• Window 2 → Close Window (Ctrl+W)</p>
        <p>• Tools → Select All, Special Tool</p>
        <br>
        <p>This window has a <strong>different menu</strong>!</p>
        <p>Compare with Window 1 👈</p>
      </div>
    </body>
  </html>`,
});

// Create third window that uses the global menu (no custom menu specified)
const window3 = app.createBrowserWindow({
  title: 'Window 3 - Global Menu',
  width: 400,
  height: 300,
  x: 310,
  y: 420,
  show_menu: true, // Uses global menu
});

const _webview3 = window3.createWebview({
  html: `<!DOCTYPE html>
  <html>
    <head>
      <title>Window 3</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          padding: 20px;
          background: linear-gradient(45deg, #00d2d3, #54a0ff);
          color: white;
          text-align: center;
        }
        .card {
          background: rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🌍 Window 3</h1>
        <p><strong>Global Menu:</strong></p>
        <p>• App → Global Action (Ctrl+G)</p>
        <p>• App → Quit (Ctrl+Q)</p>
        <br>
        <p>This window uses the <strong>global menu</strong>!</p>
        <p>Set with <code>app.setMenu()</code></p>
      </div>
    </body>
  </html>`,
});

// Log menu status for each window
console.log(`Window 1 has menu: ${window1.hasMenu()}`);
console.log(`Window 2 has menu: ${window2.hasMenu()}`);
console.log(`Window 3 has menu: ${window3.hasMenu()}`);

console.log('\n🎯 Try different menu items in each window!');
console.log('Notice how each window responds to different menu items.');
console.log('Use Ctrl+Q to quit the application.\n');

// Run the application
app.run();

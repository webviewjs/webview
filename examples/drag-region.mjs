import { Application } from '../index.js';

const app = new Application();

const win = app.createBrowserWindow({
  title: 'Drag Region',
  width: 480,
  height: 320,
  decorations: false,
});

// Elements marked with data-webview-drag-region move the window when dragged. Buttons inside
// them still work.
const webview = win.createWebview({
  html: `<!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; font-family: system-ui, sans-serif; }
          header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 40px;
            padding: 0 12px;
            background: #222;
            color: #fff;
            user-select: none;
          }
          main { padding: 16px; }
        </style>
      </head>
      <body>
        <header data-webview-drag-region>
          <span>Custom titlebar</span>
          <button id="close">Close</button>
        </header>
        <main>
          <p>Drag the title bar to move the window. The Close button is still clickable.</p>
        </main>
        <script>
          document.getElementById('close').addEventListener('click', () => window.ipc.postMessage('close'));
        </script>
      </body>
    </html>`,
});

webview.onIpcMessage((message) => {
  if (message.body.toString('utf8') === 'close') app.exit();
});

app.run();

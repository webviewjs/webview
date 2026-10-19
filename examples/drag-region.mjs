import { Application } from '../index.js';

const app = new Application();

const win = app.createBrowserWindow({
  title: 'Start Dragging',
  width: 480,
  height: 320,
  decorations: false,
});

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
        <header id="titlebar" data-webview-drag-region>
          <span>Custom titlebar</span>
          <button id="close">Close</button>
        </header>
        <main>
          <p>Drag the title bar to move the window. The Close button is still clickable.</p>
        </main>
        <script>
          document.getElementById('close').addEventListener('click', () => window.windowControls.close());
        </script>
      </body>
    </html>`,
});

// Page results must be JSON, so each exposed function returns null rather than undefined.
webview.expose('windowControls', {
  startDragging() {
    win.startDragging();
    return null;
  },
  close() {
    app.exit();
    return null;
  },
});

app.run();

import { Application } from '@webviewjs/webview';

const app = new Application();

const window = app.createBrowserWindow({
  title: 'Drag Region',
  width: 480,
  height: 320,
  decorations: false,
});

// Elements marked with data-webview-drag-region move the window when dragged. Buttons inside them
// still work.
const webview = window.createWebview({
  html: /* html */ `<!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; font-family: system-ui, sans-serif; }
          header {
            display: flex;
            align-items: center;
            gap: 12px;
            height: 40px;
            padding: 0 12px;
            background: #222;
            color: #fff;
            user-select: none;
          }
          header > span:first-child { flex: 1; }
          .no-drag {
            padding: 4px 8px;
            border: 1px solid #777;
            border-radius: 4px;
            color: #ddd;
            cursor: text;
            user-select: text;
          }
          main { padding: 16px; }
        </style>
      </head>
      <body>
        <header data-webview-drag-region="deep">
          <span>Custom titlebar</span>
          <div class="no-drag" data-webview-drag-region="false">Select or drag this text</div>
          <button id="close">Close</button>
        </header>
        <main>
          <p>Drag the title bar to move the window. The nested text area opts out of dragging, and the Close button is still clickable. Double-click the title bar to toggle maximize.</p>
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

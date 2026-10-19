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
          header { display: flex; align-items: center; justify-content: space-between; height: 40px; padding: 0 12px; background: #222; color: #fff; user-select: none; }
          main { padding: 16px; }
        </style>
      </head>
      <body>
        <header id="titlebar">
          <span>Custom titlebar</span>
          <button id="close">Close</button>
        </header>
        <main>
          <p>Drag the title bar to move the window. The Close button is still clickable.</p>
        </main>
        <script>
          // Start the drag from mousemove, not mousedown: the call crosses IPC, and a fast click can be
          // released before it arrives.
          const DRAG_THRESHOLD = 4;
          let press = null;
          window.addEventListener('mousedown', (event) => {
            const onTitlebar = event.target.closest('#titlebar') !== null;
            const onButton = event.target.closest('button') !== null;
            press = event.button === 0 && onTitlebar && !onButton ? { x: event.clientX, y: event.clientY } : null;
          });
          window.addEventListener('mousemove', (event) => {
            if (press === null || (event.buttons & 1) === 0) return;
            if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_THRESHOLD) return;
            press = null;
            window.windowControls.startDragging();
          });
          window.addEventListener('mouseup', () => {
            press = null;
          });
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
    console.log('Closing window');
    app.exit();
    return null;
  },
});

app.run();

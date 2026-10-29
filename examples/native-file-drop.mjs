import { Application } from '../index.js';

const app = new Application();
const window = app.createBrowserWindow({
  title: 'Native webview file drop',
  width: 900,
  height: 600,
});

const webview = window.createWebview({
  nativeFileDrop: true,
  html: `
    <!doctype html>
    <html>
      <head>
        <title>Native webview file drop</title>
        <style>
          body { font: 16px system-ui, sans-serif; margin: 0; padding: 2rem; }
          main { border: 2px dashed #64748b; border-radius: 1rem; padding: 4rem 2rem; text-align: center; }
        </style>
      </head>
      <body>
        <main>
          <h1>Drop files or folders here</h1>
          <p>Native paths and webview-relative positions are logged in the terminal.</p>
        </main>
      </body>
    </html>
  `,
});

webview.on('drag-enter', ({ paths, position }) => console.log('webview drag-enter', { paths, position }));
webview.on('drag-over', ({ position }) => console.log('webview drag-over', { position }));
webview.on('drag-drop', ({ paths, position }) => console.log('webview drag-drop', { paths, position }));
webview.on('drag-leave', () => console.log('webview drag-leave'));

window.on('file-hover', ({ files }) => console.log('window file-hover', { files }));
window.on('file-drop', ({ files }) => console.log('window file-drop', { files }));

app.run();

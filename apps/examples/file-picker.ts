import { Application } from '@webviewjs/webview';

const app = new Application();

const win = app.createBrowserWindow({
  title: 'Native File Picker',
  width: 600,
  height: 400,
});

const webview = win.createWebview({
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: system-ui, sans-serif;
            padding: 24px;
          }
          button { padding: 8px 16px; cursor: pointer; }
          pre { white-space: pre-wrap; overflow-wrap: anywhere; }
        </style>
      </head>
      <body>
        <h2>Select files</h2>

        <button id="pick">Choose Files</button>
        <span id="status">No files selected</span>

        <h3>Selected paths</h3>
        <pre id="output"></pre>

        <script>
          const button = document.getElementById('pick');
          const status = document.getElementById('status');
          const output = document.getElementById('output');

          button.addEventListener('click', async () => {
            button.disabled = true;

            try {
              const paths = await window.native.pickFiles();

              if (paths.length === 0) {
                status.textContent = 'No files selected';
                output.textContent = '';
                return;
              }

              status.textContent = paths.length + ' file(s) selected';
              output.textContent = paths.join('\\n');

              console.log('Selected:', paths);
            } catch (error) {
              output.textContent = 'Error: ' + error.message;
            } finally {
              button.disabled = false;
            }
          });
        </script>
      </body>
    </html>
  `,
});

webview.expose('native', {
  pickFiles() {
    return win.openFileDialog({
      title: 'Select files',
      multiple: true,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
    });
  },
});

app.run();

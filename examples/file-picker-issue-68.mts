import { Application } from '../index.js';

const app = new Application();
const win = app.createBrowserWindow({
  title: 'macOS File Picker Test',
  width: 700,
  height: 450,
});

const webview = win.createWebview({
  html: `
    <!DOCTYPE html>
    <html>
      <body>
        <h2>File Picker Test</h2>
        <input id="file" type="file" multiple />
        <pre id="output">No file selected</pre>

        <script>
          const input = document.getElementById('file');
          const output = document.getElementById('output');

          function report(event) {
            const data = {
              event,
              value: input.value,
              files: Array.from(input.files).map(file => ({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                relativePath: file.webkitRelativePath,
              })),
            };

            output.textContent = JSON.stringify(data, null, 2);

            window.native.logSelection(data).catch(error => {
              output.textContent += '\\nIPC error: ' + error.message;
            });
          }

          input.addEventListener('click', () => report('click'));
          input.addEventListener('change', () => report('change'));
          input.addEventListener('cancel', () => report('cancel'));
        </script>
      </body>
    </html>
  `,
});

webview.expose('native', {
  logSelection(data) {
    console.log('[File Picker]', JSON.stringify(data, null, 2));
    return null;
  },
});

const shouldRunSynchronously = process.argv.includes('--sync');

console.log('Mode:', shouldRunSynchronously ? 'synchronous' : 'asynchronous');

setInterval(() => {
  console.log('[Node heartbeat]', Date.now());
}, 1000);

win.on('close', () => {
  console.log('[Window close requested]');
});

if (shouldRunSynchronously) {
  app.runSync();
} else {
  app.run();
}

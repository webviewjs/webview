// const requireScript = require('node:module').createRequire(__filename);
// const { Application } = requireScript('../index.js');
const { Application } = require('../index.js');

const app = new Application();

app.onIpcMessage((data) => {
    console.log({ data });
});

const window = app.createBrowserWindow({
    html: `<!DOCTYPE html>
    <html>
        <head>
            <title>Webview</title>
        </head>
        <body>
            <h1>Hello world!</h1>
            <button id="btn">Click me!</button>
            <script>
                btn.onclick = function send() {
                    window.ipc.postMessage('Hello from webview!');
                }
            </script>
        </body>
    </html>
    `,
});

window.setTitle('WebviewJS + Node');

app.run();

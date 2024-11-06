// const requireScript = require('node:module').createRequire(__filename);
// const { Application } = requireScript('../index.js');
const { Application } = require('../index.js');

const app = new Application();
const window = app.createBrowserWindow();

const webview = window.createWebview({
    html: `<!DOCTYPE html>
    <html>
        <head>
            <title>Webview</title>
        </head>
        <body>
            <h1 id="output">Hello world!</h1>
            <button id="btn">Click me!</button>
            <script>
                btn.onclick = function send() {
                    window.ipc.postMessage('Hello from webview');
                }
            </script>
        </body>
    </html>
    `,
    preload: `window.onIpcMessage = function(data) {
        const output = document.getElementById('output');
        output.innerText = \`Server Sent A Message: \${data}\`;
    }`
});

if (!webview.isDevtoolsOpen()) webview.openDevtools();

webview.onIpcMessage((data) => {
    const reply = `You sent ${data.body.toString('utf-8')}`;
    window.evaluateScript(`onIpcMessage("${reply}")`)
})

app.run();

// const requireScript = require('node:module').createRequire(__filename);
// const { Application } = requireScript('../index.js');
const { Application } = require('../index.js');

const app = new Application();
const window = app.createBrowserWindow();

let count = 0;

const webview = window.createWebview({
    html: `<!DOCTYPE html>
    <html>
        <head>
            <title>Webview</title>
        </head>
        <body>
            <h1 id="output">${count}</h1>
            <button id="btn">Click me!</button>
            <script>
                btn.onclick = function send() {
                    window.ipc.postMessage('count');
                }
            </script>
        </body>
    </html>
    `,
    preload: `window.onIpcMessage = function(data) {
        const output = document.getElementById('output');
        output.innerText = \`\${data}\`;
        return \`The current count is: \${data}\`
    }`
});

if (!webview.isDevtoolsOpen()) webview.openDevtools();

webview.onIpcMessage(() => {
    webview.evaluateScriptWithCallback(`onIpcMessage("${++count}")`, (err, result) => {
        if (err) {
            console.error('Error evaluating script:', err);
        } else {
            console.log("[webview] >>", result);
        }
    });
});

app.run();

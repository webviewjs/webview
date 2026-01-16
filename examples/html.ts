// const requireScript = require('node:module').createRequire(__filename);
// const { Application } = requireScript('../index.js');
import { Application } from "../index.js";
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

//if (!webview.isDevtoolsOpen()) webview.openDevtools();

// Register IPC handler BEFORE running the app
webview.onIpcMessage((_e,data) => {
    const reply = `You sent ${data}`;
    console.log("reply",reply);
    webview.evaluateScript(`onIpcMessage("${reply}")`);
});

// Now run the app with a polling loop to allow IPC callbacks to process
const poll = () => {
    if (app.runIteration()) {
        window.id;
        webview.id;
        setTimeout(poll, 10);
    } else {
        process.exit(0);
    }
};
poll();
//app.run();
// Autoplay
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
            <video autoplay>
                <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4">
            </video>
        </body>
    </html>
    `,
    preload: `window.onIpcMessage = function(data) {
        const output = document.getElementById('output');
        output.innerText = \`Server Sent A Message: \${data}\`;
    }`
});

//if (!webview.isDevtoolsOpen()) webview.openDevtools();

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
setInterval(() => {
    console.log("polling");
}, 1000);
poll();
//app.run();
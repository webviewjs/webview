import { Application, ProgressBarState } from '../index.js'

const width = 800;
const height = 600;

const app = new Application();

app.onEvent(console.log)

const window = app.createBrowserWindow({
    width,
    height,
    title: 'Multiple Webviews',
});

const webview1 = window.createWebview({
    url: 'https://nodejs.org',
    child: true,
    width: width / 2,
    height
});

const webview2 = window.createWebview({
    url: 'https://deno.land',
    child: true,
    width: width / 2,
    x: width / 2,
    height,
});

webview1.onIpcMessage((message) => {
    const str = message.body.toString('utf8')

    console.log('Received message from webview 1:', str)
})

webview1.evaluateScript(`setTimeout(() => {
    window.ipc.postMessage('Hello from webview1')
}, 1000)`)

webview2.onIpcMessage((message) => {
    const str = message.body.toString('utf8')

    console.log('Received message from webview 2:', str)
})

webview2.evaluateScript(`setTimeout(() => {
    window.ipc.postMessage('Hello from webview2')
}, 1000)`)

app.run()
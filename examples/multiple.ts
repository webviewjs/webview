import { Application } from '../index.js'

const app1 = new Application();
const window1 = app1.createBrowserWindow()
const webview1 = window1.createWebview({ url: 'https://nodejs.org' });
const app2 = new Application();
const window2 = app2.createBrowserWindow()
const webview2 = window2.createWebview({ url: 'https://wikipedia.org' });

const poll = () => {
    if (app1.runIteration()) {
        window1.id;
        webview1.id;
        setTimeout(poll, 10);
    } else {
        process.exit(0);
    }
    if (app2.runIteration()) {
        window2.id;
        webview2.id;
        setTimeout(poll, 10);
    } else {
        process.exit(0);
    }
};
poll();

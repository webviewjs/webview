import { Application } from '../index.js';

const app = new Application();
const window = app.createBrowserWindow({
  title: 'Simple Example',
  width: 800,
  height: 600,
});

const webview = window.createWebview({
  html: `<!DOCTYPE html>
    <html>
        <head>
            <title>Simple Example</title>
        </head>
        <body>
            <h1>Hello, WebviewJS!</h1>
            <p>This is a simple example of a webview window.</p>
            <code>#FFFFFF/#000000</code>
        </body>
    </html>`,
});

setInterval(() => {
  const bg = Math.floor(Math.random() * 0xffffff) + 1;
  const complementary = 0xffffff - bg;
  webview.evaluateScript(`
        document.body.style.backgroundColor = '#${bg.toString(16).padStart(6, '0')}';
        document.body.style.color = '#${complementary.toString(16).padStart(6, '0')}';
        document.querySelector('code').textContent = \`\${document.body.style.backgroundColor}/\${document.body.style.color}\`;
    `);
}, 1000).unref();

app.run();

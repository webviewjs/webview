import { Application } from "../index.js";

const app = new Application();
const window = app.createBrowserWindow({
  transparent: true,
  decorations: false,
});

const webview = window.createWebview({
    html: /* html */ `
      <html>
        <head>
          <style>
             html, body {
               background-color: transparent !important;
               margin: 0; padding: 0;
               width: 100%; height: 100%;
               overflow: hidden;
             }
          </style>
        </head>
        <body>
          <div style="background: rgba(0, 0, 255, 0.1); height: 100%; display: flex; justify-content: center; align-items: center; border: 2px solid blue; border-radius: 20px;">
            <h1 style="color: white; text-shadow: 1px 1px 2px black;">Hello, High-Level Transparent!</h1>
          </div>
        </body>
      </html>`,
    transparent: true,
    enableDevtools: true,
});

app.run();

import { Application } from '../index.js';

const app = new Application();

// Create a browser window with a webview
const browserWindow = app.createBrowserWindow({
  title: 'Close Example',
  width: 800,
  height: 600,
});

const _webview = browserWindow.createWebview({
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Close Example</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        button {
          padding: 10px 20px;
          font-size: 16px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <h1>Close Example</h1>
      <p>This example demonstrates how to close the application gracefully.</p>
      <button onclick="closeApp()">Close Application</button>
      <button onclick="reloadWebview()">Reload Webview</button>
      <script>
        function closeApp() {
          // This will trigger the ApplicationCloseRequested event
          // and clean up all resources including temp folders
          window.close();
        }
        
        function reloadWebview() {
          // This will reload the webview
          location.reload();
        }
      </script>
    </body>
    </html>
  `,
});

app.on('window-close-requested', () => {
  console.log('Window close requested');
});

app.on('application-close-requested', () => {
  console.log('Application close requested');
});

// Example: Programmatically close the application after 5 seconds
// setTimeout(() => {
//   console.log('Closing application programmatically...');
//   app.exit();
// }, 5000);

// Example: Programmatically hide the window
// setTimeout(() => {
//   console.log('Hiding window...');
//   browserWindow.hide();
// }, 3000);

// Example: Programmatically show the window
// setTimeout(() => {
//   console.log('Showing window...');
//   browserWindow.show();
// }, 4000);

// Run the application
await app.run();

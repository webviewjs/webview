import { Application, WebviewApplicationEvent } from '../index.js'

const app = new Application();

// Create a browser window with a webview
const browserWindow = app.createBrowserWindow({
  title: 'Close Example',
  width: 800,
  height: 600,
});

const webview = browserWindow.createWebview({
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

// Set up event handler for application events
// You can use either onEvent() or bind() - they are equivalent
app.bind((_e,event) => {
  console.log('Application event:', event.event);
  
  if (event.event === WebviewApplicationEvent.WindowCloseRequested) {
    console.log('Window close requested');
    // You can perform cleanup here before the window closes
    // For example: save data, close connections, etc.
  }
  
  if (event.event === WebviewApplicationEvent.ApplicationCloseRequested) {
    console.log('Application close requested');
    // Perform final cleanup before the application exits
    // This is where temp folders will be cleaned up
  }
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
app.run();

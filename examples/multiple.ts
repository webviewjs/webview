import { Application, WebviewApplicationEvent } from '../index.js';

// Single Application instance - GTK is a singleton, so we can only have one
const app = new Application();

// Set up event handler to track when windows close
let window1Closed = false;
let window2Closed = false;

app.bind((_err, event) => {
  if (event.event === WebviewApplicationEvent.WindowCloseRequested) {
    // Detect which window is closing
    if (!window1Closed) {
      window1Closed = true;
      console.log('Window 1 closed');
    } else if (!window2Closed) {
      window2Closed = true;
      console.log('Window 2 closed');
    }

    // If all windows are closed, exit the application
    if (window1Closed && window2Closed) {
      console.log('All windows closed, exiting application...');
      app.exit();
    }
  }
});

// Create first window and webview
const window1 = app.createBrowserWindow({
  title: 'Window 1 - Node.js',
  width: 800,
  height: 600,
  x: 100,
  y: 100,
});
const webview1 = window1.createWebview({ url: 'https://nodejs.org' });

// Create second window and webview from the same Application
const window2 = app.createBrowserWindow({
  title: 'Window 2 - Wikipedia',
  width: 800,
  height: 600,
  x: 920,
  y: 100,
});
const webview2 = window2.createWebview({ url: 'https://wikipedia.org' });

console.log('Running application with 2 windows...');
console.log('Close both windows to exit the application.');

// Run the application - this will block and keep processing events
// until all windows are closed and app.exit() is called
app.run();

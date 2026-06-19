import { Application, WebviewApplicationEvent } from '../index.js';

const app = new Application();

// Set up menu event handler
app.bind((event) => {
  if (event.event === WebviewApplicationEvent.CustomMenuClick) {
    const menuEvent = event.customMenuEvent;
    console.log(`Menu item clicked: "${menuEvent.id}" from window ${menuEvent.windowId}`);
    
    // Handle specific menu items
    switch (menuEvent.id) {
      case 'new':
        console.log('📄 Creating new document...');
        break;
      case 'open':
        console.log('📂 Opening file...');
        break;
      case 'save':
        console.log('💾 Saving file...');
        break;
      case 'about':
        console.log('ℹ️  About this application...');
        break;
      case 'preferences':
        console.log('⚙️  Opening preferences...');
        break;
      case 'quit':
        console.log('👋 Goodbye!');
        app.exit();
        break;
      case 'reload':
        console.log('🔄 Reloading webview...');
        webview.reload();
        break;
      case 'devtools':
        console.log('🔧 Opening developer tools...');
        webview.openDevtools();
        break;
      default:
        console.log(`Unhandled menu item: ${menuEvent.id}`);
    }
  } else if (event.event === WebviewApplicationEvent.ApplicationCloseRequested) {
    console.log('Application close requested');
    app.exit();
  } else if (event.event === WebviewApplicationEvent.WindowCloseRequested) {
    console.log('Window close requested');
  }
});

// Set up comprehensive application menu
app.setMenu({
  items: [
    // File menu
    {
      label: "File",
      submenu: {
        items: [
          { 
            id: "new", 
            label: "New", 
            accelerator: "CmdOrCtrl+N",
            enabled: true 
          },
          { 
            id: "open", 
            label: "Open...", 
            accelerator: "CmdOrCtrl+O" 
          },
          { role: "separator" },
          { 
            id: "save", 
            label: "Save", 
            accelerator: "CmdOrCtrl+S" 
          },
          { 
            id: "save-as", 
            label: "Save As...", 
            accelerator: "CmdOrCtrl+Shift+S" 
          },
          { role: "separator" },
          { 
            id: "quit", 
            label: "Quit", 
            accelerator: "CmdOrCtrl+Q" 
          }
        ]
      }
    },
    
    // Edit menu with predefined roles
    {
      label: "Edit",
      submenu: {
        items: [
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectall" },
          { role: "separator" },
          {
            id: "preferences",
            label: "Preferences...",
            accelerator: "CmdOrCtrl+,"
          }
        ]
      }
    },
    
    // View menu
    {
      label: "View",
      submenu: {
        items: [
          {
            id: "reload",
            label: "Reload",
            accelerator: "CmdOrCtrl+R"
          },
          {
            id: "devtools",
            label: "Developer Tools",
            accelerator: "F12"
          },
          { role: "separator" },
          {
            label: "Zoom",
            submenu: {
              items: [
                {
                  id: "zoom-in",
                  label: "Zoom In",
                  accelerator: "CmdOrCtrl+Plus"
                },
                {
                  id: "zoom-out", 
                  label: "Zoom Out",
                  accelerator: "CmdOrCtrl+-"
                },
                {
                  id: "zoom-reset",
                  label: "Actual Size",
                  accelerator: "CmdOrCtrl+0"
                }
              ]
            }
          }
        ]
      }
    },
    
    // Help menu
    {
      label: "Help",
      submenu: {
        items: [
          {
            id: "about",
            label: "About Menu Example"
          },
          {
            id: "docs",
            label: "Documentation",
            accelerator: "F1"
          }
        ]
      }
    }
  ]
});

console.log('🎯 Menu System Example');
console.log('📋 Try the following:');
console.log('   • Click on menu items to see event handling');
console.log('   • Use keyboard shortcuts (Ctrl+N, Ctrl+O, etc.)');
console.log('   • Try copy/paste with Ctrl+C/Ctrl+V');
console.log('   • Use Ctrl+Q or File > Quit to exit');
console.log('');

// Create main window
const window = app.createBrowserWindow({
  title: "Menu System Example",
  width: 800,
  height: 600
});

// Create webview with example content
const webview = window.createWebview({
  html: `<!DOCTYPE html>
  <html>
    <head>
      <title>Menu System Example</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          line-height: 1.6;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 500px;
        }
        .card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 30px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 { color: #fff; margin-top: 0; }
        h2 { color: #f0f0f0; }
        .menu-item {
          background: rgba(255, 255, 255, 0.2);
          padding: 10px 15px;
          margin: 5px 0;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .shortcut {
          float: right;
          opacity: 0.8;
          font-size: 0.9em;
        }
        textarea {
          width: 100%;
          height: 100px;
          margin: 10px 0;
          padding: 10px;
          border-radius: 5px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-family: inherit;
        }
        textarea::placeholder { color: rgba(255, 255, 255, 0.7); }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🎯 Menu System Example</h1>
        <p>This example demonstrates the cross-platform menu system in WebviewJS.</p>
        
        <h2>📋 Available Menus:</h2>
        
        <div class="menu-item">
          <strong>File Menu:</strong> New, Open, Save, Quit
          <div class="shortcut">Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+Q</div>
        </div>
        
        <div class="menu-item">
          <strong>Edit Menu:</strong> Cut, Copy, Paste, Select All
          <div class="shortcut">Ctrl+X, Ctrl+C, Ctrl+V, Ctrl+A</div>
        </div>
        
        <div class="menu-item">
          <strong>View Menu:</strong> Reload, Developer Tools, Zoom
          <div class="shortcut">Ctrl+R, F12, Ctrl+/-, Ctrl+0</div>
        </div>
        
        <div class="menu-item">
          <strong>Help Menu:</strong> About, Documentation
          <div class="shortcut">F1</div>
        </div>
        
        <h2>✨ Try It Out:</h2>
        <p>1. Click on the menu items above to trigger events</p>
        <p>2. Use keyboard shortcuts for quick access</p>
        <p>3. Test copy/paste with the text area below:</p>
        
        <textarea placeholder="Type some text here and try Ctrl+A to select all, then Ctrl+C to copy..."></textarea>
        
        <p><strong>Check the console</strong> to see menu events being handled!</p>
        
        <h2>🌟 Features Demonstrated:</h2>
        <ul>
          <li>✅ Cross-platform menu system</li>
          <li>✅ Keyboard accelerators/shortcuts</li>
          <li>✅ Nested submenus</li>
          <li>✅ Predefined menu roles (copy, paste, etc.)</li>
          <li>✅ Custom menu items with IDs</li>
          <li>✅ Menu event handling and dispatch</li>
          <li>✅ Menu separators</li>
          <li>✅ Enabled/disabled menu items</li>
        </ul>
      </div>
    </body>
  </html>`
});

// Run the application
console.log('🚀 Starting application with menu system...\n');
app.run();
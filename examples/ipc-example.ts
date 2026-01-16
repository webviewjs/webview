/**
 * IPC Communication Example
 * 
 * Demonstrates bidirectional communication between JavaScript and Rust
 * using the IPC (Inter-Process Communication) system in @webviewjs/webview
 */

import { WindowBuilder, WebViewBuilder, EventLoop, TaoTheme } from '../index'
import { createLogger } from './logger'

const logger = createLogger('IPC-Example')

interface IPCMessage {
  timestamp: string
  source: 'javascript' | 'rust'
  content: string
}

class IPCManager {
  private messageHistory: IPCMessage[] = []
  private webview: any = null

  constructor() {
    logger.info('IPC Manager initialized')
  }

  /**
   * Log message to history
   */
  logMessage(source: 'javascript' | 'rust', content: string): void {
    const message: IPCMessage = {
      timestamp: new Date().toISOString(),
      source,
      content
    }
    this.messageHistory.push(message)
    
    logger.info('Message received', {
      source,
      content,
      totalMessages: this.messageHistory.length
    })
  }

  /**
   * Get message history
   */
  getMessageHistory(): IPCMessage[] {
    return this.messageHistory
  }

  /**
   * Set webview reference
   */
  setWebview(webview: any): void {
    this.webview = webview
    logger.debug('Webview reference set')
  }

  /**
   * Send message to JavaScript
   */
  sendToJavaScript(message: string): void {
    if (this.webview) {
      this.webview.send(message)
      logger.debug('Message sent to JavaScript', { message })
    }
  }
}

/**
 * Create HTML for IPC test interface
 */
function createIPCHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>IPC Communication Test</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1a1a1a;
            color: #e0e0e0;
            padding: 20px;
            margin: 0;
          }
          h1 {
            color: #4CAF50;
            margin-bottom: 20px;
          }
          button {
            padding: 12px 24px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.3s ease;
          }
          button:hover {
            background: #45a049;
          }
          #output {
            margin-top: 20px;
            padding: 15px;
            background: #2d2d2d;
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
            min-height: 200px;
            max-height: 400px;
            overflow-y: auto;
          }
          .log-entry {
            margin: 8px 0;
            padding: 10px;
            background: #222;
            border-radius: 4px;
            border-left: 3px solid #4CAF50;
            font-family: 'Courier New', monospace;
            font-size: 12px;
          }
          .log-entry.js {
            border-left-color: #2196F3;
          }
          .log-entry.rust {
            border-left-color: #FF9800;
          }
          .timestamp {
            color: #888;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <h1>IPC Communication Test</h1>
        <button id="send-btn">Send Message to Rust</button>
        <div id="output">Waiting for messages...</div>
        
        <script>
          const btn = document.getElementById('send-btn');
          const output = document.getElementById('output');
          let messageCount = 0;
          
          function logMessage(source, message) {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry ' + source;
            
            const timestamp = new Date().toLocaleTimeString();
            const count = ++messageCount;
            
            logEntry.innerHTML = 
              '<div class="timestamp">[' + timestamp + '] Message #' + count + ' (' + source + '):</div>' +
              '<div>' + message + '</div>';
            
            output.appendChild(logEntry);
            output.scrollTop = output.scrollHeight;
          }
          
          logMessage('js', 'IPC interface initialized');
          
          setTimeout(() => {
            btn.click();
          }, 2000);
          
          btn.addEventListener('click', () => {
            const message = 'Hello from JavaScript at ' + new Date().toLocaleTimeString();
            logMessage('js', 'Sending: ' + message);
            
            if (window.ipc && window.ipc.postMessage) {
              window.ipc.postMessage(message);
            } else {
              logMessage('js', 'ERROR: window.ipc.postMessage not available!');
            }
          });
          
          window.__webview_on_message__ = (msg) => {
            logMessage('rust', 'Received from Rust: ' + msg);
          };
        </script>
      </body>
    </html>
  `
}

/**
 * Main function to run IPC example
 */
async function main() {
  logger.banner('IPC Communication Example', 'Demonstrating bidirectional JavaScript-Rust communication')

  try {
    const eventLoop = new EventLoop()
    const ipcManager = new IPCManager()

    logger.info('Creating main window...')
    const window = new WindowBuilder()
      .withTitle('IPC Communication Test')
      .withInnerSize(1200, 800)
      .withTheme(TaoTheme.Dark)
      .withDecorated(true)
      .withMenubar(true)
      .build(eventLoop)

    logger.success('Window created', {
      windowId: window.id,
      title: window.title()
    })

    logger.info('Creating webview with IPC handler...')
    const html = createIPCHtml()

    const builder = new WebViewBuilder()
      .withHtml(html)
      .withTitle('IPC Test')
      .withWidth(600)
      .withHeight(400)
      .withIpcHandler((_err: any, msg: string) => {
        ipcManager.logMessage('javascript', msg)
        
        logger.object('Rust received message', {
          message: msg,
          timestamp: new Date().toISOString()
        })

        setTimeout(() => {
          const reply = `ACK: ${msg} - Processed at ${new Date().toLocaleTimeString()}`
          console.log('Sending reply to JavaScript:', reply)
          ipcManager.sendToJavaScript(reply)
        }, 500)
      })

    const webview = builder.buildOnWindow(window, 'ipc-webview')
    ipcManager.setWebview(webview)

    logger.success('Webview created', {
      webviewId: webview.id,
      label: webview.label
    })

    webview.openDevtools()
    logger.info('DevTools opened')

    webview.on((_err: any, msg: string) => {
      ipcManager.logMessage('rust', msg)
      logger.object('Second listener received', { message: msg })
    })

    logger.section('Starting Event Loop')
    logger.info('Press Ctrl+C to exit')

    const interval = setInterval(() => {
      if (!eventLoop.runIteration()) {
        clearInterval(interval)
        process.exit(0)
      }

      void window.id
      void webview.id
    }, 10)

  } catch (error) {
    logger.error('Error executing IPC example', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

main()

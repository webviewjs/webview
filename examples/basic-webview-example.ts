/**
 * Basic WebView Example
 * 
 * Demonstrates creating a simple webview with HTML content
 * using @webviewjs/webview
 */

import { WebViewBuilder, EventLoop } from '../index'
import { createLogger } from './logger'

const logger = createLogger('BasicWebView')

interface WebViewConfig {
  title: string
  width: number
  height: number
  x: number
  y: number
  resizable: boolean
  decorated: boolean
  visible: boolean
  focused: boolean
  menubar: boolean
}

class WebViewManager {
  private webview: any = null
  private config: WebViewConfig

  constructor(config: Partial<WebViewConfig> = {}) {
    this.config = {
      title: 'Basic WebView',
      width: 800,
      height: 600,
      x: 100,
      y: 100,
      resizable: true,
      decorated: true,
      visible: true,
      focused: true,
      menubar: true,
      ...config
    }

    logger.info('WebView Manager initialized', { config: this.config })
  }

  /**
   * Get webview configuration
   */
  getConfig(): WebViewConfig {
    return this.config
  }

  /**
   * Set webview reference
   */
  setWebview(webview: any): void {
    this.webview = webview
    logger.debug('Webview reference set', { webviewId: webview.id })
  }

  /**
   * Get webview information
   */
  getWebviewInfo(): any {
    if (!this.webview) {
      logger.warning('No webview reference available')
      return null
    }

    return {
      id: this.webview.id,
      label: this.webview.label
    }
  }

  /**
   * Execute JavaScript in webview
   */
  async executeScript(script: string): Promise<any> {
    if (!this.webview) {
      throw new Error('No webview reference available')
    }

    logger.debug('Executing script', { scriptLength: script.length })
    return await this.webview.evaluateScript(script)
  }

  /**
   * Open DevTools
   */
  async openDevTools(): Promise<void> {
    if (!this.webview) {
      throw new Error('No webview reference available')
    }

    await this.webview.openDevtools()
    logger.info('DevTools opened')
  }

  /**
   * Close DevTools
   */
  async closeDevTools(): Promise<void> {
    if (!this.webview) {
      throw new Error('No webview reference available')
    }

    await this.webview.closeDevtools()
    logger.info('DevTools closed')
  }

  /**
   * Check if DevTools is open
   */
  async isDevToolsOpen(): Promise<boolean> {
    if (!this.webview) {
      throw new Error('No webview reference available')
    }

    return await this.webview.isDevtoolsOpen()
  }
}

/**
 * Create basic HTML content for webview
 */
function createBasicHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My First WebView</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    p {
      font-size: 1.2em;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hello from WebView!</h1>
    <p>This is your first webview with @webviewjs/webview</p>
  </div>
</body>
</html>`
}

/**
 * Main function to run basic webview example
 */
async function main() {
  logger.banner('Basic WebView Example', 'Demonstrating simple webview creation with HTML content')

  try {
    logger.info('Creating event loop...')
    const eventLoop = new EventLoop()
    logger.success('Event loop created')

    logger.section('WebView Configuration')
    const webViewManager = new WebViewManager({
      title: 'My First WebView',
      width: 800,
      height: 600,
      x: 100,
      y: 100,
      resizable: true,
      decorated: true,
      visible: true,
      focused: true,
      menubar: true
    })

    logger.object('WebView configuration', webViewManager.getConfig())

    logger.info('Creating webview with HTML content...')
    const htmlContent = createBasicHtml()

    const builder = new WebViewBuilder()
      .withHtml(htmlContent)
      .withTitle(webViewManager.getConfig().title)
      .withWidth(webViewManager.getConfig().width)
      .withHeight(webViewManager.getConfig().height)
      .withX(webViewManager.getConfig().x)
      .withY(webViewManager.getConfig().y)
      .withResizable(webViewManager.getConfig().resizable)
      .withDecorated(webViewManager.getConfig().decorated)
      .withVisible(webViewManager.getConfig().visible)
      .withFocused(webViewManager.getConfig().focused)
      .withMenubar(webViewManager.getConfig().menubar)

    const webview = builder.build(eventLoop, 'webview-1')
    webViewManager.setWebview(webview)

    logger.success('WebView created', webViewManager.getWebviewInfo())

    logger.section('JavaScript Execution')
    await webViewManager.executeScript('console.log("JavaScript executed from Node.js")')
    logger.success('JavaScript executed successfully')

    logger.section('DevTools Management')
    await webViewManager.openDevTools()
    logger.success('DevTools opened')

    const devtoolsOpen = await webViewManager.isDevToolsOpen()
    logger.object('DevTools status', { isOpen: devtoolsOpen })

    await webViewManager.closeDevTools()
    logger.success('DevTools closed')

    const devtoolsOpenAfterClose = await webViewManager.isDevToolsOpen()
    logger.object('DevTools status after close', { isOpen: devtoolsOpenAfterClose })

    logger.section('Starting Event Loop')
    logger.info('Press Ctrl+C to exit')

    eventLoop.run()

  } catch (error) {
    logger.error('Error executing basic webview example', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

main()

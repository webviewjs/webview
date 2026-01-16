/**
 * WebView HTML Content Example
 * 
 * Demonstrates creating a webview with HTML content rendered from a string
 * using @webviewjs/webview
 */

import { WebViewBuilder, EventLoop } from '../index'
import { createLogger } from './logger'

const logger = createLogger('WebViewHTML')

interface HtmlContentConfig {
  title: string
  width: number
  height: number
}

class HtmlContentManager {
  private webview: any = null
  private config: HtmlContentConfig

  constructor(config: Partial<HtmlContentConfig> = {}) {
    this.config = {
      title: 'HTML Content - WebView',
      width: 600,
      height: 400,
      ...config
    }

    logger.info('HTML Content Manager initialized', { config: this.config })
  }

  /**
   * Get configuration
   */
  getConfig(): HtmlContentConfig {
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
}

/**
 * Create simple HTML content for webview
 */
function createSimpleHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HTML Content</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #0f172a;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          h1 {
            color: #38bdf8;
            font-size: 3rem;
            margin-bottom: 0.5rem;
          }
          p {
            color: #94a3b8;
            font-size: 1.25rem;
          }
          .card {
            background: #1e293b;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
            border: 1px solid #334155;
          }
          .footer {
            margin-top: 20px;
            font-size: 0.8rem;
            opacity: 0.5;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Hello!</h1>
          <p>This is a WebView rendered from an HTML string.</p>
          <div class="footer">Powered by @webviewjs/webview</div>
        </div>
      </body>
    </html>
  `
}

/**
 * Main function to run webview HTML content example
 */
async function main() {
  logger.banner('WebView HTML Content Example', 'Demonstrating HTML content rendering from string')

  try {
    logger.info('Creating event loop...')
    const eventLoop = new EventLoop()
    logger.success('Event loop created')

    logger.section('HTML Content Configuration')
    const htmlContentManager = new HtmlContentManager({
      title: 'HTML Simple - WebView',
      width: 600,
      height: 400
    })

    logger.object('HTML content configuration', htmlContentManager.getConfig())

    logger.info('Creating HTML content...')
    const html = createSimpleHtml()
    logger.success('HTML content created', { contentLength: html.length })

    logger.info('Building webview with HTML content...')
    const builder = new WebViewBuilder()
      .withHtml(html)
      .withTitle(htmlContentManager.getConfig().title)
      .withWidth(htmlContentManager.getConfig().width)
      .withHeight(htmlContentManager.getConfig().height)

    const webview = builder.build(eventLoop, 'html-webview')
    htmlContentManager.setWebview(webview)

    logger.success('Webview created', htmlContentManager.getWebviewInfo())

    logger.section('WebView Features')
    logger.info('HTML content rendered from string')
    logger.info('Modern dark theme styling')
    logger.info('Responsive card layout')
    logger.info('System font stack')

    logger.section('Starting Event Loop')
    logger.info('Press Ctrl+C to exit')

    eventLoop.run()

  } catch (error) {
    logger.error('Error executing webview HTML content example', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

main()

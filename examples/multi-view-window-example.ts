/**
 * Multi-View Window Example
 * 
 * Demonstrates creating a window with multiple WebViews as separate views
 * using @webviewjs/webview
 */

import { WindowBuilder, WebViewBuilder, EventLoop, TaoTheme } from '../index'
import { createLogger } from './logger'

const logger = createLogger('MultiViewWindow')

interface ViewConfig {
  label: string
  html: string
}

class MultiViewManager {
  private window: any = null
  private views: Map<string, any> = new Map()

  constructor() {
    logger.info('Multi-View Manager initialized')
  }

  /**
   * Set window reference
   */
  setWindow(window: any): void {
    this.window = window
    logger.debug('Window reference set', { windowId: window.id })
  }

  /**
   * Add a view to the manager
   */
  addView(label: string, webview: any): void {
    this.views.set(label, webview)
    logger.info('View added', { label, webviewId: webview.id })
  }

  /**
   * Get a specific view by label
   */
  getView(label: string): any {
    return this.views.get(label)
  }

  /**
   * Get all views
   */
  getAllViews(): Map<string, any> {
    return this.views
  }

  /**
   * Get views information
   */
  getViewsInfo(): any[] {
    const info: any[] = []
    this.views.forEach((webview, label) => {
      info.push({
        label,
        id: webview.id,
        webview
      })
    })
    return info
  }

  /**
   * Log all views information
   */
  logViewsInfo(): void {
    logger.section('Views Information')
    const info = this.getViewsInfo()
    info.forEach(view => {
      logger.object(`View: ${view.label}`, {
        id: view.id,
        webview: view.webview
      })
    })
  }
}

/**
 * Create header HTML for the multi-view window
 */
function createHeaderHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Header View</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #1e293b;
            color: white;
            font-family: system-ui;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            border-bottom: 2px solid #38bdf8;
          }
          h1 {
            margin: 0;
            font-size: 1.5rem;
            color: #38bdf8;
          }
        </style>
      </head>
      <body>
        <h1>Multi-View Control Panel</h1>
      </body>
    </html>
  `
}

/**
 * Create content HTML for the multi-view window
 */
function createContentHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Content View</title>
        <style>
          body {
            margin: 0;
            padding: 40px;
            background: #0f172a;
            color: #94a3b8;
            font-family: system-ui;
          }
          h2 {
            color: #38bdf8;
            margin-bottom: 20px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
          }
          .card {
            background: #1e293b;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #334155;
            transition: transform 0.3s ease;
          }
          .card:hover {
            transform: translateY(-5px);
            border-color: #38bdf8;
          }
          .card h3 {
            color: white;
            margin-top: 0;
            margin-bottom: 10px;
          }
          button {
            background: #38bdf8;
            color: #0f172a;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s ease;
          }
          button:hover {
            background: #7dd3fc;
          }
        </style>
      </head>
      <body>
        <h2>Dashboard</h2>
        <div class="grid">
          <div class="card">
            <h3>Statistics</h3>
            <p>Active users: 1,234</p>
            <button onclick="alert('Updating...')">Update</button>
          </div>
          <div class="card">
            <h3>Status</h3>
            <p>System operating correctly</p>
          </div>
          <div class="card">
            <h3>Performance</h3>
            <p>CPU: 24% | RAM: 4.2 GB</p>
          </div>
          <div class="card">
            <h3>Network</h3>
            <p>Bandwidth: 12.5 Mb/s</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Main function to run multi-view window example
 */
async function main() {
  logger.banner('Multi-View Window Example', 'Demonstrating multiple WebViews in a single window')

  try {
    logger.info('Creating event loop...')
    const eventLoop = new EventLoop()
    const multiViewManager = new MultiViewManager()

    logger.success('Event loop created')

    logger.section('Creating Main Window')
    logger.info('Creating window with dark theme...')
    const window = new WindowBuilder()
      .withTitle('Multi-View Window')
      .withInnerSize(1000, 800)
      .withTheme(TaoTheme.Dark)
      .build(eventLoop)

    multiViewManager.setWindow(window)
    logger.success('Window created', { windowId: window.id })

    logger.section('Creating Header View')
    const headerHtml = createHeaderHtml()
    const headerView = new WebViewBuilder()
      .withHtml(headerHtml)
      .buildOnWindow(window, 'header-view')

    multiViewManager.addView('header', headerView)
    logger.success('Header view created', { viewId: headerView.id })

    logger.section('Creating Content View')
    const contentHtml = createContentHtml()
    const contentView = new WebViewBuilder()
      .withHtml(contentHtml)
      .buildOnWindow(window, 'content-view')

    multiViewManager.addView('content', contentView)
    logger.success('Content view created', { viewId: contentView.id })

    multiViewManager.logViewsInfo()

    logger.section('Multi-View Features')
    logger.info('Multiple independent WebViews')
    logger.info('Separate HTML content per view')
    logger.info('Shared window context')
    logger.info('Individual view management')

    logger.section('Starting Event Loop')
    logger.info('Press Ctrl+C to exit')

    eventLoop.run()

  } catch (error) {
    logger.error('Error executing multi-view window example', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

main()

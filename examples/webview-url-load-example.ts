/**
 * WebView URL Load Example
 * 
 * Demonstrates creating a webview that loads content from a URL
 * using @webviewjs/webview
 */

import { WebViewBuilder, EventLoop } from '../index'
import { createLogger } from './logger'

const logger = createLogger('WebViewURL')

interface UrlConfig {
  url: string
  title: string
  width: number
  height: number
}

class UrlLoadManager {
  private webview: any = null
  private config: UrlConfig

  constructor(config: Partial<UrlConfig> = {}) {
    this.config = {
      url: 'https://www.google.com',
      title: 'WebView URL',
      width: 1024,
      height: 768,
      ...config
    }

    logger.info('URL Load Manager initialized', { config: this.config })
  }

  /**
   * Get configuration
   */
  getConfig(): UrlConfig {
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
   * Navigate to a different URL
   */
  navigateTo(url: string): void {
    if (!this.webview) {
      throw new Error('No webview reference available')
    }

    this.webview.navigate(url)
    logger.info('Navigated to new URL', { url })
  }

  /**
   * Reload current page
   */
  reload(): void {
    if (!this.webview) {
      throw new Error('No webview reference available')
    }

    this.webview.reload()
    logger.info('Page reloaded')
  }

  /**
   * Go back in history
   */
  goBack(): void {
    if (!this.webview) {
      throw new Error('No webview reference available')
    }

    this.webview.goBack()
    logger.info('Navigated back')
  }

  /**
   * Go forward in history
   */
  goForward(): void {
    if (!this.webview) {
      throw new Error('No webview reference available')
    }

    this.webview.goForward()
    logger.info('Navigated forward')
  }
}

/**
 * Main function to run webview URL load example
 */
async function main() {
  logger.banner('WebView URL Load Example', 'Demonstrating URL loading in webview')

  try {
    logger.info('Creating event loop...')
    const eventLoop = new EventLoop()
    logger.success('Event loop created')

    logger.section('URL Configuration')
    const urlLoadManager = new UrlLoadManager({
      url: 'https://www.google.com',
      title: 'Google - WebView',
      width: 1024,
      height: 768
    })

    logger.object('URL configuration', urlLoadManager.getConfig())

    logger.info('Building webview with URL...')
    const builder = new WebViewBuilder()
      .withUrl(urlLoadManager.getConfig().url)
      .withTitle(urlLoadManager.getConfig().title)
      .withWidth(urlLoadManager.getConfig().width)
      .withHeight(urlLoadManager.getConfig().height)

    const webview = builder.build(eventLoop, 'url-webview')
    urlLoadManager.setWebview(webview)

    logger.success('Webview created', urlLoadManager.getWebviewInfo())

    logger.section('WebView Features')
    logger.info('URL loading from external source')
    logger.info('Full web browsing capabilities')
    logger.info('Navigation controls available')
    logger.info('DevTools support enabled')

    logger.section('Starting Event Loop')
    logger.info('Press Ctrl+C to exit')

    eventLoop.run()

  } catch (error) {
    logger.error('Error executing webview URL load example', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

main()

/**
 * Basic Window Example
 * 
 * Demonstrates creating a simple window with various configuration options
 * using @webviewjs/webview
 */

import { WindowBuilder, EventLoop } from '../index'
import { createLogger } from './logger'

const logger = createLogger('BasicWindow')

interface WindowConfig {
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

interface WindowInfo {
  id: string
  title: string
  size: { width: number; height: number }
  position: { x: number; y: number }
  visible: boolean
  resizable: boolean
  decorated: boolean
  maximized: boolean
  minimized: boolean
  alwaysOnTop: boolean
  focused: boolean
}

class WindowManager {
  private window: any = null
  private config: WindowConfig

  constructor(config: Partial<WindowConfig> = {}) {
    this.config = {
      title: 'Basic Window',
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

    logger.info('Window Manager initialized', { config: this.config })
  }

  /**
   * Get window configuration
   */
  getConfig(): WindowConfig {
    return this.config
  }

  /**
   * Set window reference
   */
  setWindow(window: any): void {
    this.window = window
    logger.debug('Window reference set', { windowId: window.id })
  }

  /**
   * Get comprehensive window information
   */
  getWindowInfo(): WindowInfo | null {
    if (!this.window) {
      logger.warning('No window reference available')
      return null
    }

    return {
      id: this.window.id,
      title: this.window.title(),
      size: this.window.innerSize(),
      position: this.window.outerPosition(),
      visible: this.window.isVisible(),
      resizable: this.window.isResizable(),
      decorated: this.window.isDecorated(),
      maximized: this.window.isMaximized(),
      minimized: this.window.isMinimized(),
      alwaysOnTop: this.window.isAlwaysOnTop(),
      focused: this.window.isFocused()
    }
  }

  /**
   * Log detailed window information
   */
  logWindowInfo(): void {
    const info = this.getWindowInfo()
    if (info) {
      logger.section('Window Information')
      logger.object('Window details', info)
    }
  }

  /**
   * Maximize window
   */
  maximize(): void {
    if (!this.window) {
      throw new Error('No window reference available')
    }

    this.window.maximize()
    logger.info('Window maximized')
  }

  /**
   * Minimize window
   */
  minimize(): void {
    if (!this.window) {
      throw new Error('No window reference available')
    }

    this.window.minimize()
    logger.info('Window minimized')
  }

  /**
   * Restore window
   */
  restore(): void {
    if (!this.window) {
      throw new Error('No window reference available')
    }

    this.window.restore()
    logger.info('Window restored')
  }

  /**
   * Close window
   */
  close(): void {
    if (!this.window) {
      throw new Error('No window reference available')
    }

    this.window.close()
    logger.info('Window closed')
  }

  /**
   * Set window title
   */
  setTitle(title: string): void {
    if (!this.window) {
      throw new Error('No window reference available')
    }

    this.window.setTitle(title)
    logger.info('Window title updated', { title })
  }

  /**
   * Set window size
   */
  setSize(width: number, height: number): void {
    if (!this.window) {
      throw new Error('No window reference available')
    }

    this.window.setInnerSize(width, height)
    logger.info('Window size updated', { width, height })
  }

  /**
   * Set window position
   */
  setPosition(x: number, y: number): void {
    if (!this.window) {
      throw new Error('No window reference available')
    }

    this.window.setOuterPosition(x, y)
    logger.info('Window position updated', { x, y })
  }
}

/**
 * Main function to run basic window example
 */
async function main() {
  logger.banner('Basic Window Example', 'Demonstrating simple window creation with configuration options')

  try {
    logger.info('Creating event loop...')
    const eventLoop = new EventLoop()
    logger.success('Event loop created')

    logger.section('Window Configuration')
    const windowManager = new WindowManager({
      title: 'My First Window',
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

    logger.object('Window configuration', windowManager.getConfig())

    logger.info('Creating window with specified configuration...')
    const builder = new WindowBuilder()
      .withTitle(windowManager.getConfig().title)
      .withInnerSize(
        windowManager.getConfig().width,
        windowManager.getConfig().height
      )
      .withPosition(
        windowManager.getConfig().x,
        windowManager.getConfig().y
      )
      .withResizable(windowManager.getConfig().resizable)
      .withDecorated(windowManager.getConfig().decorated)
      .withVisible(windowManager.getConfig().visible)
      .withFocused(windowManager.getConfig().focused)
      .withMenubar(windowManager.getConfig().menubar)

    const window = builder.build(eventLoop)
    windowManager.setWindow(window)

    logger.success('Window created', {
      windowId: window.id,
      title: window.title()
    })

    windowManager.logWindowInfo()

    logger.section('Starting Event Loop')
    logger.info('Press Ctrl+C to exit')

    eventLoop.run()

  } catch (error) {
    logger.error('Error executing basic window example', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

main()

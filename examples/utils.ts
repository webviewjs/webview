/**
 * Utilities for simplifying window and webview creation
 * with @webviewjs/webview
 * 
 * This module provides helper functions and default configurations
 * to streamline the creation of windows and webviews.
 */

import {
  WindowOptions,
  //@ts-ignore
  WindowAttributes,
  WindowSizeConstraints,
  TaoTheme,
  WebViewAttributes,
  WryTheme,
  InitializationScript,
  Size,
  //@ts-ignore
  Position
} from '../index'

import { createLogger } from './logger'

const logger = createLogger('Utils')

/**
 * Default options for windows
 */
const DEFAULT_WINDOW_OPTIONS: Partial<WindowOptions> = {
  width: 800,
  height: 600,
  x: 100,
  y: 100,
  resizable: true,
  decorations: true,
  alwaysOnTop: false,
  visible: true,
  transparent: false,
  maximized: false,
  focused: true,
  menubar: true,
  icon: undefined,
  theme: undefined
}

/**
 * Default options for webviews
 */
const DEFAULT_WEBVIEW_OPTIONS: Partial<WebViewAttributes> = {
  width: 800,
  height: 600,
  x: 100,
  y: 100,
  resizable: true,
  menubar: true,
  maximized: false,
  minimized: false,
  visible: true,
  decorations: true,
  alwaysOnTop: false,
  transparent: false,
  focused: true,
  icon: undefined,
  theme: undefined,
  userAgent: undefined,
  initializationScripts: [],
  dragDrop: true,
  backgroundColor: undefined
}

/**
 * Create window options with default values
 */
export function createWindowOptions(
  title: string,
  overrides: Partial<WindowOptions> = {}
): WindowOptions {
  const options = {
    ...DEFAULT_WINDOW_OPTIONS,
    title,
    ...overrides
  } as WindowOptions

  logger.debug('Window options created', { title, options })
  return options
}

/**
 * Create webview options with default values
 */
export function createWebViewOptions(
  overrides: Partial<WebViewAttributes> = {}
): WebViewAttributes {
  const options = {
    ...DEFAULT_WEBVIEW_OPTIONS,
    ...overrides
  } as WebViewAttributes

  logger.debug('Webview options created', { options })
  return options
}

/**
 * Create a basic window with title
 */
export function createBasicWindow(title: string): WindowOptions {
  return createWindowOptions(title)
}

/**
 * Create a window with dark theme
 */
export function createDarkWindow(title: string): WindowOptions {
  return createWindowOptions(title, {
    theme: TaoTheme.Dark
  })
}

/**
 * Create a window without decorations (frameless)
 */
export function createFramelessWindow(title: string): WindowOptions {
  return createWindowOptions(title, {
    decorations: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    menubar: false
  })
}

/**
 * Create a maximized window
 */
export function createMaximizedWindow(title: string): WindowOptions {
  return createWindowOptions(title, {
    width: 1920,
    height: 1080,
    x: 0,
    y: 0,
    maximized: true
  })
}

/**
 * Create a centered window on the monitor
 */
export function createCenteredWindow(title: string, monitorSize: Size): WindowOptions {
  const width = 800
  const height = 600

  return createWindowOptions(title, {
    width,
    height,
    x: Math.floor((monitorSize.width - width) / 2),
    y: Math.floor((monitorSize.height - height) / 2)
  })
}

/**
 * Create a window with size constraints
 */
export function createWindowWithConstraints(
  title: string,
  constraints: WindowSizeConstraints
): { window: WindowOptions; constraints: WindowSizeConstraints } {
  logger.debug('Window with constraints created', { title, constraints })
  return {
    window: createWindowOptions(title),
    constraints
  }
}

/**
 * Create a basic webview with URL
 */
export function createBasicWebView(url: string): WebViewAttributes {
  return createWebViewOptions({
    url,
    title: 'WebView'
  })
}

/**
 * Create a webview with HTML content
 */
export function createHtmlWebView(html: string, title = 'WebView HTML'): WebViewAttributes {
  return createWebViewOptions({
    html,
    url: undefined,
    title
  })
}

/**
 * Create a webview with dark theme
 */
export function createDarkWebView(url: string): WebViewAttributes {
  return createWebViewOptions({
    url,
    theme: WryTheme.Dark
  })
}

/**
 * Create a transparent webview (frameless)
 */
export function createTransparentWebView(html: string): WebViewAttributes {
  return createWebViewOptions({
    html,
    url: undefined,
    transparent: true,
    decorations: false,
    alwaysOnTop: true,
    resizable: false,
    menubar: false,
    dragDrop: false
  })
}

/**
 * Create a webview with initialization scripts
 */
export function createWebViewWithScripts(
  url: string,
  scripts: InitializationScript[]
): WebViewAttributes {
  return createWebViewOptions({
    url,
    initializationScripts: scripts
  })
}

/**
 * Create a simple initialization script
 */
export function createInitScript(js: string, once = false): InitializationScript {
  return { js, once }
}

/**
 * Create basic HTML for webview
 */
export function createBasicHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
    <h1>${title}</h1>
    <p>${content}</p>
  </div>
</body>
</html>`
}

/**
 * Create HTML with an interactive counter
 */
export function createCounterHtml(title = 'Interactive Counter'): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
      font-size: 2em;
      margin-bottom: 30px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .counter {
      font-size: 4em;
      font-weight: bold;
      margin: 30px 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    button {
      padding: 15px 30px;
      font-size: 1.2em;
      margin: 10px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      background: white;
      color: #667eea;
      font-weight: bold;
      transition: all 0.3s ease;
    }
    button:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    button:active {
      transform: scale(0.95);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Counter</h1>
    <div class="counter" id="counter">0</div>
    <button onclick="decrement()">-</button>
    <button onclick="increment()">+</button>
  </div>
  <script>
    let count = 0;
    const counterEl = document.getElementById('counter');
    
    function increment() {
      count++;
      counterEl.textContent = count;
    }
    
    function decrement() {
      count--;
      counterEl.textContent = count;
    }
  </script>
</body>
</html>`
}

/**
 * Create HTML with system information
 */
export function createSystemInfoHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Information</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
    }
    .container {
      padding: 40px;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-width: 600px;
    }
    h1 {
      font-size: 2em;
      margin-bottom: 30px;
      color: #667eea;
      text-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .info-item:last-child {
      border-bottom: none;
    }
    .label {
      color: #888;
      font-weight: 500;
    }
    .value {
      color: #667eea;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>System Information</h1>
    <div class="info-item">
      <span class="label">Platform:</span>
      <span class="value" id="platform">-</span>
    </div>
    <div class="info-item">
      <span class="label">Browser:</span>
      <span class="value" id="browser">-</span>
    </div>
    <div class="info-item">
      <span class="label">Resolution:</span>
      <span class="value" id="resolution">-</span>
    </div>
    <div class="info-item">
      <span class="label">Pixel Ratio:</span>
      <span class="value" id="pixelRatio">-</span>
    </div>
    <div class="info-item">
      <span class="label">Language:</span>
      <span class="value" id="language">-</span>
    </div>
  </div>
  <script>
    document.getElementById('platform').textContent = navigator.platform || 'Unknown';
    document.getElementById('browser').textContent = navigator.userAgent.split(' ').pop() || 'Unknown';
    document.getElementById('resolution').textContent = \`\${window.screen.width}x\${window.screen.height}\`;
    document.getElementById('pixelRatio').textContent = window.devicePixelRatio || 1;
    document.getElementById('language').textContent = navigator.language || 'Unknown';
  </script>
</body>
</html>`
}

/**
 * Validate window options
 */
export function validateWindowOptions(options: WindowOptions): boolean {
  if (!options.title || options.title.trim() === '') {
    logger.error('Window title is required')
    return false
  }

  if (options.width <= 0 || options.height <= 0) {
    logger.error('Width and height must be positive')
    return false
  }

  logger.debug('Window options validated', { title: options.title })
  return true
}

/**
 * Validate webview options
 */
export function validateWebViewOptions(options: WebViewAttributes): boolean {
  if (!options.url && !options.html) {
    logger.error('URL or HTML content must be provided')
    return false
  }

  if (options.width <= 0 || options.height <= 0) {
    logger.error('Width and height must be positive')
    return false
  }

  logger.debug('Webview options validated')
  return true
}

/**
 * Log configuration for debugging
 */
export function logConfig(type: 'window' | 'webview', config: any): void {
  logger.section(`${type.charAt(0).toUpperCase() + type.slice(1)} Configuration`)
  logger.object(`${type} configuration`, config)
}

/**
 * Create a responsive window configuration
 */
export function createResponsiveWindow(
  title: string,
  minWidth: number = 400,
  minHeight: number = 300
): { window: WindowOptions; constraints: WindowSizeConstraints } {
  return {
    window: createWindowOptions(title, {
      width: 800,
      height: 600
    }),
    constraints: {
      minWidth,
      minHeight,
      maxWidth: 1920,
      maxHeight: 1080
    }
  }
}

/**
 * Create a fullscreen window
 */
export function createFullscreenWindow(title: string): WindowOptions {
  return createWindowOptions(title, {
    width: 1920,
    height: 1080,
    x: 0,
    y: 0,
    decorations: false,
    resizable: false
  })
}

/**
 * Create a webview with custom user agent
 */
export function createWebViewWithUserAgent(
  url: string,
  userAgent: string
): WebViewAttributes {
  return createWebViewOptions({
    url,
    userAgent
  })
}



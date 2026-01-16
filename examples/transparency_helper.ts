
import { WindowBuilder, WebViewBuilder, EventLoop, Window, WebView } from '../index';

export interface TransparentWindowOptions {
  title?: string;
  width?: number;
  height?: number;
  html: string;
  // Optional: Background color (R, G, B, A)
  backgroundColor?: [number, number, number, number]; 
}

export class TransparencyHelper {
  /**
   * Creates a window with alpha channel enabled and correctly configured.
   */
  static createWindow(eventLoop: EventLoop, options: TransparentWindowOptions): { window: Window, webview: WebView } {
    
    // 1. Window Configuration (OS Layer)
    const window = new WindowBuilder()
      .withTitle(options.title || 'Transparent Window')
      .withInnerSize(options.width || 800, options.height || 600)
      .withTransparent(true)       // Enables WS_EX_LAYERED on Windows / NSWindow.isOpaque = NO on Mac
      .withDecorated(false)        // Recommended to avoid system borders
      .build(eventLoop);

    // 2. Critical CSS (Content Layer)
    // Inject styles to ensure the body doesn't have a default white background.
    const finalHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body {
              background-color: transparent !important; /* CRITICAL */
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          ${options.html}
        </body>
      </html>
    `;

    // 3. WebView Configuration (Engine Layer)
    // Rust must receive the explicit instruction to clear the buffer to (0,0,0,0).
    const bg = options.backgroundColor || [0, 0, 0, 0];
    
    const webview = new WebViewBuilder()
      .withHtml(finalHtml)
      .withTransparent(true)
      // Force 'clear' color to start the alpha channel clean
      .withBackgroundColor(Buffer.from(bg)) 
      .buildOnWindow(window, 'transparent-layer');

    return { window, webview };
  }
}


import { EventLoop } from '../index'
import { createLogger } from './logger'
import { TransparencyHelper } from './transparency_helper'

const logger = createLogger('TransparentWindow')

async function main() {
  logger.banner('Transparent Window Example', 'Demonstrating true transparency with alpha channel')

  try {
    logger.info('Creating event loop...')
    const eventLoop = new EventLoop()

    logger.success('Event loop created')

    // Use the helper to ensure correct configuration across OS, Engine, and CSS
    const { window, webview } = TransparencyHelper.createWindow(eventLoop, {
      title: 'Transparent Window',
      width: 1000,
      height: 800,
      // Pass a semi-transparent background to verify alpha blending
      backgroundColor: [0, 0, 0, 0], // Fully transparent base
      html: `
        <div style="
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          height: 100%; 
          font-family: sans-serif;
        ">
          <div style="
            background: rgba(255, 255, 255, 0.8); 
            padding: 2rem; 
            border-radius: 1rem; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
          ">
             <h1 style="color: #333; margin: 0 0 1rem 0;">Hello, Transparency!</h1>
             <p style="color: #666;">This window should have a transparent background.</p>
             <p style="color: #666; font-size: 0.8rem;">(The alpha channel is active!)</p>
             <button style="padding: 10px 20px; cursor: pointer;">Click Me</button>
          </div>
          
          <!-- Floating element to show partial transparency -->
          <div style="
            margin-top: 2rem;
            width: 100px;
            height: 100px;
            background: rgba(255, 0, 0, 0.5);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
          ">
            50% Alpha
          </div>
        </div>
      `
    });
    
    logger.info(`Created window with ID: ${window.id} and WebView`, webview)
    
    logger.section('Starting Event Loop')
    logger.info('Press Ctrl+C to exit')

    eventLoop.run()

  } catch (error) {
    logger.error('Error executing transparent window example', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

main()

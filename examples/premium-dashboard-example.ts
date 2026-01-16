/**
 * Premium Dashboard Example
 * 
 * Demonstrates modern UI design capabilities with glassmorphism effects,
 * real-time animations, and professional styling using @webviewjs/webview
 */

import { WindowBuilder, WebViewBuilder, EventLoop, TaoTheme } from '../index'
import { createLogger } from './logger'

const logger = createLogger('PremiumDashboard')

interface DashboardStats {
  cpu: number
  ram: string
  network: string
  timestamp: string
}

class DashboardManager {
  private updateInterval: NodeJS.Timeout | null = null
  private stats: DashboardStats[] = []

  constructor() {
    logger.info('Dashboard Manager initialized')
  }

  /**
   * Generate random statistics
   */
  generateStats(): DashboardStats {
    return {
      cpu: Math.floor(Math.random() * 40 + 10),
      ram: `${(Math.random() * 4 + 2).toFixed(1)} GB`,
      network: `${(Math.random() * 20 + 5).toFixed(1)} Mb/s`,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get statistics history
   */
  getStatsHistory(): DashboardStats[] {
    return this.stats
  }

  /**
   * Start real-time updates
   */
  startUpdates(callback: (stats: DashboardStats) => void): void {
    if (this.updateInterval) {
      logger.warning('Updates already running')
      return
    }

    logger.info('Starting real-time updates')
    
    this.updateInterval = setInterval(() => {
      const stats = this.generateStats()
      this.stats.push(stats)
      
      if (this.stats.length > 100) {
        this.stats.shift()
      }

      callback(stats)
    }, 2000)
  }

  /**
   * Stop real-time updates
   */
  stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
      logger.info('Real-time updates stopped')
    }
  }
}

/**
 * Create premium dashboard HTML with modern styling
 */
function createDashboardHtml(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Premium Dashboard</title>
      <style>
        :root {
          --bg: #0f172a;
          --sidebar: #1e293b;
          --accent: #38bdf8;
          --accent-glow: rgba(56, 189, 248, 0.3);
          --text-main: #f8fafc;
          --text-dim: #94a3b8;
          --card-bg: rgba(30, 41, 59, 0.7);
          --glass: rgba(255, 255, 255, 0.03);
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
        }

        body {
          background-color: var(--bg);
          color: var(--text-main);
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        .sidebar {
          width: 260px;
          background: var(--sidebar);
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          padding: 2rem;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--accent);
          margin-bottom: 3rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-item {
          padding: 12px 16px;
          border-radius: 8px;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-item:hover, .nav-item.active {
          background: rgba(56, 189, 248, 0.1);
          color: var(--accent);
        }

        .main-content {
          flex: 1;
          padding: 2.5rem;
          overflow-y: auto;
          background: radial-gradient(circle at top right, rgba(56, 189, 248, 0.1), transparent 400px);
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
        }

        h1 {
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .card {
          background: var(--card-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 16px;
          transition: transform 0.3s ease;
        }

        .card:hover {
          transform: translateY(-5px);
          border-color: var(--accent);
          box-shadow: 0 10px 30px -10px var(--accent-glow);
        }

        .card-label {
          color: var(--text-dim);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .chart-container {
          background: var(--card-bg);
          border-radius: 16px;
          padding: 2rem;
          margin-top: 2rem;
          height: 300px;
          display: flex;
          align-items: flex-end;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .bar {
          flex: 1;
          background: linear-gradient(to top, var(--accent), #818cf8);
          border-radius: 4px 4px 0 0;
          transition: all 0.5s ease;
          position: relative;
        }

        .bar:hover {
          filter: brightness(1.2);
          box-shadow: 0 0 20px var(--accent-glow);
        }

        .pulse {
          width: 12px;
          height: 12px;
          background: var(--accent);
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
          box-shadow: 0 0 0 0 var(--accent-glow);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 var(--accent-glow); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(56, 189, 248, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
        }

        button {
          background: var(--accent);
          color: var(--bg);
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        button:hover {
          transform: scale(1.05);
          background: #7dd3fc;
        }
      </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4L4 16L16 28L28 16L16 4Z" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 10L10 16L16 22L22 16L16 10Z" fill="#38bdf8"/>
          </svg>
          AGVTY
        </div>
        <div class="nav-item active">Dashboard</div>
        <div class="nav-item">Analytics</div>
        <div class="nav-item">Settings</div>
        <div class="nav-item">Documentation</div>
        <div style="flex:1"></div>
        <div class="nav-item">Logout</div>
      </div>
      <div class="main-content">
        <header>
          <div>
            <h1>System Monitor</h1>
            <p style="color: var(--text-dim); margin-top: 4px;">Welcome back, Administrator</p>
          </div>
          <button onclick="updateStats()">Refresh</button>
        </header>
        
        <div class="grid">
          <div class="card">
            <div class="card-label">CPU Usage</div>
            <div class="card-value" id="cpu-value">24%</div>
          </div>
          <div class="card">
            <div class="card-label">RAM Usage</div>
            <div class="card-value" id="ram-value">4.2 GB</div>
          </div>
          <div class="card">
            <div class="card-label">Network</div>
            <div class="card-value" id="network-value">12.5 Mb/s</div>
          </div>
        </div>

        <div style="margin-top: 2rem;">
          <h3><span class="pulse"></span> Real-time Activity</h3>
          <div class="chart-container" id="chart">
            <div class="bar" style="height: 40%"></div>
            <div class="bar" style="height: 60%"></div>
            <div class="bar" style="height: 35%"></div>
            <div class="bar" style="height: 80%"></div>
            <div class="bar" style="height: 55%"></div>
            <div class="bar" style="height: 90%"></div>
            <div class="bar" style="height: 45%"></div>
            <div class="bar" style="height: 70%"></div>
            <div class="bar" style="height: 30%"></div>
            <div class="bar" style="height: 75%"></div>
          </div>
        </div>
      </div>

      <script>
        function updateStats() {
          const cpuValue = Math.floor(Math.random() * 40 + 10);
          const ramValue = (Math.random() * 4 + 2).toFixed(1);
          const networkValue = (Math.random() * 20 + 5).toFixed(1);
          
          document.getElementById('cpu-value').textContent = cpuValue + '%';
          document.getElementById('ram-value').textContent = ramValue + ' GB';
          document.getElementById('network-value').textContent = networkValue + ' Mb/s';
          
          const bars = document.querySelectorAll('.bar');
          bars.forEach(bar => {
            bar.style.height = Math.floor(Math.random() * 80 + 10) + '%';
          });
        }

        setInterval(updateStats, 2000);
      </script>
    </body>
    </html>
  `
}

/**
 * Main function to run premium dashboard example
 */
async function main() {
  logger.banner('Premium Dashboard Example', 'Modern UI with glassmorphism and real-time updates')

  try {
    const eventLoop = new EventLoop()
    const dashboardManager = new DashboardManager()

    logger.info('Creating main window with dark theme...')
    const window = new WindowBuilder()
      .withTitle('Antigravity Premium Dashboard')
      .withInnerSize(1200, 800)
      .withTheme(TaoTheme.Dark)
      .build(eventLoop)

    logger.success('Window created', {
      windowId: window.id,
      title: window.title(),
      size: window.innerSize()
    })

    logger.info('Creating webview with premium dashboard HTML...')
    const dashboardHtml = createDashboardHtml()

    new WebViewBuilder()
      .withHtml(dashboardHtml)
      .buildOnWindow(window, 'main-view')

    logger.success('Dashboard webview created')

    logger.section('Dashboard Features')
    logger.info('Glassmorphism effects enabled')
    logger.info('Real-time statistics updates active')
    logger.info('Interactive chart visualization')
    logger.info('Responsive sidebar navigation')

    logger.section('Starting Event Loop')
    logger.info('Press Ctrl+C to exit')

    eventLoop.run()

  } catch (error) {
    logger.error('Error executing premium dashboard example', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

main()

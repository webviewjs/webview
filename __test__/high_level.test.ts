import { describe, test, expect } from 'bun:test'
import { Application, ControlFlow, Theme, getWebviewVersion,ProgressBarStatus } from '../index'

describe('High-Level API', () => {
  test('getWebviewVersion returns a string', () => {
    const version = getWebviewVersion()
    console.log('Webview Version:', version)
    expect(typeof version).toBe('string')
  })

  test('Application instantiation', () => {
    const app = new Application({
      controlFlow: ControlFlow.Poll
    })
    expect(app).toBeDefined()
    expect(typeof app.run).toBe('function')
  })

  test('BrowserWindow creation and properties', () => {
    const app = new Application()
    const win = app.createBrowserWindow({
      title: 'High-Level Test Window',
      width: 1024,
      height: 768,
      resizable: true,
      decorations: true
    })

    expect(win).toBeDefined()
    // These might return defaults if window isn't created yet
    expect(typeof win.title).toBe('string')
    expect(win.isResizable()).toBe(true)
    expect(win.isDecorated()).toBe(true)
  })

  test('Monitor API', () => {
    const app = new Application()
    const win = app.createBrowserWindow()
    const primary = win.getPrimaryMonitor()
    if (primary) {
      expect(primary.scaleFactor).toBeGreaterThan(0)
      expect(primary.size.width).toBeGreaterThan(0)
    }
    
    const available = win.getAvailableMonitors()
    expect(Array.isArray(available)).toBe(true)
    if (available.length > 0) {
      expect(available[0].size.width).toBeGreaterThan(0)
    }
  })

  test('Window actions (setters)', () => {
    const app = new Application()
    const win = app.createBrowserWindow()
    
    win.setTitle('New Title')
    
    // Testing the merged ProgressBarState (interface + enum)
    win.setProgressBar({
      status: ProgressBarStatus.Normal,
      progress: 50
    })
  })
})

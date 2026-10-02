import { createRequire } from 'node:module';
import { expect, test } from 'bun:test';

const require = createRequire(import.meta.url);
const api = require('../../dist/index.js');
const { binding } = require('../native/harness.ts');
const symbolName = (key) => (typeof key === 'symbol' ? key.toString() : key);

function changedDescriptors(prototype, baseline) {
  const current = Object.getOwnPropertyDescriptors(prototype);
  const keys = new Set([...Reflect.ownKeys(baseline), ...Reflect.ownKeys(current)]);
  return [...keys]
    .filter((key) => {
      const before = baseline[key];
      const after = current[key];
      if (!before || !after) return true;
      return (
        before.value !== after.value ||
        before.get !== after.get ||
        before.set !== after.set ||
        before.enumerable !== after.enumerable ||
        before.configurable !== after.configurable ||
        before.writable !== after.writable
      );
    })
    .map(symbolName)
    .sort();
}

test('public class aliases remain the fake binding runtime classes', () => {
  expect(api.Application).toBe(binding.Application);
  expect(api.BrowserWindow).toBe(binding.BrowserWindow);
  expect(api.Webview).toBe(binding.Webview);
  expect(api.WebContext).toBe(binding.WebContext);
  expect(api.TrayIcon).toBe(binding.TrayIcon);
  expect(api.NativeNotification).toBe(binding.NativeNotification);
  expect(api.JsWebview).toBe(api.Webview);
  expect(api.JsWebContext).toBe(api.WebContext);
  expect(api.JsTrayIcon).toBe(api.TrayIcon);
  expect(api.JsNotification).toBe(api.NativeNotification);
  expect(api.Notification).not.toBe(api.NativeNotification);
  expect(api.Theme.Light).toBe(0);
  expect(api.VERSION).toBe(binding.VERSION);
});

test('only intended native prototype methods are augmented or replaced', () => {
  const commonEvents = [
    'addListener',
    'emit',
    'eventNames',
    'listenerCount',
    'listeners',
    'off',
    'on',
    'once',
    'rawListeners',
    'removeAllListeners',
    'removeListener',
  ];
  const expected = {
    Application: [...commonEvents, 'bind', 'onEvent', 'run', 'stop', 'whenReady', 'Symbol(Symbol.dispose)'],
    BrowserWindow: [...commonEvents, 'createWebview', 'registerProtocol', 'Symbol(Symbol.dispose)'],
    Webview: [...commonEvents, 'dispose', 'expose', 'onIpcMessage', 'Symbol(Symbol.dispose)'],
    WebContext: ['Symbol(Symbol.dispose)'],
    TrayIcon: [...commonEvents, 'Symbol(Symbol.dispose)'],
    NativeNotification: [],
  };
  const classes = {
    Application: api.Application,
    BrowserWindow: api.BrowserWindow,
    Webview: api.Webview,
    WebContext: api.WebContext,
    TrayIcon: api.TrayIcon,
    NativeNotification: api.NativeNotification,
  };

  for (const [name, Type] of Object.entries(classes)) {
    expect(changedDescriptors(Type.prototype, binding.__prototypeBaseline[name]).sort()).toEqual(expected[name].sort());
  }
});

test('public API exposes native extension methods and expected disposal hooks', () => {
  for (const method of [
    'setWindowIcon',
    'setTaskbarIcon',
    'setUndecoratedShadow',
    'getNativeHandleAnyThread',
    'setSimpleFullscreen',
    'setTabbingIdentifier',
    'setDocumentEdited',
    'setContentProtection',
    'setAlwaysOnTop',
    'setAlwaysOnBottom',
    'setDecorations',
    'setCursor',
    'setCursorVisible',
    'requestRedraw',
  ]) {
    expect(typeof api.BrowserWindow.prototype[method]).toBe('function');
  }
  for (const Type of [api.Application, api.BrowserWindow, api.Webview, api.WebContext, api.TrayIcon]) {
    expect(typeof Type.prototype[Symbol.dispose]).toBe('function');
  }
  expect(api.Notification.prototype[Symbol.dispose]).toBe(undefined);
  expect(api.Notification.permission).toBe('granted');
});

test('unsupported fake native behavior fails loudly', () => {
  const win = new api.Application().createBrowserWindow();
  expect(() => win.getNativeHandle()).toThrow(/Fake native behavior is not implemented/u);
});

test('browser window methods match the supported platform surface', () => {
  for (const method of [
    'setEnable',
    'setTaskbarIcon',
    'removeTaskbarIcon',
    'setSkipTaskbar',
    'setUndecoratedShadow',
    'getNativeHandleAnyThread',
    'simpleFullscreen',
    'setSimpleFullscreen',
    'hasShadow',
    'setHasShadow',
    'setTabbingIdentifier',
    'tabbingIdentifier',
    'isDocumentEdited',
    'setDocumentEdited',
    'getWaylandSurface',
    'setIosScaleFactor',
    'setValidOrientations',
    'setPrefersHomeIndicatorHidden',
    'setPreferredScreenEdgesDeferringSystemGestures',
    'setPrefersStatusBarHidden',
    'androidContentRect',
    'androidConfig',
  ]) {
    expect(typeof api.BrowserWindow.prototype[method]).toBe('function');
  }
  for (const method of [
    'setSystemBackdrop',
    'setBorderColor',
    'setTitleBackgroundColor',
    'setTitleTextColor',
    'setCornerPreference',
    'setOptionAsAlt',
    'optionAsAlt',
    'setBorderlessGame',
    'selectNextTab',
    'getWaylandXdgToplevel',
    'setPreferredStatusBarStyle',
    'recognizePinchGesture',
    'x11VisualId',
    'waylandAppId',
  ]) {
    expect(api.BrowserWindow.prototype[method]).toBe(undefined);
  }
});

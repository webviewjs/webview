import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const requireFromTest = createRequire(import.meta.url);
const nativeBinding = requireFromTest('../js-bindings.js');
const prototypeSignatures = new Map(
  ['Application', 'BrowserWindow', 'Webview', 'WebContext', 'TrayIcon'].map((name) => [
    name,
    Object.getOwnPropertyDescriptors(nativeBinding[name].prototype),
  ]),
);
const webviewjs = requireFromTest('../dist/index.js');

const { Application, BrowserWindow, Notification, SerializationError, TrayIcon, WebContext, Webview } = webviewjs;

const flush = () => new Promise((resolve) => setImmediate(resolve));

function protocolWindow() {
  let window;
  const native = {
    completed: [],
    callbacks: new Map(),
    preventCalls: 0,
    disposed: false,
    _onWindowEvent(callback) {
      this.windowEventCallback = callback;
    },
    _preventClose() {
      this.preventCalls += 1;
      return true;
    },
    hide() {
      this.hidden = true;
    },
    _registerProtocol(_name, callback) {
      this.callbacks.set(_name, callback);
      window.callback = callback;
    },
    _completeProtocol(id, response) {
      this.completed.push([id, response]);
    },
    isDisposed() {
      return this.disposed;
    },
    dispose() {
      this.disposed = true;
    },
  };
  window = BrowserWindow.fromNative(native);
  for (const property of ['completed', 'callbacks', 'preventCalls', 'windowEventCallback', 'hidden']) {
    Object.defineProperty(window, property, { get: () => native[property] });
  }
  return window;
}

function protocolRequest(id, overrides = {}) {
  return {
    id,
    url: 'app://localhost/index.html',
    method: 'GET',
    headers: [],
    body: Buffer.alloc(0),
    ...overrides,
  };
}

function exposedWebview() {
  const native = {
    scripts: [],
    disposed: false,
    isDisposed() {
      return this.disposed;
    },
    dispose() {
      this.disposed = true;
    },
    onIpcMessage(callback) {
      this.ipcCallback = callback;
    },
    _exposeInternal(name, statics, functions) {
      this.exposed = { name, statics, functions };
    },
    emitExposeCall(call) {
      this.ipcCallback({
        body: Buffer.from(JSON.stringify({ __e: true, ...call })),
      });
    },
    evaluateScript(script) {
      this.scripts.push(script);
    },
  };
  const webview = Webview.fromNative(native);
  Object.defineProperties(webview, {
    scripts: { get: () => native.scripts },
    ipcCallback: { get: () => native.ipcCallback },
    exposed: { get: () => native.exposed },
    emitExposeCall: {
      value: (call) => native.emitExposeCall(call),
    },
  });
  return webview;
}

function eventApplication() {
  const native = {
    ready: false,
    onEvent(callback) {
      this.applicationEventCallback = callback;
    },
    isReady() {
      return this.ready;
    },
    pumpEvents() {
      return !this.exited;
    },
    exit() {
      this.exited = true;
    },
    runSync() {},
    createWebContext() {
      throw new Error('not used in this test');
    },
    createTrayIcon() {
      throw new Error('not used in this test');
    },
    createBrowserWindow() {
      throw new Error('not used in this test');
    },
    createChildBrowserWindow() {
      throw new Error('not used in this test');
    },
    setMenu() {},
  };
  const app = Application.fromNative(native);
  Object.defineProperty(app, 'applicationEventCallback', { get: () => native.applicationEventCallback });
  return app;
}

test('Application dispatches native events through named EventEmitter events', () => {
  const app = eventApplication();
  const received = [];

  Application.prototype.on.call(app, 'window-close-requested', (event) => received.push(['window', event]));
  Application.prototype.on.call(app, 'application-close-requested', (event) => received.push(['application', event]));
  Application.prototype.on.call(app, 'custom-menu-click', (event) => received.push(['menu', event]));

  const windowEvent = { event: 'window-close-requested' };
  const applicationEvent = { event: 'application-close-requested' };
  const menuEvent = { event: 'custom-menu-click', customMenuEvent: { id: 'save', windowId: 7 } };
  app.applicationEventCallback(windowEvent);
  app.applicationEventCallback(applicationEvent);
  app.applicationEventCallback(menuEvent);

  assert.deepEqual(received, [
    ['window', windowEvent],
    ['application', applicationEvent],
    ['menu', menuEvent],
  ]);
});

test('Application EventEmitter methods are chainable and removable', () => {
  const app = eventApplication();
  const listener = () => {};

  assert.equal(Application.prototype.on.call(app, 'window-close-requested', listener), app);
  assert.equal(Application.prototype.off.call(app, 'window-close-requested', listener), app);
  assert.equal(Application.prototype.listenerCount.call(app, 'window-close-requested'), 0);
});

test('Application run is idempotent, respects ref, and stop clears its timer', () => {
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const timers = [];
  globalThis.setInterval = (callback, interval) => {
    const timer = {
      callback,
      interval,
      unrefCalls: 0,
      cleared: false,
      unref() {
        this.unrefCalls += 1;
      },
    };
    timers.push(timer);
    return timer;
  };
  globalThis.clearInterval = (timer) => {
    timer.cleared = true;
  };

  try {
    const app = eventApplication();
    app.run({ interval: 24, ref: false });
    app.run({ interval: 5, ref: true });
    assert.equal(timers.length, 1);
    assert.equal(timers[0].interval, 24);
    assert.equal(timers[0].unrefCalls, 1);

    app.stop();
    app.stop();
    assert.equal(timers[0].cleared, true);
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test('Application whenReady auto-runs with defaults and stops after native exit', async () => {
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const timers = [];
  globalThis.setInterval = (callback, interval) => {
    const timer = {
      callback,
      interval,
      unrefCalls: 0,
      cleared: false,
      unref() {
        this.unrefCalls += 1;
      },
    };
    timers.push(timer);
    return timer;
  };
  globalThis.clearInterval = (timer) => {
    timer.cleared = true;
  };

  try {
    const app = eventApplication();
    const ready = app.whenReady();
    assert.equal(timers.length, 1);
    assert.equal(timers[0].interval, 16);
    assert.equal(timers[0].unrefCalls, 0);
    app.applicationEventCallback({ event: 'ready' });
    await ready;

    app.exit();
    timers[0].callback();
    assert.equal(timers[0].cleared, true);
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test('BrowserWindow forwards stable native event names through one EventEmitter adapter', () => {
  const window = protocolWindow();
  const received = [];
  const listener = (event) => received.push(event);

  assert.equal(BrowserWindow.prototype.on.call(window, 'resize', listener), window);
  window.windowEventCallback({ event: 'resize', width: 800, height: 600 });
  assert.deepEqual(received, [{ event: 'resize', width: 800, height: 600 }]);
  assert.equal(BrowserWindow.prototype.listenerCount.call(window, 'resize'), 1);
  assert.equal(BrowserWindow.prototype.off.call(window, 'resize', listener), window);
  assert.equal(BrowserWindow.prototype.listenerCount.call(window, 'resize'), 0);
});

test('BrowserWindow close events support synchronous cancellation', () => {
  const window = protocolWindow();
  const observed = [];

  BrowserWindow.prototype.on.call(window, 'close', (event) => {
    observed.push([event.event, event.defaultPrevented]);
    event.preventDefault();
    observed.push(event.defaultPrevented);
    event.preventDefault();
  });

  window.windowEventCallback({ event: 'close' });

  assert.deepEqual(observed, [['close', false], true]);
  assert.equal(window.preventCalls, 1);
});

test('BrowserWindow close events remain compatible without preventDefault', () => {
  const window = protocolWindow();
  let received;

  BrowserWindow.prototype.on.call(window, 'close', (event) => {
    received = event;
  });

  window.windowEventCallback({ event: 'close' });

  assert.equal(received.event, 'close');
  assert.equal(received.defaultPrevented, false);
  assert.equal(window.preventCalls, 0);
});

test('BrowserWindow close cancellation follows listener ordering and resets', () => {
  const window = protocolWindow();
  const observed = [];
  let preventNext = true;
  let retained;

  BrowserWindow.prototype.on.call(window, 'close', (event) => {
    retained ??= event;
    observed.push(['first', event.defaultPrevented]);
    if (preventNext) {
      event.preventDefault();
      preventNext = false;
    }
  });
  BrowserWindow.prototype.on.call(window, 'close', (event) => {
    observed.push(['second', event.defaultPrevented]);
  });

  window.windowEventCallback({ event: 'close' });
  window.windowEventCallback({ event: 'close' });
  retained.preventDefault();

  assert.deepEqual(observed, [
    ['first', false],
    ['second', true],
    ['first', false],
    ['second', false],
  ]);
  assert.equal(window.preventCalls, 1);
});

test('BrowserWindow close cancellation permits reentrant hide calls', () => {
  const window = protocolWindow();

  BrowserWindow.prototype.on.call(window, 'close', (event) => {
    event.preventDefault();
    window.hide();
  });

  assert.doesNotThrow(() => window.windowEventCallback({ event: 'close' }));
  assert.equal(window.hidden, true);
});

test('loading the public package leaves generated NAPI class prototypes untouched', () => {
  for (const [name, descriptors] of prototypeSignatures) {
    assert.deepEqual(Object.getOwnPropertyDescriptors(nativeBinding[name].prototype), descriptors, name);
  }
  assert.notEqual(BrowserWindow, nativeBinding.BrowserWindow);
  assert.notEqual(Application, nativeBinding.Application);
  assert.notEqual(Webview, nativeBinding.Webview);
  assert.notEqual(WebContext, nativeBinding.WebContext);
  assert.notEqual(TrayIcon, nativeBinding.TrayIcon);
  assert.equal(webviewjs.JsWebview, Webview);
  assert.equal(webviewjs.JsWebContext, WebContext);
  assert.equal(webviewjs.JsTrayIcon, TrayIcon);
  assert.equal(webviewjs.JsNotification, webviewjs.NativeNotification);
});

test('TrayIcon forwards native tray events through the shared EventEmitter adapter', () => {
  const native = {
    _onTrayEvent(callback) {
      this.trayEventCallback = callback;
    },
    isDisposed() {
      return false;
    },
    dispose() {},
  };
  const tray = TrayIcon.fromNative(native);
  Object.defineProperty(tray, 'trayEventCallback', { get: () => native.trayEventCallback });
  const received = [];

  TrayIcon.prototype.once.call(tray, 'click', (event) => received.push(event));
  tray.trayEventCallback({ event: 'click', id: 'tray', x: 1, y: 2 });
  tray.trayEventCallback({ event: 'click', id: 'tray', x: 3, y: 4 });

  assert.deepEqual(received, [{ event: 'click', id: 'tray', x: 1, y: 2 }]);
});

test('Application whenReady starts the event pump by default', async () => {
  const app = eventApplication();
  app.isReady = () => false;
  const runOptions = [];
  app.run = (options) => runOptions.push(options);

  const ready = Application.prototype.whenReady.call(app, { interval: 32, ref: false });

  app.applicationEventCallback({ event: 'ready' });
  await ready;

  assert.deepEqual(runOptions, [{ interval: 32, ref: false }]);
});

test('Application whenReady resolves asynchronously when already ready', async () => {
  const app = eventApplication();
  app.isReady = () => true;
  app.run = () => {};
  let synchronous = true;

  const ready = Application.prototype.whenReady.call(app).then(() => {
    assert.equal(synchronous, false);
  });
  synchronous = false;
  await ready;
});

test('Application whenReady supports manual pumping with autoRun false', async () => {
  const app = eventApplication();
  app.isReady = () => false;
  app.run = () => assert.fail('run should not be called');

  const ready = Application.prototype.whenReady.call(app, { autoRun: false });
  app.applicationEventCallback({ event: 'ready' });

  await ready;
});

test('Application whenReady rejects run options when autoRun is false', () => {
  const app = eventApplication();
  app.isReady = () => false;
  app.run = () => {};

  assert.throws(
    () => Application.prototype.whenReady.call(app, { autoRun: false, interval: 10 }),
    /interval.*autoRun/i,
  );
  assert.throws(() => Application.prototype.whenReady.call(app, { autoRun: false, ref: false }), /ref.*autoRun/i);
});

test('Application dispose exits the native application', () => {
  const app = eventApplication();
  app[Symbol.dispose]();
  assert.equal(app.pumpEvents(), false);
});

test('createWebview forwards navigationHandler and uses its decision', async () => {
  const creations = [];
  const nativeWindow = {
    isDisposed: () => false,
    dispose() {},
    _onWindowEvent() {},
    createWebview(options, webContext, eventHandler, navigationHandler, newWindowHandler) {
      const url = 'app://blocked';
      const creation = {
        options,
        webContext,
        eventHandler,
        newWindowHandler,
        navigationAllowed: navigationHandler?.(url) ?? true,
      };
      creations.push(creation);
      return {
        dispose() {},
        isDisposed: () => false,
        onIpcMessage() {},
        _exposeInternal() {},
        evaluateScript() {},
      };
    },
  };
  const nativeContext = {
    dataDirectory: '/profile',
    isCustomProtocolRegistered: () => false,
    setAllowsAutomation() {},
    dispose() {},
    isDisposed: () => false,
  };
  const context = WebContext.fromNative(nativeContext);
  const window = BrowserWindow.fromNative(nativeWindow);
  const navigationUrls = [];

  const firstWebview = window.createWebview({
    url: 'app://first',
    webContext: context,
    navigationHandler(url) {
      navigationUrls.push(url);
      return false;
    },
    newWindowHandler: () => true,
  });
  const secondWebview = window.createWebview({
    url: 'app://second',
    navigationHandler() {
      return true;
    },
  });

  assert.deepEqual(navigationUrls, ['app://blocked']);
  assert.equal(creations[0].navigationAllowed, false);
  assert.equal(creations[1].navigationAllowed, true);
  assert.equal(creations[0].webContext, nativeContext);
  assert.deepEqual(creations[0].options, { url: 'app://first' });
  assert.equal(typeof creations[0].newWindowHandler, 'function');
  assert.equal(creations[0].newWindowHandler({ event: 'new-window', url: 'app://popup' }), true);
  assert.equal(creations[1].webContext, null);

  const firstEvents = [];
  const secondEvents = [];
  firstWebview.on('navigation', (event) => firstEvents.push(event));
  secondWebview.on('navigation', (event) => secondEvents.push(event));
  creations[0].eventHandler(null, { event: 'navigation', url: 'app://first' });
  creations[1].eventHandler(null, { event: 'navigation', url: 'app://second' });

  assert.deepEqual(firstEvents, [{ event: 'navigation', url: 'app://first' }]);
  assert.deepEqual(secondEvents, [{ event: 'navigation', url: 'app://second' }]);
});

test('closing the final window runs the same native resource cleanup as app.exit()', async () => {
  const source = await readFile(new URL('../src/app.rs', import.meta.url), 'utf8');

  assert.match(source, /fn begin_close_window\(&mut self, window_id: WindowId\)/);
  assert.match(source, /fn finish_destroyed_window\(&mut self, window_id: WindowId\)/);
  assert.match(source, /fn finalize_shutdown\(&mut self\)/);
  assert.match(source, /WindowEvent::Destroyed =>/);
  assert.match(source, /pub fn exit\(&mut self\) \{[\s\S]*?begin_close_window/);
});

test('BrowserWindow exposes the complete Windows extension surface', () => {
  for (const method of [
    'setEnable',
    'setTaskbarIcon',
    'removeTaskbarIcon',
    'setSkipTaskbar',
    'setUndecoratedShadow',
    'getNativeHandleAnyThread',
  ]) {
    assert.equal(typeof BrowserWindow.prototype[method], 'function', method);
  }

  for (const method of [
    'setSystemBackdrop',
    'setBorderColor',
    'setTitleBackgroundColor',
    'setTitleTextColor',
    'setCornerPreference',
  ]) {
    assert.equal(BrowserWindow.prototype[method], undefined, method);
  }
});

test('BrowserWindow exposes cross-platform extension methods', () => {
  for (const method of [
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
    assert.equal(typeof BrowserWindow.prototype[method], 'function', method);
  }

  for (const method of [
    'setOptionAsAlt',
    'optionAsAlt',
    'setBorderlessGame',
    'isBorderlessGame',
    'selectNextTab',
    'selectPreviousTab',
    'selectTabAtIndex',
    'numTabs',
    'getWaylandXdgToplevel',
    'setPreferredStatusBarStyle',
    'recognizePinchGesture',
    'recognizePanGesture',
    'recognizeDoubletapGesture',
    'recognizeRotationGesture',
  ]) {
    assert.equal(BrowserWindow.prototype[method], undefined, method);
  }
});

test('generated BrowserWindowOptions include platform creation attributes', async () => {
  const declarations = await readFile(new URL('../js-bindings.d.ts', import.meta.url), 'utf8');

  for (const option of [
    'windowsTaskbarIcon',
    'macosMovableByWindowBackground',
    'macosTitlebarTransparent',
    'iosScaleFactor',
    'iosValidOrientations',
  ]) {
    assert.match(declarations, new RegExp(`\\b${option}\\??:`), option);
  }

  for (const option of [
    'windowsSystemBackdrop',
    'windowsClipChildren',
    'windowsBorderColor',
    'windowsTitleBackgroundColor',
    'windowsTitleTextColor',
    'windowsCornerPreference',
    'macosAcceptsFirstMouse',
    'macosOptionAsAlt',
    'macosBorderlessGame',
    'x11VisualId',
    'x11Screen',
    'x11GeneralName',
    'x11InstanceName',
    'x11OverrideRedirect',
    'x11WindowTypes',
    'x11BaseWidth',
    'x11BaseHeight',
    'x11EmbedParentWindow',
    'waylandAppId',
    'waylandInstance',
    'iosStatusBarStyle',
  ]) {
    assert.doesNotMatch(declarations, new RegExp(`\\b${option}\\??:`), option);
  }
});

test('BrowserWindow delegates supported platform behavior to Tao and Muda', async () => {
  const windowSource = await readFile(new URL('../src/browser_window.rs', import.meta.url), 'utf8');
  const menuSource = await readFile(new URL('../src/menu.rs', import.meta.url), 'utf8');
  const typesSource = await readFile(new URL('../src/types.rs', import.meta.url), 'utf8');

  assert.match(windowSource, /self\.window\(\)\.set_progress_bar\(/);
  assert.match(windowSource, /self\.window\(\)\.monitor_from_point\(x, y\)/);
  assert.match(windowSource, /WindowExtIOS/);
  assert.match(windowSource, /WindowBuilderExtIOS/);
  assert.match(windowSource, /pub fn get_wayland_surface/);
  assert.match(windowSource, /tao::rwh_06::\{HasWindowHandle, RawWindowHandle\}/);
  assert.match(windowSource, /self\.window\(\)\.set_is_document_edited\(edited\)/);
  assert.doesNotMatch(windowSource, /tao::platform::(?:x11|wayland)/);
  assert.doesNotMatch(
    windowSource,
    /self\.window\.(?:select_next_tab|select_previous_tab|select_tab_at_index|num_tabs)\(/,
  );
  assert.doesNotMatch(typesSource, /pub x11_|pub wayland_/);
  assert.match(
    typesSource,
    /pub struct AndroidContentRect \{\s+pub left: u32,\s+pub top: u32,\s+pub right: u32,\s+pub bottom: u32,/,
  );
  assert.match(menuSource, /menu[\s\S]*?\.init_for_gtk_window\(window\.gtk_window\(\), window\.default_vbox\(\)\)/);
});

test('Application and TrayIcon expose the system tray API', () => {
  assert.equal(typeof Application.prototype.createTrayIcon, 'function');
  assert.equal(typeof TrayIcon, 'function');

  for (const method of [
    'setIcon',
    'removeIcon',
    'setMenu',
    'setTooltip',
    'setTitle',
    'setVisible',
    'setIconAsTemplate',
    'setShowMenuOnLeftClick',
    'setShowMenuOnRightClick',
    'showMenu',
    'rect',
    'dispose',
    'on',
    'once',
    'off',
  ]) {
    assert.equal(typeof TrayIcon.prototype[method], 'function', method);
  }
});

test('Notification exposes browser-compatible permission and EventEmitter APIs', async () => {
  assert.equal(Notification.permission, 'granted');
  assert.equal(await Notification.requestPermission(), 'granted');

  for (const method of [
    'close',
    'on',
    'once',
    'off',
    'addListener',
    'removeListener',
    'removeAllListeners',
    'listenerCount',
    'listeners',
    'rawListeners',
    'emit',
    'eventNames',
  ]) {
    assert.equal(typeof Notification.prototype[method], 'function', method);
  }

  for (const property of [
    'title',
    'body',
    'icon',
    'image',
    'badge',
    'tag',
    'data',
    'dir',
    'lang',
    'renotify',
    'requireInteraction',
    'persistent',
    'actions',
    'silent',
    'timestamp',
    'vibrate',
    'onclick',
    'onclose',
    'onerror',
    'onshow',
  ]) {
    assert.ok(Object.getOwnPropertyDescriptor(Notification.prototype, property), property);
  }

  assert.throws(
    () =>
      new Notification('Invalid actions', {
        actions: [{ action: 'open', title: 'Open' }],
      }),
    /persistent/i,
  );
});

test('native notifications are isolated and mobile-safe', async () => {
  const source = await readFile(new URL('../src/notifications.rs', import.meta.url), 'utf8');
  const library = await readFile(new URL('../src/lib.rs', import.meta.url), 'utf8');
  const wrapper = await readFile(new URL('../lib/notification.ts', import.meta.url), 'utf8');
  const wrapperTypes = await readFile(new URL('../lib/notification.ts', import.meta.url), 'utf8');

  assert.match(library, /pub mod notifications;/);
  assert.match(source, /notify_rust::Notification/);
  assert.match(source, /target_os = "android"/);
  assert.match(source, /target_os = "ios"/);
  assert.match(source, /NotificationEventPayload/);
  assert.match(source, /windows_notifications_enabled/);
  assert.match(source, /Windows notifications are disabled in system settings/);
  assert.match(source, /NativeNotificationAction/);
  assert.match(source, /notification\.action\(&action\.action, &action\.title\)/);
  assert.doesNotMatch(source, /\.action\("default", ""\)/);
  assert.match(source, /Some\(String::new\(\)\)/);
  assert.match(source, /image::load_from_memory/);
  assert.match(source, /notification\.image_data/);
  assert.match(source, /TemporaryNotificationImage/);
  assert.match(wrapper, /Buffer\.isBuffer\(options\.image\)/);
  assert.match(wrapper, /imageData:/);
  assert.match(wrapperTypes, /image\?: string \| Buffer/);
  assert.match(wrapper, /\(error: Error \| null, payload: NotificationEventPayload\) =>/);
});

test('Notification converts native events and supports EventEmitter plus DOM handlers', () => {
  const bindingModule = requireFromTest('../dist/internal/native-binding.js');
  const originalNativeNotification = bindingModule.nativeBinding.NativeNotification;
  let nativeNotification;
  class MockNativeNotification {
    constructor(options, callback) {
      this.options = options;
      this.callback = callback;
      nativeNotification = this;
    }
    close() {}
  }
  bindingModule.nativeBinding.NativeNotification = MockNativeNotification;

  try {
    const notification = new Notification('Title', {
      image: Buffer.from('image'),
      persistent: true,
      actions: [{ action: 'open', title: 'Open' }],
    });
    const received = [];
    notification.on('click', (event) => received.push(['emitter', event]));
    notification.onclick = (event) => received.push(['dom', event]);
    nativeNotification.callback(null, { event: 'click', action: 'open' });

    assert.equal(nativeNotification.options.imageData.toString(), 'image');
    assert.equal(nativeNotification.options.actions[0].action, 'open');
    assert.equal(received.length, 2);
    assert.equal(received[0][1], received[1][1]);
    assert.equal(received[0][1].target, notification);
    assert.equal(received[0][1].type, 'click');
    assert.equal(received[0][1].action, 'open');

    let nativeError;
    notification.on('error', () => {});
    notification.onerror = (event) => {
      nativeError = event.error;
    };
    nativeNotification.callback(new Error('native failure'), undefined);
    assert.equal(nativeError.message, 'native failure');
  } finally {
    bindingModule.nativeBinding.NativeNotification = originalNativeNotification;
  }
});

test('root-created wrappers expose explicit disposal', () => {
  for (const type of [BrowserWindow, Webview, WebContext, TrayIcon]) {
    assert.equal(typeof type.prototype.dispose, 'function', `${type.name}.dispose`);
  }
});

test('tray example retains its icon and demonstrates close-to-tray behavior', async () => {
  const source = await readFile(new URL('../examples/tray.mjs', import.meta.url), 'utf8');

  assert.match(source, /let tray;/);
  assert.match(source, /await app\.whenReady\(\);[\s\S]*tray = app\.createTrayIcon/);
  assert.match(source, /window\.on\('close', \(event\) => \{[\s\S]*event\.preventDefault\(\)/);
  assert.doesNotMatch(source, /app\.run\(/);
});

test('README uses standard responses, EventEmitter events, and strong-reference guidance', async () => {
  const source = await readFile(new URL('../README.md', import.meta.url), 'utf8');

  assert.match(source, /return new Response\(/);
  assert.match(source, /app\.on\('custom-menu-click'/);
  assert.match(source, /Keep strong references/);
  assert.match(source, /BrowserWindow.*Webview.*TrayIcon/s);
  assert.doesNotMatch(source, /app\.(?:bind|onEvent)\(/);
});

test('webview event callback handles the ThreadsafeFunction error-first signature', async () => {
  const source = await readFile(new URL('../lib/browser-window.ts', import.meta.url), 'utf8');

  assert.match(source, /const eventHandler = \(error: Error \| null, payload: WebviewEventPayload\)/);
  assert.match(source, /if \(error\) \{\s+throw error;/);
  assert.doesNotMatch(source, /_setPendingWebview(?:EventCallback|NavigationHandler)|_clearPendingWebviewHandlers/);
});

test('created webviews receive callbacks directly instead of pending handlers', async () => {
  const source = await readFile(new URL('../src/browser_window.rs', import.meta.url), 'utf8');
  const webviewSource = await readFile(new URL('../src/webview.rs', import.meta.url), 'utf8');

  assert.match(source, /event_handler: Option<WebviewEventThreadsafeFunction>/);
  assert.match(source, /navigation_handler: Option<FunctionRef<String, bool>>/);
  assert.doesNotMatch(source, /pending_webview_event_handler|pending_nav_handler|_setPendingWebview/);

  const newWindowHandler = webviewSource.slice(
    webviewSource.indexOf('// ── New window request handler'),
    webviewSource.indexOf('// ── Custom protocols'),
  );
  assert.match(newWindowHandler, /call_bool_handler\(&nav_rc, env_c, url\)/);
  assert.match(newWindowHandler, /NewWindowResponse::Deny/);
});

test('generated declarations match the direct callback and transport plumbing', async () => {
  const declarations = await readFile(new URL('../js-bindings.d.ts', import.meta.url), 'utf8');

  assert.match(declarations, /_registerProtocol\(name: string, handler: \(arg: ProtocolRequest\) => void\)/);
  assert.match(declarations, /eventHandler\?: WebviewEventThreadsafeFunction/);
  assert.match(declarations, /navigationHandler\?: \(\(arg: string\) => boolean\)/);
  assert.match(declarations, /_exposeInternal\(name: string, staticsJson: string, funcNames: Array<string>\)/);
  assert.doesNotMatch(declarations, /_setPendingWebview|_clearPendingWebview/);
  assert.doesNotMatch(declarations, /handler: \(arg: ExposeCallData\)/);
});

test('registerProtocol completes an asynchronous handler response', async () => {
  const win = protocolWindow();
  let receivedRequest;

  BrowserWindow.prototype.registerProtocol.call(win, 'app', async (request) => {
    receivedRequest = request;
    return {
      statusCode: 200,
      body: Buffer.from(request.url),
      mimeType: 'text/plain',
    };
  });

  win.callback(protocolRequest(9));
  await flush();

  assert.equal(receivedRequest.url, 'app://localhost/index.html');
  assert.equal(receivedRequest.method, 'GET');
  assert.deepEqual([...receivedRequest.headers], []);
  assert.equal(receivedRequest.body, null);
  assert.deepEqual(win.completed, [
    [
      9,
      {
        statusCode: 200,
        body: Buffer.from('app://localhost/index.html'),
        mimeType: 'text/plain',
      },
    ],
  ]);
});

test('registerProtocol does not complete after its window is disposed', async () => {
  const win = protocolWindow();
  let finish;
  win.registerProtocol(
    'app',
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );

  win.callback(protocolRequest(18));
  await flush();
  win.dispose();
  finish({ body: Buffer.from('late') });
  await flush();

  assert.deepEqual(win.completed, []);
});

test('registerProtocol maps a rejected asynchronous handler to a text 500 response', async () => {
  const win = protocolWindow();

  BrowserWindow.prototype.registerProtocol.call(win, 'app', async () => {
    throw new Error('read failed');
  });

  win.callback(protocolRequest(10, { url: 'app://localhost/missing' }));
  await flush();

  assert.equal(win.completed[0][0], 10);
  assert.equal(win.completed[0][1].statusCode, 500);
  assert.equal(win.completed[0][1].mimeType, 'text/plain');
  assert.equal(win.completed[0][1].body.toString(), 'read failed');
});

test('registerProtocol maps synchronous handler throws to a text 500 response', async () => {
  const win = protocolWindow();

  BrowserWindow.prototype.registerProtocol.call(win, 'app', () => {
    throw new Error('sync failed');
  });

  win.callback(protocolRequest(11));
  await flush();

  assert.equal(win.completed[0][0], 11);
  assert.equal(win.completed[0][1].statusCode, 500);
  assert.equal(win.completed[0][1].body.toString(), 'sync failed');
});

test('registerProtocol forwards POST bodies and request headers', async () => {
  const win = protocolWindow();
  let receivedRequest;

  BrowserWindow.prototype.registerProtocol.call(win, 'app', async (request) => {
    receivedRequest = request;
    return { body: Buffer.from('ok') };
  });

  win.callback(
    protocolRequest(12, {
      method: 'POST',
      headers: [
        { key: 'Content-Type', value: 'application/octet-stream' },
        { key: 'X-Request', value: 'yes' },
      ],
      body: Buffer.from([0, 255, 1]),
    }),
  );
  await flush();

  assert.equal(receivedRequest.method, 'POST');
  assert.equal(receivedRequest.headers.get('content-type'), 'application/octet-stream');
  assert.equal(receivedRequest.headers.get('x-request'), 'yes');
  assert.deepEqual(Buffer.from(await receivedRequest.arrayBuffer()), Buffer.from([0, 255, 1]));
});

test('registerProtocol leaves GET and HEAD requests bodyless', async () => {
  const win = protocolWindow();
  const requests = [];

  BrowserWindow.prototype.registerProtocol.call(win, 'app', async (request) => {
    requests.push(request);
    return { body: Buffer.alloc(0) };
  });

  win.callback(protocolRequest(13, { method: 'GET', body: Buffer.from('ignored') }));
  win.callback(protocolRequest(14, { method: 'HEAD', body: Buffer.from('ignored') }));
  await flush();

  assert.deepEqual(
    requests.map((request) => [request.method, request.body]),
    [
      ['GET', null],
      ['HEAD', null],
    ],
  );
});

test('registerProtocol converts Response headers and binary bodies', async () => {
  const win = protocolWindow();

  BrowserWindow.prototype.registerProtocol.call(win, 'app', async () => {
    return new Response(new Uint8Array([0, 255, 2]), {
      status: 206,
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Response': 'yes',
      },
    });
  });

  win.callback(protocolRequest(15));
  await flush();

  assert.equal(win.completed[0][1].statusCode, 206);
  assert.equal(win.completed[0][1].mimeType, 'application/octet-stream');
  assert.deepEqual(win.completed[0][1].body, Buffer.from([0, 255, 2]));
  assert.deepEqual(win.completed[0][1].headers, [{ key: 'x-response', value: 'yes' }]);
});

test('registered protocols share concurrent dispatch without crossing responses', async () => {
  const win = protocolWindow();
  const seen = [];

  BrowserWindow.prototype.registerProtocol.call(win, 'app', async (request) => {
    await flush();
    seen.push(['app', request.url]);
    return { body: Buffer.from('app') };
  });
  BrowserWindow.prototype.registerProtocol.call(win, 'asset', async (request) => {
    seen.push(['asset', request.url]);
    return { body: Buffer.from('asset') };
  });

  win.callbacks.get('app')(protocolRequest(16, { url: 'app://one' }));
  win.callbacks.get('asset')(protocolRequest(17, { url: 'asset://two' }));
  await flush();
  await flush();

  assert.deepEqual(seen, [
    ['asset', 'asset://two'],
    ['app', 'app://one'],
  ]);
  assert.deepEqual(
    win.completed.map(([id, response]) => [id, response.body.toString()]),
    [
      [17, 'asset'],
      [16, 'app'],
    ],
  );
});

test('expose rejects circular static values with SerializationError', () => {
  const webview = exposedWebview();
  const circular = {};
  circular.self = circular;

  assert.throws(() => Webview.prototype.expose.call(webview, 'native', { circular }), SerializationError);
});

test('expose rejects a duplicate namespace at registration time', () => {
  const webview = exposedWebview();

  Webview.prototype.expose.call(webview, 'native', { first: true });

  assert.throws(() => Webview.prototype.expose.call(webview, 'native', { second: true }), /already registered/);
});

test('expose validates identifiers and targets and keeps target this binding', async () => {
  const webview = exposedWebview();
  assert.throws(() => Webview.prototype.expose.call(webview, 'not-valid', {}), /identifier/);
  assert.throws(() => Webview.prototype.expose.call(webview, 'native', null), /target/);

  const target = {
    prefix: 'hello ',
    greet(name) {
      return this.prefix + name;
    },
  };
  Webview.prototype.expose.call(webview, 'native', target);
  assert.deepEqual(JSON.parse(webview.exposed.statics), { prefix: 'hello ' });
  assert.deepEqual(webview.exposed.functions, ['greet']);
  webview.emitExposeCall({ ns: 'native', method: 'greet', id: 19, args: ['Ada'] });
  await flush();
  assert.match(webview.scripts.at(-1), /resolve\(19,"hello Ada"\)/);
});

test('expose resolves asynchronous Node functions in the page bridge', async () => {
  const webview = exposedWebview();

  Webview.prototype.expose.call(webview, 'native', { answer: async () => 42, isCool: true });
  webview.emitExposeCall({ ns: 'native', method: 'answer', id: 1, args: [] });
  await flush();

  assert.match(webview.scripts.at(-1), /resolve\(1,42\)/);
});

test('expose dispatches synchronous functions through the generic IPC transport', async () => {
  const webview = exposedWebview();

  Webview.prototype.expose.call(webview, 'native', {
    add(a, b) {
      return a + b;
    },
  });
  webview.emitExposeCall({ ns: 'native', method: 'add', id: 3, args: [2, 4] });
  await flush();

  assert.match(webview.scripts.at(-1), /resolve\(3,6\)/);
});

test('expose reports rejected methods back to the page', async () => {
  const webview = exposedWebview();

  Webview.prototype.expose.call(webview, 'native', {
    fail: async () => {
      throw new Error('method failed');
    },
  });
  webview.emitExposeCall({ ns: 'native', method: 'fail', id: 4, args: [] });
  await flush();

  assert.match(webview.scripts.at(-1), /method failed/);
  assert.match(webview.scripts.at(-1), /reject\(4/);
});

test('expose reports malformed arguments as SerializationError', async () => {
  const webview = exposedWebview();

  Webview.prototype.expose.call(webview, 'native', { method: () => true });
  webview.emitExposeCall({ ns: 'native', method: 'method', id: 5, args: { invalid: true } });
  await flush();

  assert.match(webview.scripts.at(-1), /SerializationError/);
});

test('expose leaves generic IPC messages with the user handler', async () => {
  const webview = exposedWebview();
  const received = [];

  Webview.prototype.onIpcMessage.call(webview, (message) => received.push(message));
  Webview.prototype.expose.call(webview, 'native', { method: () => true });

  const genericMessage = { body: Buffer.from('not an expose call') };
  webview.ipcCallback(genericMessage);
  webview.emitExposeCall({ ns: 'native', method: 'method', id: 6, args: [] });
  await flush();

  assert.deepEqual(received, [genericMessage]);
  assert.match(webview.scripts.at(-1), /resolve\(6,true\)/);
});

test('expose still works after clearing a user IPC handler', async () => {
  const webview = exposedWebview();

  Webview.prototype.onIpcMessage.call(webview, () => {});
  Webview.prototype.onIpcMessage.call(webview, null);
  Webview.prototype.onIpcMessage.call(webview, () => {});
  Webview.prototype.expose.call(webview, 'native', { answer: () => 7 });
  webview.emitExposeCall({ ns: 'native', method: 'answer', id: 7, args: [] });
  await flush();

  assert.match(webview.scripts.at(-1), /resolve\(7,7\)/);
});

test('expose and IPC methods reject disposed webviews', () => {
  const webview = Webview.fromNative({
    isDisposed: () => true,
    dispose() {},
    onIpcMessage() {},
    _exposeInternal() {},
    evaluateScript() {},
  });

  assert.throws(() => Webview.prototype.expose.call(webview, 'native', {}), /disposed/);
  assert.throws(() => Webview.prototype.onIpcMessage.call(webview, () => {}), /disposed/);
});

test('expose ignores pending results after Webview disposal', async () => {
  const webview = exposedWebview();
  let finish;
  Webview.prototype.expose.call(webview, 'native', {
    pending: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  webview.emitExposeCall({ ns: 'native', method: 'pending', id: 20, args: [] });
  await flush();
  webview.dispose();
  finish('late');
  await flush();
  assert.deepEqual(webview.scripts, []);
});

test('expose sends a SerializationError name to the page for non-serializable results', async () => {
  const webview = exposedWebview();

  Webview.prototype.expose.call(webview, 'native', { broken: () => 1n });
  webview.emitExposeCall({ ns: 'native', method: 'broken', id: 2, args: [] });
  await flush();

  assert.match(webview.scripts.at(-1), /SerializationError/);
});

test('expose example uses an app protocol instead of a file origin for IPC', async () => {
  const source = await readFile(new URL('../examples/expose.mjs', import.meta.url), 'utf8');

  assert.match(source, /window\.registerProtocol\('app', async/);
  assert.match(source, /url:\s*'app:\/\/localhost\/index\.html'/);
  assert.doesNotMatch(source, /new URL\('\.\/assets\/expose\/index\.html'/);
});

test('Hono custom protocol example forwards Fetch requests to dynamic routes', async () => {
  const source = await readFile(new URL('../examples/custom-protocol-hono.mjs', import.meta.url), 'utf8');

  assert.match(source, /import\s+\{\s*Hono\s*\}\s+from\s+'hono'/);
  assert.match(source, /router\.get\(['"]\/\*['"]/);
  assert.match(source, /registerProtocol\(['"]app['"],\s*(?:router\.fetch|[\s\S]*router\.fetch\(request\))/);
  assert.match(source, /href="\/"/);
  assert.match(source, /href="\/about"/);
  assert.match(source, /href="\/products"/);
  assert.match(source, /href="\/contact"/);
  assert.doesNotMatch(source, /statusCode\s*:/);
});

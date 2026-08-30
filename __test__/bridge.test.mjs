import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';

import webviewjs from '../index.js';

const { Application, BrowserWindow, Notification, SerializationError, TrayIcon, WebContext, Webview } = webviewjs;

const flush = () => new Promise((resolve) => setImmediate(resolve));
const requireFromTest = createRequire(import.meta.url);

async function loadWrapperForTest(nativeBinding) {
  const source = await readFile(new URL('../index.js', import.meta.url), 'utf8');
  const module = { exports: {} };
  const context = vm.createContext({
    Buffer,
    clearInterval,
    console,
    module,
    Promise,
    require: (specifier) => (specifier === './js-bindings.js' ? nativeBinding : requireFromTest(specifier)),
    setInterval,
    setImmediate,
  });

  vm.runInContext(source.split('// Auto-generated exports by postbuild.js.')[0], context, {
    filename: new URL('../index.js', import.meta.url).pathname,
  });
  return module.exports;
}

function protocolWindow() {
  return {
    completed: [],
    callbacks: new Map(),
    _registerProtocol(_name, callback) {
      this.callbacks.set(_name, callback);
      this.callback = callback;
    },
    _completeProtocol(id, response) {
      this.completed.push([id, response]);
    },
  };
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
  return {
    scripts: [],
    isDisposed() {
      return false;
    },
    onIpcMessage(callback) {
      this.ipcCallback = callback;
    },
    _exposeInternal(_name, _statics, _functions) {},
    emitExposeCall(call) {
      this.ipcCallback({
        body: Buffer.from(JSON.stringify({ __e: true, ...call })),
      });
    },
    evaluateScript(script) {
      this.scripts.push(script);
    },
  };
}

function eventApplication() {
  return {
    onEvent(callback) {
      this.applicationEventCallback = callback;
    },
  };
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

test('BrowserWindow forwards stable native event names through one EventEmitter adapter', () => {
  const window = {
    _onWindowEvent(callback) {
      this.windowEventCallback = callback;
    },
  };
  const received = [];
  const listener = (event) => received.push(event);

  assert.equal(BrowserWindow.prototype.on.call(window, 'resize', listener), window);
  window.windowEventCallback({ event: 'resize', width: 800, height: 600 });
  assert.deepEqual(received, [{ event: 'resize', width: 800, height: 600 }]);
  assert.equal(BrowserWindow.prototype.listenerCount.call(window, 'resize'), 1);
  assert.equal(BrowserWindow.prototype.off.call(window, 'resize', listener), window);
  assert.equal(BrowserWindow.prototype.listenerCount.call(window, 'resize'), 0);
});

test('TrayIcon forwards native tray events through the shared EventEmitter adapter', () => {
  const tray = {
    _onTrayEvent(callback) {
      this.trayEventCallback = callback;
    },
  };
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

test('createWebview forwards navigationHandler and uses its decision', async () => {
  class MockApplication {
    pumpEvents() {
      return true;
    }

    exit() {}

    onEvent() {}
  }

  class MockWebContext {
    dispose() {}

    isDisposed() {
      return false;
    }
  }

  class MockTrayIcon {
    dispose() {}

    isDisposed() {
      return false;
    }

    _onTrayEvent() {}
  }

  class MockWebview {
    dispose() {}

    isDisposed() {
      return false;
    }

    _exposeInternal() {}

    evaluateScript() {}
  }

  class MockBrowserWindow {
    dispose() {}

    isDisposed() {
      return false;
    }

    _onWindowEvent() {}

    createWebview(_options, _webContext, eventHandler, navigationHandler) {
      const url = 'app://blocked';
      const creation = { eventHandler, navigationAllowed: navigationHandler?.(url) ?? true };
      this.creations ??= [];
      this.creations.push(creation);
      return new MockWebview();
    }
  }

  const wrappedBinding = await loadWrapperForTest({
    Application: MockApplication,
    BrowserWindow: MockBrowserWindow,
    TrayIcon: MockTrayIcon,
    WebContext: MockWebContext,
    Webview: MockWebview,
  });
  const window = new wrappedBinding.BrowserWindow();
  const navigationUrls = [];

  const firstWebview = wrappedBinding.BrowserWindow.prototype.createWebview.call(window, {
    navigationHandler(url) {
      navigationUrls.push(url);
      return false;
    },
  });
  const secondWebview = wrappedBinding.BrowserWindow.prototype.createWebview.call(window, {
    navigationHandler() {
      return true;
    },
  });

  assert.deepEqual(navigationUrls, ['app://blocked']);
  assert.equal(window.creations[0].navigationAllowed, false);
  assert.equal(window.creations[1].navigationAllowed, true);

  const firstEvents = [];
  const secondEvents = [];
  firstWebview.on('navigation', (event) => firstEvents.push(event));
  secondWebview.on('navigation', (event) => secondEvents.push(event));
  window.creations[0].eventHandler(null, { event: 'navigation', url: 'app://first' });
  window.creations[1].eventHandler(null, { event: 'navigation', url: 'app://second' });

  assert.deepEqual(firstEvents, [{ event: 'navigation', url: 'app://first' }]);
  assert.deepEqual(secondEvents, [{ event: 'navigation', url: 'app://second' }]);
});

test('closing the final window runs the same native resource cleanup as app.exit()', async () => {
  const source = await readFile(new URL('../src/app.rs', import.meta.url), 'utf8');

  assert.match(source, /impl AppState \{[\s\S]*?fn shutdown\(&mut self\)/);
  assert.match(source, /if state\.windows\.is_empty\(\) \{[\s\S]*?state\.shutdown\(\);[\s\S]*?\}/);
  assert.match(source, /pub fn exit\(&mut self\) \{[\s\S]*?self\.state\.shutdown\(\);/);
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

  assert.match(windowSource, /self\.window\.set_progress_bar\(/);
  assert.match(windowSource, /self\.window\.monitor_from_point\(x, y\)/);
  assert.match(windowSource, /WindowExtIOS/);
  assert.match(windowSource, /WindowBuilderExtIOS/);
  assert.match(windowSource, /pub fn get_wayland_surface/);
  assert.match(windowSource, /tao::rwh_06::\{HasWindowHandle, RawWindowHandle\}/);
  assert.match(windowSource, /self\.window\.set_is_document_edited\(edited\)/);
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
  const wrapper = await readFile(new URL('../index.js', import.meta.url), 'utf8');
  const wrapperTypes = await readFile(new URL('../index.d.ts', import.meta.url), 'utf8');

  assert.match(library, /pub mod notifications;/);
  assert.match(source, /notify_rust::Notification/);
  assert.match(source, /target_os = "android"/);
  assert.match(source, /target_os = "ios"/);
  assert.match(source, /NotificationEventPayload/);
  assert.match(source, /callback\.unref\(&env\)/);
  assert.match(source, /windows_notifications_enabled/);
  assert.match(source, /Windows notifications are disabled in system settings/);
  assert.match(source, /NativeNotificationAction/);
  assert.match(source, /if !options\.persistent/);
  assert.match(source, /notification\.action\(&action\.action, &action\.title\)/);
  assert.doesNotMatch(source, /\.action\("default", ""\)/);
  assert.match(source, /Some\(String::new\(\)\)/);
  assert.match(source, /image::load_from_memory/);
  assert.match(source, /notification\.image_data/);
  assert.match(source, /TemporaryNotificationImage/);
  assert.match(wrapper, /Buffer\.isBuffer\(options\.image\)/);
  assert.match(wrapper, /imageData:/);
  assert.match(wrapperTypes, /image\?: string \| Buffer/);
  assert.match(wrapper, /\(error, payload\) =>/);
});

test('root-created wrappers expose explicit disposal', () => {
  for (const type of [BrowserWindow, Webview, WebContext, TrayIcon]) {
    assert.equal(typeof type.prototype.dispose, 'function', `${type.name}.dispose`);
  }
});

test('tray example retains its icon and relies on whenReady auto-run', async () => {
  const source = await readFile(new URL('../examples/tray.mjs', import.meta.url), 'utf8');

  assert.match(source, /let tray = null/);
  assert.match(source, /app\.whenReady\(\)\.then\(\(\) => \{[\s\S]*tray = app\.createTrayIcon/);
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
  const source = await readFile(new URL('../index.js', import.meta.url), 'utf8');

  assert.match(source, /const eventHandler = function \(error, payload\)/);
  assert.match(source, /if \(error\) throw error;/);
  assert.doesNotMatch(source, /_setPendingWebview(?:EventCallback|NavigationHandler)|_clearPendingWebviewHandlers/);
});

test('created webviews receive callbacks directly instead of pending handlers', async () => {
  const source = await readFile(new URL('../src/browser_window.rs', import.meta.url), 'utf8');
  const webviewSource = await readFile(new URL('../src/webview.rs', import.meta.url), 'utf8');

  assert.match(source, /event_handler: Option<ThreadsafeFunction<WebviewEventPayload>>/);
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
  assert.match(declarations, /eventHandler\?: \(\(err: Error \| null, arg: WebviewEventPayload\) => any\)/);
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
  const webview = {
    isDisposed: () => true,
  };

  assert.throws(() => Webview.prototype.expose.call(webview, 'native', {}), /disposed/);
  assert.throws(() => Webview.prototype.onIpcMessage.call(webview, () => {}), /disposed/);
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

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { Application, BrowserWindow, SerializationError, TrayIcon, WebContext, Webview } from '../index.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));

function protocolWindow() {
  return {
    completed: [],
    _registerProtocol(_name, callback) {
      this.callback = callback;
    },
    _completeProtocol(id, response) {
      this.completed.push([id, response]);
    },
  };
}

function exposedWebview() {
  return {
    scripts: [],
    _exposeInternal(_name, _statics, _functions, callback) {
      this.callback = callback;
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

  const windowEvent = { event: 0 };
  const applicationEvent = { event: 1 };
  const menuEvent = { event: 2, customMenuEvent: { id: 'save', windowId: 7 } };
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

test('Application whenReady starts the event pump by default', async () => {
  const app = eventApplication();
  app.isReady = () => false;
  const runOptions = [];
  app.run = (options) => runOptions.push(options);

  const ready = Application.prototype.whenReady.call(app, { interval: 32, ref: false });

  app.applicationEventCallback({ event: 3 });
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
  app.applicationEventCallback({ event: 3 });

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

test('BrowserWindow exposes the complete Windows extension surface', () => {
  for (const method of [
    'setEnable',
    'setTaskbarIcon',
    'removeTaskbarIcon',
    'setSkipTaskbar',
    'setUndecoratedShadow',
    'setSystemBackdrop',
    'setBorderColor',
    'setTitleBackgroundColor',
    'setTitleTextColor',
    'setCornerPreference',
    'getNativeHandleAnyThread',
  ]) {
    assert.equal(typeof BrowserWindow.prototype[method], 'function', method);
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
    'selectNextTab',
    'selectPreviousTab',
    'selectTabAtIndex',
    'numTabs',
    'isDocumentEdited',
    'setDocumentEdited',
    'setOptionAsAlt',
    'optionAsAlt',
    'setBorderlessGame',
    'isBorderlessGame',
    'getWaylandXdgToplevel',
    'setIosScaleFactor',
    'setValidOrientations',
    'setPrefersHomeIndicatorHidden',
    'setPreferredScreenEdgesDeferringSystemGestures',
    'setPrefersStatusBarHidden',
    'setPreferredStatusBarStyle',
    'recognizePinchGesture',
    'recognizePanGesture',
    'recognizeDoubletapGesture',
    'recognizeRotationGesture',
    'androidContentRect',
    'androidConfig',
  ]) {
    assert.equal(typeof BrowserWindow.prototype[method], 'function', method);
  }
});

test('generated BrowserWindowOptions include platform creation attributes', async () => {
  const declarations = await readFile(new URL('../js-bindings.d.ts', import.meta.url), 'utf8');

  for (const option of [
    'windowsTaskbarIcon',
    'windowsSystemBackdrop',
    'macosMovableByWindowBackground',
    'macosTitlebarTransparent',
    'macosOptionAsAlt',
    'x11VisualId',
    'x11WindowTypes',
    'waylandAppId',
    'iosScaleFactor',
    'iosValidOrientations',
  ]) {
    assert.match(declarations, new RegExp(`\\b${option}\\??:`), option);
  }
});

test('acrylic example uses a transparent webview and native backdrop API', async () => {
  const source = await readFile(new URL('../examples/acrylic.mjs', import.meta.url), 'utf8');

  assert.match(source, /setSystemBackdrop\(WindowsSystemBackdrop\.TransientWindow\)/);
  assert.match(source, /createWebview\(\{[\s\S]*transparent:\s*true/);
  assert.doesNotMatch(source, /node:ffi|SetWindowCompositionAttribute/);
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

  assert.match(source, /_setPendingWebviewEventCallback\(function \(error, payload\)/);
  assert.match(source, /if \(error\) throw error;/);
});

test('created webviews take ownership of their pending event handlers', async () => {
  const source = await readFile(new URL('../src/browser_window.rs', import.meta.url), 'utf8');

  assert.match(
    source,
    /let event_handler = Rc::new\(RefCell::new\(\s*self\.pending_webview_event_handler\.borrow_mut\(\)\.take\(\),?\s*\)\)/,
  );
  assert.match(source, /let nav_handler = Rc::new\(RefCell::new\(self\.pending_nav_handler\.borrow_mut\(\)\.take\(\)\)\)/);
});

test('registerProtocol completes an asynchronous handler response', async () => {
  const win = protocolWindow();

  BrowserWindow.prototype.registerProtocol.call(win, 'app', async (request) => ({
    statusCode: 200,
    body: Buffer.from(request.url),
    mimeType: 'text/plain',
  }));

  win.callback(JSON.stringify({ id: 9, url: 'app://localhost/index.html', method: 'GET', headers: [], body: null }));
  await flush();

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

  win.callback(JSON.stringify({ id: 10, url: 'app://localhost/missing', method: 'GET', headers: [], body: null }));
  await flush();

  assert.equal(win.completed[0][0], 10);
  assert.equal(win.completed[0][1].statusCode, 500);
  assert.equal(win.completed[0][1].mimeType, 'text/plain');
  assert.equal(win.completed[0][1].body.toString(), 'read failed');
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
  webview.callback({ ns: 'native', method: 'answer', id: 1, argsJson: '[]' });
  await flush();

  assert.match(webview.scripts.at(-1), /resolve\(1,42\)/);
});

test('expose sends a SerializationError name to the page for non-serializable results', async () => {
  const webview = exposedWebview();

  Webview.prototype.expose.call(webview, 'native', { broken: () => 1n });
  webview.callback({ ns: 'native', method: 'broken', id: 2, argsJson: '[]' });
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

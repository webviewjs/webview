const nativeBinding = require('./js-bindings.js');
const { EventEmitter } = require('events');

// Patch the native Application prototype with non-blocking run/stop.
// A WeakMap stores each instance's timer so no extra class wrapper is needed.
const _timers = new WeakMap();

nativeBinding.Application.prototype.run = function run(options = {}) {
  const interval = options.interval ?? 16;
  const shouldRef = options.ref ?? true;

  if (_timers.has(this)) return;

  const timer = setInterval(() => {
    if (!this.pumpEvents()) this.stop();
  }, interval);

  if (!shouldRef) timer.unref();
  _timers.set(this, timer);
};

nativeBinding.Application.prototype.stop = function stop() {
  const timer = _timers.get(this);
  if (timer === undefined) return;
  clearInterval(timer);
  _timers.delete(this);
};

const _nativeExit = nativeBinding.Application.prototype.exit;
nativeBinding.Application.prototype.exit = function exit() {
  this.stop();
  return _nativeExit.call(this);
};

nativeBinding.Application.prototype[Symbol.dispose] = function dispose() {
  this.exit();
};

for (const Type of [
  nativeBinding.BrowserWindow,
  nativeBinding.Webview,
  nativeBinding.WebContext,
  nativeBinding.TrayIcon,
]) {
  if (Type?.prototype?.dispose) {
    Type.prototype[Symbol.dispose] = function dispose() {
      this.dispose();
    };
  }
}

for (const Type of [
  nativeBinding.BrowserWindow,
  nativeBinding.Webview,
  nativeBinding.WebContext,
  nativeBinding.TrayIcon,
]) {
  if (!Type?.prototype?.isDisposed) continue;

  for (const name of Object.getOwnPropertyNames(Type.prototype)) {
    if (name === 'constructor' || name === 'dispose' || name === 'isDisposed') continue;
    const descriptor = Object.getOwnPropertyDescriptor(Type.prototype, name);
    if (typeof descriptor?.value !== 'function') continue;
    const nativeMethod = descriptor.value;
    Type.prototype[name] = function (...args) {
      if (this.isDisposed()) {
        throw new Error(`${Type.name} has been disposed`);
      }
      return nativeMethod.apply(this, args);
    };
  }
}

// ── TrayIcon EventEmitter ────────────────────────────────────────────────────
const _trayEmitters = new WeakMap();

function _getTrayEmitter(tray) {
  if (!_trayEmitters.has(tray)) {
    const emitter = new EventEmitter();
    _trayEmitters.set(tray, emitter);
    tray._onTrayEvent(function (payload) {
      emitter.emit(payload.event, payload);
    });
  }
  return _trayEmitters.get(tray);
}

[
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
].forEach((method) => {
  nativeBinding.TrayIcon.prototype[method] = function (...args) {
    const emitter = _getTrayEmitter(this);
    const result = emitter[method](...args);
    return result === emitter ? this : result;
  };
});

// ── Application EventEmitter ─────────────────────────────────────────────────
// Maps WebviewApplicationEvent numeric values (from Rust enum order) to names.
const _applicationEventNames = [
  'window-close-requested', // 0 WindowCloseRequested
  'application-close-requested', // 1 ApplicationCloseRequested
  'custom-menu-click', // 2 CustomMenuClick
  'ready', // 3 Ready
];

const _applicationEmitters = new WeakMap();

function _getApplicationEmitter(app) {
  if (!_applicationEmitters.has(app)) {
    const emitter = new EventEmitter();
    _applicationEmitters.set(app, emitter);
    app.onEvent(function (payload) {
      const name = _applicationEventNames[payload.event];
      if (name !== undefined) emitter.emit(name, payload);
    });
  }
  return _applicationEmitters.get(app);
}

nativeBinding.Application.prototype.whenReady = function whenReady(options = {}) {
  const { autoRun = true, interval, ref } = options;

  if (!autoRun) {
    if (Object.prototype.hasOwnProperty.call(options, 'interval')) {
      throw new TypeError('interval is not supported when autoRun is false');
    }
    if (Object.prototype.hasOwnProperty.call(options, 'ref')) {
      throw new TypeError('ref is not supported when autoRun is false');
    }
  }

  const ready = this.isReady()
    ? Promise.resolve()
    : new Promise((resolve) => {
        nativeBinding.Application.prototype.once.call(this, 'ready', resolve);
      });

  if (autoRun) {
    const runOptions = {};
    if (interval !== undefined) runOptions.interval = interval;
    if (ref !== undefined) runOptions.ref = ref;
    this.run(runOptions);
  }

  return ready;
};

[
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
].forEach((method) => {
  nativeBinding.Application.prototype[method] = function (...args) {
    const emitter = _getApplicationEmitter(this);
    const result = emitter[method](...args);
    return result === emitter ? this : result;
  };
});

// ── BrowserWindow EventEmitter ────────────────────────────────────────────────
// Maps WindowEventType numeric values (from Rust enum order) to event names.
const _windowEventNames = [
  'move', // 0  Moved
  'resize', // 1  Resized
  'close', // 2  CloseRequested
  'focus', // 3  Focused
  'blur', // 4  Blurred
  'mouse-enter', // 5  MouseEnter
  'mouse-leave', // 6  MouseLeave
  'mouse-move', // 7  MouseMove
  'mouse-down', // 8  MouseDown
  'mouse-up', // 9  MouseUp
  'scroll', // 10 Scroll
  'key-down', // 11 KeyDown
  'key-up', // 12 KeyUp
  'file-drop', // 13 FileDrop
  'file-hover', // 14 FileHover
  'file-hover-cancelled', // 15 FileHoverCancelled
  'scale-factor-changed', // 16 ScaleFactorChanged
  'theme-changed', // 17 ThemeChanged
  'ime', // 18 Ime
  'touch', // 19 Touch
];

const _windowEmitters = new WeakMap();

function _getWindowEmitter(win) {
  if (!_windowEmitters.has(win)) {
    const emitter = new EventEmitter();
    _windowEmitters.set(win, emitter);
    win._onWindowEvent(function (payload) {
      const name = _windowEventNames[payload.event];
      if (name !== undefined) emitter.emit(name, payload);
    });
  }
  return _windowEmitters.get(win);
}

[
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
].forEach((method) => {
  nativeBinding.BrowserWindow.prototype[method] = function (...args) {
    const result = _getWindowEmitter(this)[method](...args);
    // Return `this` for chainable methods, otherwise the emitter's return value.
    return result === _getWindowEmitter(this) ? this : result;
  };
});

// ── BrowserWindow.registerProtocol ───────────────────────────────────────────
// Wraps the low-level `_registerProtocol(name, (payloadJson) => void)` native
// API with a clean async handler: `(request: Request) => Promise<Response>`.
// The handler receives a global `Request` object and should return a global
// `Response` (or a legacy `CustomProtocolResponse` plain object for compat).
// This allows frameworks like Hono to be used directly:
//   win.registerProtocol('app', (req) => honoApp.fetch(req));
nativeBinding.BrowserWindow.prototype.registerProtocol = function registerProtocol(name, asyncHandler) {
  const win = this;
  win._registerProtocol(name, function (payloadJson) {
    let parsed;
    try {
      parsed = JSON.parse(payloadJson);
    } catch {
      return;
    }
    const { id, url, method, headers: rawHeaders, body: bodyArr } = parsed;

    // Build a global Headers object
    const headersObj = new Headers();
    for (const { key, value } of rawHeaders ?? []) {
      if (value != null) headersObj.set(key, value);
    }

    // Build a global Request — GET/HEAD cannot carry a body
    const canHaveBody = !['GET', 'HEAD'].includes(method.toUpperCase());
    const reqInit = { method, headers: headersObj };
    if (canHaveBody && Array.isArray(bodyArr) && bodyArr.length > 0) {
      reqInit.body = Buffer.from(bodyArr);
    }
    const request = new Request(url, reqInit);

    Promise.resolve(asyncHandler(request))
      .then(async (resp) => {
        // Accept a global Response object (from Hono / fetch-compatible handlers)
        if (typeof Response !== 'undefined' && resp instanceof Response) {
          const bodyBuf = Buffer.from(await resp.arrayBuffer());
          const contentType = resp.headers.get('content-type') ?? 'application/octet-stream';
          const extraHeaders = [];
          resp.headers.forEach((value, key) => {
            if (key.toLowerCase() !== 'content-type') extraHeaders.push({ key, value });
          });
          return win._completeProtocol(id, {
            statusCode: resp.status,
            body: bodyBuf,
            mimeType: contentType,
            headers: extraHeaders,
          });
        }
        // Legacy CustomProtocolResponse plain object
        return win._completeProtocol(id, resp);
      })
      .catch((err) =>
        win._completeProtocol(id, {
          statusCode: 500,
          body: Buffer.from(String(err?.message ?? err)),
          mimeType: 'text/plain',
        }),
      );
  });
};

// ── Webview EventEmitter ──────────────────────────────────────────────────────
// Maps WebviewEventType numeric values (Rust enum order) to JS event names.
const _webviewEventNames = [
  'page-load-started', // 0  PageLoadStarted
  'page-load-finished', // 1  PageLoadFinished
  'title-changed', // 2  TitleChanged
  'download-started', // 3  DownloadStarted
  'download-completed', // 4  DownloadCompleted
  'navigation', // 5  NavigationStarted
  'new-window', // 6  NewWindowRequested
];

const _webviewEmitters = new WeakMap();

function _attachWebviewEmitter(webview, emitter) {
  [
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
  ].forEach((method) => {
    webview[method] = function (...args) {
      const result = emitter[method](...args);
      return result === emitter ? webview : result;
    };
  });
  _webviewEmitters.set(webview, emitter);
}

// ── BrowserWindow.createWebview wrapper ──────────────────────────────────────
// Intercepts `createWebview(options)` to:
//  - Extract `webContext` and `navigationHandler` from options
//  - Pre-register event dispatch and sync guard callbacks before the native build
//  - Attach an EventEmitter to the returned Webview
const _nativeCreateWebview = nativeBinding.BrowserWindow.prototype.createWebview;

nativeBinding.BrowserWindow.prototype.createWebview = function createWebview(opts) {
  const { webContext = null, navigationHandler = null, ...rustOpts } = opts ?? {};

  const emitter = new EventEmitter();

  // Always pre-register the event dispatch; the wry handlers call it for every
  // page-load / title / download / navigation event.
  this._setPendingWebviewEventCallback(function (error, payload) {
    if (error) throw error;
    const name = _webviewEventNames[payload.event];
    if (name !== undefined) emitter.emit(name, payload);
  });

  if (typeof navigationHandler === 'function') {
    this._setPendingWebviewNavigationHandler(navigationHandler);
  }

  const webview = _nativeCreateWebview.call(this, rustOpts, webContext);

  // Clear so subsequent createWebview calls start with a clean slate.
  this._clearPendingWebviewHandlers();

  _attachWebviewEmitter(webview, emitter);
  return webview;
};

// ── Webview.expose ────────────────────────────────────────────────────────────
// Injects a proxy object at `window[name]` in the page.
// Static (non-function) properties are serialised once at call time.
// Every function call from the page side is async (returns a Promise).
// Throws SerializationError for non-JSON-serialisable args or return values.
class SerializationError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'SerializationError';
  }
}

const _exposedNamespaces = new WeakMap();

function jsonValue(value, context) {
  try {
    const json = JSON.stringify(value);
    if (json === undefined) throw new TypeError('JSON.stringify returned undefined');
    return json;
  } catch {
    throw new SerializationError(`${context} is not JSON-serialisable`);
  }
}

function sendExposeError(webview, id, message, name = 'Error') {
  webview.evaluateScript(
    `window.__webviewjs__&&window.__webviewjs__.reject(${Number(id)},${JSON.stringify(String(message))},${JSON.stringify(name)})`,
  );
}

nativeBinding.Webview.prototype.expose = function expose(name, target) {
  const self = this;
  if (!/^[A-Za-z_$][\w$]*$/u.test(name)) {
    throw new TypeError('expose(): name must be a valid JavaScript identifier');
  }
  if (target === null || (typeof target !== 'object' && typeof target !== 'function')) {
    throw new TypeError('expose(): target must be an object');
  }

  const namespaces = _exposedNamespaces.get(self) ?? new Set();
  if (namespaces.has(name)) {
    throw new Error(`expose(): namespace "${name}" is already registered`);
  }

  const statics = {};
  const functions = new Map();
  for (const [k, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(target))) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) continue;
    const { value: v } = descriptor;
    if (typeof v === 'function') {
      functions.set(k, v);
    } else {
      JSON.parse(jsonValue(v, `expose(): value for property "${k}"`));
      statics[k] = v;
    }
  }

  self._exposeInternal(name, jsonValue(statics, 'expose(): static properties'), [...functions.keys()], function (call) {
    const { ns: _ns, method, id, argsJson } = call;
    const fn = functions.get(method);
    if (fn === undefined) {
      sendExposeError(self, id, `No such method: ${method}`);
      return;
    }

    let args;
    try {
      args = JSON.parse(argsJson);
    } catch {
      sendExposeError(self, id, 'Argument parse error', 'SerializationError');
      return;
    }

    Promise.resolve(fn.apply(target, args))
      .then((result) => {
        try {
          const resultJson = jsonValue(result, 'Return value');
          self.evaluateScript(`window.__webviewjs__&&window.__webviewjs__.resolve(${Number(id)},${resultJson})`);
        } catch {
          sendExposeError(self, id, 'Return value is not JSON-serialisable', 'SerializationError');
        }
      })
      .catch((err) => {
        sendExposeError(
          self,
          id,
          String(err?.message ?? err),
          err?.name === 'SerializationError' ? 'SerializationError' : 'Error',
        );
      });
  });

  namespaces.add(name);
  _exposedNamespaces.set(self, namespaces);
};

module.exports = nativeBinding;
module.exports.SerializationError = SerializationError;

// Auto-generated exports by postbuild.js. Do not edit directly.
module.exports.Application = nativeBinding.Application;
module.exports.BrowserWindow = nativeBinding.BrowserWindow;
module.exports.TrayIcon = nativeBinding.TrayIcon;
module.exports.JsTrayIcon = nativeBinding.JsTrayIcon;
module.exports.WebContext = nativeBinding.WebContext;
module.exports.JsWebContext = nativeBinding.JsWebContext;
module.exports.Webview = nativeBinding.Webview;
module.exports.JsWebview = nativeBinding.JsWebview;
module.exports.ControlFlow = nativeBinding.ControlFlow;
module.exports.JsControlFlow = nativeBinding.JsControlFlow;
module.exports.CursorType = nativeBinding.CursorType;
module.exports.FullscreenType = nativeBinding.FullscreenType;
module.exports.getWebviewVersion = nativeBinding.getWebviewVersion;
module.exports.IosStatusBarStyle = nativeBinding.IosStatusBarStyle;
module.exports.IosValidOrientations = nativeBinding.IosValidOrientations;
module.exports.MacosOptionAsAlt = nativeBinding.MacosOptionAsAlt;
module.exports.ProgressBarState = nativeBinding.ProgressBarState;
module.exports.JsProgressBarState = nativeBinding.JsProgressBarState;
module.exports.Theme = nativeBinding.Theme;
module.exports.VERSION = nativeBinding.VERSION;
module.exports.WebviewApplicationEvent = nativeBinding.WebviewApplicationEvent;
module.exports.WebviewEventType = nativeBinding.WebviewEventType;
module.exports.WindowCommand = nativeBinding.WindowCommand;
module.exports.WindowEventType = nativeBinding.WindowEventType;
module.exports.WindowsCornerPreference = nativeBinding.WindowsCornerPreference;
module.exports.WindowsSystemBackdrop = nativeBinding.WindowsSystemBackdrop;
module.exports.X11WindowType = nativeBinding.X11WindowType;

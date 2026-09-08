const nativeBinding = require('./js-bindings.js');
const { EventEmitter } = require('events');

// ── Notifications ───────────────────────────────────────────────────────────

class Notification {
  #emitter = new EventEmitter();
  #native;
  #handlers = new Map();
  #options;
  #title;

  constructor(title, options = {}) {
    if (options.image !== undefined && typeof options.image !== 'string' && !Buffer.isBuffer(options.image)) {
      throw new TypeError('Notification image must be a file path string or Buffer');
    }

    if (options.actions !== undefined && !Array.isArray(options.actions)) {
      throw new TypeError('Notification actions must be an array');
    }

    const persistent = options.persistent ?? false;
    const actions = (options.actions ?? []).map((action) => ({
      action: String(action.action),
      title: String(action.title),
      icon: action.icon === undefined ? '' : String(action.icon),
    }));

    if (actions.length > 0 && !persistent) {
      throw new TypeError('Notification actions require persistent: true');
    }

    this.#title = String(title);
    this.#options = {
      body: options.body ?? '',
      icon: options.icon ?? '',
      image: options.image ?? '',
      badge: options.badge ?? '',
      tag: options.tag ?? '',
      data: options.data,
      dir: options.dir ?? 'auto',
      lang: options.lang ?? '',
      renotify: options.renotify ?? false,
      requireInteraction: options.requireInteraction ?? false,
      persistent,
      actions,
      silent: options.silent ?? false,
      timestamp: options.timestamp ?? Date.now(),
      vibrate: options.vibrate ?? [],
    };

    this.#native = new nativeBinding.NativeNotification(
      {
        title: this.#title,
        body: this.#options.body || undefined,
        icon: this.#options.icon || undefined,
        imagePath: typeof this.#options.image === 'string' ? this.#options.image || undefined : undefined,
        imageData: Buffer.isBuffer(this.#options.image) ? this.#options.image : undefined,
        requireInteraction: this.#options.requireInteraction,
        persistent: this.#options.persistent,
        actions: this.#options.actions.map(({ action, title, icon }) => ({
          action,
          title,
          icon: icon || undefined,
        })),
      },
      (error, payload) => {
        if (error) {
          this.#dispatch({ event: 'error', error: error.message });
        } else {
          this.#dispatch(payload);
        }
      },
    );
  }

  static get permission() {
    return 'granted';
  }

  static requestPermission() {
    return Promise.resolve('granted');
  }

  #dispatch(payload) {
    const type = payload.event;
    const event = {
      type,
      target: this,
      action: payload.action,
      error: payload.error === undefined ? undefined : new Error(payload.error),
    };
    this.#emitter.emit(type, event);
    this.#handlers.get(type)?.call(this, event);
  }

  close() {
    this.#native.close();
  }

  on(event, listener) {
    this.#emitter.on(event, listener);
    return this;
  }

  once(event, listener) {
    this.#emitter.once(event, listener);
    return this;
  }

  off(event, listener) {
    this.#emitter.off(event, listener);
    return this;
  }

  addListener(event, listener) {
    this.#emitter.addListener(event, listener);
    return this;
  }

  removeListener(event, listener) {
    this.#emitter.removeListener(event, listener);
    return this;
  }

  removeAllListeners(event) {
    this.#emitter.removeAllListeners(event);
    return this;
  }

  listenerCount(event, listener) {
    return this.#emitter.listenerCount(event, listener);
  }

  listeners(event) {
    return this.#emitter.listeners(event);
  }

  rawListeners(event) {
    return this.#emitter.rawListeners(event);
  }

  emit(event, ...args) {
    return this.#emitter.emit(event, ...args);
  }

  eventNames() {
    return this.#emitter.eventNames();
  }

  get title() {
    return this.#title;
  }

  get body() {
    return this.#options.body;
  }

  get icon() {
    return this.#options.icon;
  }

  get image() {
    return this.#options.image;
  }

  get badge() {
    return this.#options.badge;
  }

  get tag() {
    return this.#options.tag;
  }

  get data() {
    return this.#options.data;
  }

  get dir() {
    return this.#options.dir;
  }

  get lang() {
    return this.#options.lang;
  }

  get renotify() {
    return this.#options.renotify;
  }

  get requireInteraction() {
    return this.#options.requireInteraction;
  }

  get persistent() {
    return this.#options.persistent;
  }

  get actions() {
    return this.#options.actions;
  }

  get silent() {
    return this.#options.silent;
  }

  get timestamp() {
    return this.#options.timestamp;
  }

  get vibrate() {
    return this.#options.vibrate;
  }

  get onclick() {
    return this.#handlers.get('click') ?? null;
  }

  set onclick(listener) {
    this.#setHandler('click', listener);
  }

  get onclose() {
    return this.#handlers.get('close') ?? null;
  }

  set onclose(listener) {
    this.#setHandler('close', listener);
  }

  get onerror() {
    return this.#handlers.get('error') ?? null;
  }

  set onerror(listener) {
    this.#setHandler('error', listener);
  }

  get onshow() {
    return this.#handlers.get('show') ?? null;
  }

  set onshow(listener) {
    this.#setHandler('show', listener);
  }

  #setHandler(type, listener) {
    if (listener == null) {
      this.#handlers.delete(type);
      return;
    }
    if (typeof listener !== 'function') {
      throw new TypeError(`on${type} must be a function or null`);
    }
    this.#handlers.set(type, listener);
  }
}

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

// ── EventEmitter adapters ────────────────────────────────────────────────────
const EVENT_METHODS = [
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
];

function installEventEmitter(Type, subscribe, getEventName = (payload) => payload.event) {
  const emitters = new WeakMap();

  function getEmitter(instance, initialEmitter) {
    let emitter = emitters.get(instance);
    if (emitter !== undefined) return emitter;

    emitter = initialEmitter ?? new EventEmitter();
    emitters.set(instance, emitter);
    if (subscribe !== undefined) {
      subscribe(instance, (payload) => {
        const eventName = getEventName(payload);
        if (eventName !== undefined) emitter.emit(eventName, payload);
      });
    }
    return emitter;
  }

  for (const method of EVENT_METHODS) {
    Type.prototype[method] = function (...args) {
      const emitter = getEmitter(this);
      const result = emitter[method](...args);
      return result === emitter ? this : result;
    };
  }

  return getEmitter;
}

const _getTrayEmitter = installEventEmitter(nativeBinding.TrayIcon, (tray, dispatch) => {
  tray._onTrayEvent(dispatch);
});

const _getApplicationEmitter = installEventEmitter(nativeBinding.Application, (app, dispatch) => {
  app.onEvent(dispatch);
});

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

const _getWindowEmitter = installEventEmitter(nativeBinding.BrowserWindow, (win, dispatch) => {
  win._onWindowEvent(dispatch);
});

// ── BrowserWindow.registerProtocol ───────────────────────────────────────────
// Wraps the low-level `_registerProtocol(name, (request) => void)` native
// API with a clean async handler: `(request: Request) => Promise<Response>`.
// The handler receives a global `Request` object and should return a global
// `Response` (or a legacy `CustomProtocolResponse` plain object for compat).
// This allows frameworks like Hono to be used directly:
//   win.registerProtocol('app', (req) => honoApp.fetch(req));
nativeBinding.BrowserWindow.prototype.registerProtocol = function registerProtocol(name, asyncHandler) {
  const win = this;
  const completeProtocol = (id, response) => {
    if (typeof win.isDisposed === 'function' && win.isDisposed()) return;
    return win._completeProtocol(id, response);
  };
  win._registerProtocol(name, function (protocolRequest) {
    const id = protocolRequest?.id;

    Promise.resolve()
      .then(() => {
        const { url, method, headers: rawHeaders, body } = protocolRequest;

        const headersObj = new Headers();
        for (const { key, value } of rawHeaders ?? []) {
          if (value != null) headersObj.set(key, value);
        }

        // GET/HEAD requests cannot carry a body in the Fetch API.
        const canHaveBody = !['GET', 'HEAD'].includes(method.toUpperCase());
        const reqInit = { method, headers: headersObj };
        if (canHaveBody && body?.length > 0) reqInit.body = body;

        return asyncHandler(new Request(url, reqInit));
      })
      .then(async (resp) => {
        // Accept a global Response object (from Hono / fetch-compatible handlers)
        if (typeof Response !== 'undefined' && resp instanceof Response) {
          const bodyBuf = Buffer.from(await resp.arrayBuffer());
          const contentType = resp.headers.get('content-type') ?? 'application/octet-stream';
          const extraHeaders = [];
          resp.headers.forEach((value, key) => {
            if (key.toLowerCase() !== 'content-type') extraHeaders.push({ key, value });
          });
          return completeProtocol(id, {
            statusCode: resp.status,
            body: bodyBuf,
            mimeType: contentType,
            headers: extraHeaders,
          });
        }
        // Legacy CustomProtocolResponse plain object
        return completeProtocol(id, resp);
      })
      .catch((err) =>
        completeProtocol(id, {
          statusCode: 500,
          body: Buffer.from(String(err?.message ?? err)),
          mimeType: 'text/plain',
        }),
      );
  });
};

// Webview events are subscribed during construction, so the callback is passed
// directly to native createWebview and the shared adapter stores that emitter.
const _getWebviewEmitter = installEventEmitter(nativeBinding.Webview);

// ── BrowserWindow.createWebview wrapper ──────────────────────────────────────
// Intercepts `createWebview(options)` to:
//  - Extract `webContext` and `navigationHandler` from options
//  - Pass event dispatch and sync guard callbacks directly to native construction
//  - Attach an EventEmitter to the returned Webview
const _nativeCreateWebview = nativeBinding.BrowserWindow.prototype.createWebview;

nativeBinding.BrowserWindow.prototype.createWebview = function createWebview(opts) {
  const { webContext = null, navigationHandler = null, ...rustOpts } = opts ?? {};

  const emitter = new EventEmitter();

  const eventHandler = function (error, payload) {
    if (error) throw error;
    const eventName = payload?.event;
    if (eventName !== undefined) emitter.emit(eventName, payload);
  };

  const webview = _nativeCreateWebview.call(this, rustOpts, webContext, eventHandler, navigationHandler);
  _getWebviewEmitter(webview, emitter);
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

const _nativeOnIpcMessage = nativeBinding.Webview.prototype.onIpcMessage;
const _nativeExposeInternal = nativeBinding.Webview.prototype._exposeInternal;
const _ipcStates = new WeakMap();

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
  if (typeof webview.isDisposed === 'function' && webview.isDisposed()) return;
  try {
    webview.evaluateScript(
      `window.__webviewjs__&&window.__webviewjs__.reject(${Number(id)},${JSON.stringify(String(message))},${JSON.stringify(name)})`,
    );
  } catch {
    // A response may race with disposal; the native object has already cleaned
    // up its IPC state in that case.
  }
}

function dispatchIpcMessage(webview, state, message) {
  if (typeof webview.isDisposed === 'function' && webview.isDisposed()) return;

  let call;
  try {
    call = JSON.parse(message.body.toString());
  } catch {
    state.userHandler?.(message);
    return;
  }

  if (call?.__e !== true) {
    state.userHandler?.(message);
    return;
  }

  const { ns, method, id, args } = call;
  const namespace = state.namespaces.get(ns);
  const fn = namespace?.functions.get(method);
  if (fn === undefined) {
    sendExposeError(webview, id, `No such method: ${method}`);
    return;
  }
  if (!Array.isArray(args)) {
    sendExposeError(webview, id, 'Arguments must be an array', 'SerializationError');
    return;
  }

  Promise.resolve()
    .then(() => fn.apply(namespace.target, args))
    .then((result) => {
      try {
        const resultJson = jsonValue(result, 'Return value');
        if (typeof webview.isDisposed !== 'function' || !webview.isDisposed()) {
          webview.evaluateScript(`window.__webviewjs__&&window.__webviewjs__.resolve(${Number(id)},${resultJson})`);
        }
      } catch {
        sendExposeError(webview, id, 'Return value is not JSON-serialisable', 'SerializationError');
      }
    })
    .catch((err) => {
      sendExposeError(
        webview,
        id,
        String(err?.message ?? err),
        err?.name === 'SerializationError' ? 'SerializationError' : 'Error',
      );
    });
}

function setIpcHandler(webview, handler) {
  const nativeSetter = Object.prototype.hasOwnProperty.call(webview, 'onIpcMessage')
    ? webview.onIpcMessage
    : _nativeOnIpcMessage;
  nativeSetter.call(webview, handler);
}

function installIpcTransport(webview, state) {
  if (state.transportInstalled) return;
  state.transportHandler ??= (message) => dispatchIpcMessage(webview, state, message);
  setIpcHandler(webview, state.transportHandler);
  state.transportInstalled = true;
}

function getIpcState(webview) {
  let state = _ipcStates.get(webview);
  if (state !== undefined) return state;

  state = {
    namespaces: new Map(),
    userHandler: null,
    transportHandler: null,
    transportInstalled: false,
  };
  _ipcStates.set(webview, state);
  installIpcTransport(webview, state);
  return state;
}

nativeBinding.Webview.prototype.onIpcMessage = function onIpcMessage(handler) {
  if (this.isDisposed()) throw new Error('Webview has been disposed');
  if (handler != null && typeof handler !== 'function') {
    throw new TypeError('onIpcMessage handler must be a function or null');
  }

  const state = getIpcState(this);
  state.userHandler = handler ?? null;
  if (handler != null) installIpcTransport(this, state);
  if (state.namespaces.size === 0 && handler == null && state.transportInstalled) {
    setIpcHandler(this, null);
    state.transportInstalled = false;
  }
};

nativeBinding.Webview.prototype.expose = function expose(name, target) {
  const self = this;
  if (self.isDisposed()) throw new Error('Webview has been disposed');
  if (!/^[A-Za-z_$][\w$]*$/u.test(name)) {
    throw new TypeError('expose(): name must be a valid JavaScript identifier');
  }
  if (target === null || (typeof target !== 'object' && typeof target !== 'function')) {
    throw new TypeError('expose(): target must be an object');
  }

  const state = getIpcState(self);
  if (state.namespaces.has(name)) {
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

  const nativeExposeInternal = Object.prototype.hasOwnProperty.call(self, '_exposeInternal')
    ? self._exposeInternal
    : _nativeExposeInternal;
  nativeExposeInternal.call(self, name, jsonValue(statics, 'expose(): static properties'), [...functions.keys()]);
  state.namespaces.set(name, { functions, target });
  installIpcTransport(self, state);
};

module.exports = nativeBinding;
module.exports.SerializationError = SerializationError;
module.exports.Notification = Notification;

// Auto-generated exports by postbuild.js. Do not edit directly.
module.exports.Application = nativeBinding.Application;
module.exports.BrowserWindow = nativeBinding.BrowserWindow;
module.exports.NativeNotification = nativeBinding.NativeNotification;
module.exports.JsNotification = nativeBinding.JsNotification;
module.exports.TrayIcon = nativeBinding.TrayIcon;
module.exports.JsTrayIcon = nativeBinding.JsTrayIcon;
module.exports.WebContext = nativeBinding.WebContext;
module.exports.JsWebContext = nativeBinding.JsWebContext;
module.exports.Webview = nativeBinding.Webview;
module.exports.JsWebview = nativeBinding.JsWebview;
module.exports.applyUriWorkAround = nativeBinding.applyUriWorkAround;
module.exports.ControlFlow = nativeBinding.ControlFlow;
module.exports.JsControlFlow = nativeBinding.JsControlFlow;
module.exports.CursorType = nativeBinding.CursorType;
module.exports.FullscreenType = nativeBinding.FullscreenType;
module.exports.getWebviewVersion = nativeBinding.getWebviewVersion;
module.exports.IosValidOrientations = nativeBinding.IosValidOrientations;
module.exports.isWorkAroundUri = nativeBinding.isWorkAroundUri;
module.exports.originalUriPrefix = nativeBinding.originalUriPrefix;
module.exports.ProgressBarState = nativeBinding.ProgressBarState;
module.exports.JsProgressBarState = nativeBinding.JsProgressBarState;
module.exports.revertUriWorkAround = nativeBinding.revertUriWorkAround;
module.exports.Theme = nativeBinding.Theme;
module.exports.VERSION = nativeBinding.VERSION;
module.exports.WebviewApplicationEvent = nativeBinding.WebviewApplicationEvent;
module.exports.WebviewEventType = nativeBinding.WebviewEventType;
module.exports.WindowCommand = nativeBinding.WindowCommand;
module.exports.WindowEventType = nativeBinding.WindowEventType;
module.exports.workAroundUriPrefix = nativeBinding.workAroundUriPrefix;

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

// ── BrowserWindow EventEmitter ────────────────────────────────────────────────
// Maps WindowEventType numeric values (from Rust enum order) to event names.
const _windowEventNames = [
  'move',        // 0  Moved
  'resize',      // 1  Resized
  'close',       // 2  CloseRequested
  'focus',       // 3  Focused
  'blur',        // 4  Blurred
  'mouse-enter', // 5  MouseEnter
  'mouse-leave', // 6  MouseLeave
  'mouse-move',  // 7  MouseMove
  'mouse-down',  // 8  MouseDown
  'mouse-up',    // 9  MouseUp
  'scroll',      // 10 Scroll
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

['on', 'once', 'off', 'addListener', 'removeListener', 'removeAllListeners', 'listenerCount', 'listeners', 'rawListeners', 'emit', 'eventNames'].forEach((method) => {
  nativeBinding.BrowserWindow.prototype[method] = function (...args) {
    const result = _getWindowEmitter(this)[method](...args);
    // Return `this` for chainable methods, otherwise the emitter's return value.
    return result === _getWindowEmitter(this) ? this : result;
  };
});

// ── BrowserWindow.registerProtocol ───────────────────────────────────────────
// Wraps the low-level `_registerProtocol(name, (payloadJson) => void)` native
// API with a clean async handler: `(request) => Promise<response>`.
nativeBinding.BrowserWindow.prototype.registerProtocol = function registerProtocol(name, asyncHandler) {
  const win = this;
  win._registerProtocol(name, function (payloadJson) {
    let parsed;
    try {
      parsed = JSON.parse(payloadJson);
    } catch {
      return;
    }
    const { id, url, method, headers, body: bodyArr } = parsed;
    const request = {
      url,
      method,
      headers: headers ?? [],
      body: Array.isArray(bodyArr) ? Buffer.from(bodyArr) : undefined,
    };
    Promise.resolve(asyncHandler(request))
      .then((resp) => win._completeProtocol(id, resp))
      .catch((err) =>
        win._completeProtocol(id, {
          statusCode: 500,
          body: Buffer.from(String(err?.message ?? err)),
          mimeType: 'text/plain',
        }),
      );
  });
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
module.exports.Webview = nativeBinding.Webview;
module.exports.JsWebview = nativeBinding.JsWebview;
module.exports.ControlFlow = nativeBinding.ControlFlow;
module.exports.JsControlFlow = nativeBinding.JsControlFlow;
module.exports.CursorType = nativeBinding.CursorType;
module.exports.FullscreenType = nativeBinding.FullscreenType;
module.exports.getWebviewVersion = nativeBinding.getWebviewVersion;
module.exports.ProgressBarState = nativeBinding.ProgressBarState;
module.exports.JsProgressBarState = nativeBinding.JsProgressBarState;
module.exports.Theme = nativeBinding.Theme;
module.exports.WebviewApplicationEvent = nativeBinding.WebviewApplicationEvent;
module.exports.WindowCommand = nativeBinding.WindowCommand;

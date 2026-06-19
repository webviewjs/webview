const nativeBinding = require('./js-bindings.js');

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
}

module.exports = nativeBinding;

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

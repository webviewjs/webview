import { Webview as NativeWebview } from '../../../js-bindings';
import type { IpcMessage, Webview } from '../../../js-bindings';
import { SerializationError } from '../../errors/serialization-error';
import { serializeJson, validateJsonValue } from './serialization';

/** Handler for a message sent from the page to the native webview. */
export type IpcMessageHandler = (message: IpcMessage) => void;

/** Original native disposal method, preserved before the IPC wrapper is installed. */
const nativeDispose = NativeWebview.prototype.dispose;
/** Original native IPC registration method, preserved before the public wrapper is installed. */
const nativeOnIpcMessage = NativeWebview.prototype.onIpcMessage;
/** IPC bridge state keyed by native webview instances without retaining disposed views. */
const bridges = new WeakMap<Webview, WebviewIpcBridge>();

interface ExposedNamespace {
  /** Object used as `this` when one of its exposed methods is invoked. */
  target: object;
  /** Methods that the page is allowed to invoke by name. */
  functions: Map<string, Function>;
}

/** Shape of a page-to-host RPC message recognized by the expose bridge. */
interface ExposeCall {
  /** Marker distinguishing an expose call from a user IPC message. */
  __e?: unknown;
  /** Exposed namespace name. */
  ns?: unknown;
  /** Exposed method name. */
  method?: unknown;
  /** Page-side request identifier used to resolve or reject the promise. */
  id?: unknown;
  /** Arguments passed to the exposed method. */
  args?: unknown;
}

/** Connects page-side IPC requests to JavaScript handlers and exposed objects. */
export class WebviewIpcBridge {
  /** Native webview used for message registration, liveness checks, and responses. */
  readonly #native: Webview;
  /** Registered namespaces that can be invoked from the page. */
  readonly #namespaces = new Map<string, ExposedNamespace>();
  /** Optional user callback for messages that are not expose RPC calls. */
  #userHandler: IpcMessageHandler | null = null;
  /** Whether the bridge currently owns the native IPC callback. */
  #transportInstalled = false;
  /** Stable callback instance installed into the native binding. */
  readonly #transportHandler: (message: IpcMessage) => void;

  /**
   * Creates a bridge for a native webview.
   * @param native Native webview whose page IPC channel is being adapted.
   */
  constructor(native: Webview) {
    this.#native = native;
    this.#transportHandler = (message) => this.#dispatchMessage(message);
  }

  /**
   * Replaces or removes the user callback for ordinary IPC messages.
   * @param handler Callback to receive non-RPC messages, or `null` to clear it.
   */
  setUserHandler(handler: IpcMessageHandler | null | undefined): void {
    this.#assertNotDisposed();
    if (handler != null && typeof handler !== 'function') {
      throw new TypeError('onIpcMessage handler must be a function or null');
    }

    this.#userHandler = handler ?? null;
    if (this.#userHandler !== null || this.#namespaces.size > 0) {
      this.#installTransport();
    } else {
      this.#removeTransport();
    }
  }

  /**
   * Exposes an object's enumerable values and functions to the page under a namespace.
   * @param name Valid JavaScript identifier used as the page-side namespace.
   * @param target Object whose enumerable function and JSON values are exposed.
   */
  expose(name: string, target: object): void {
    this.#assertNotDisposed();
    if (!/^[A-Za-z_$][\w$]*$/u.test(name)) {
      throw new TypeError('expose(): name must be a valid JavaScript identifier');
    }
    if (target === null || (typeof target !== 'object' && typeof target !== 'function')) {
      throw new TypeError('expose(): target must be an object');
    }
    if (this.#namespaces.has(name)) {
      throw new Error('expose(): namespace "' + name + '" is already registered');
    }

    const statics: Record<string, unknown> = {};
    const functions = new Map<string, Function>();
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(target))) {
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        continue;
      }
      const value: unknown = descriptor.value;
      if (typeof value === 'function') {
        functions.set(key, value);
      } else {
        validateJsonValue(value, 'expose(): value for property "' + key + '"');
        statics[key] = value;
      }
    }

    this.#native._exposeInternal(name, serializeJson(statics, 'expose(): static properties'), [...functions.keys()]);
    this.#namespaces.set(name, { functions, target });
    this.#installTransport();
  }

  /** Clears bridge state and unregisters its native IPC callback. */
  dispose(): void {
    this.#namespaces.clear();
    this.#userHandler = null;
    this.#removeTransport();
  }

  /** Throws if the native webview has already been disposed. */
  #assertNotDisposed(): void {
    if (this.#native.isDisposed()) {
      throw new Error('Webview has been disposed');
    }
  }

  /** Installs this bridge's stable handler as the native IPC callback. */
  #installTransport(): void {
    if (this.#transportInstalled) {
      return;
    }
    this.#setNativeHandler(this.#transportHandler);
    this.#transportInstalled = true;
  }

  /** Removes this bridge's native IPC callback when no bridge features remain. */
  #removeTransport(): void {
    if (!this.#transportInstalled) {
      return;
    }
    try {
      this.#setNativeHandler(null);
    } catch {
      // Native disposal clears the IPC callback at the same time.
    }
    this.#transportInstalled = false;
  }

  /**
   * Uses the instance override when available, otherwise the original native method.
   * @param handler Callback to install or `null` to clear the native IPC callback.
   */
  #setNativeHandler(handler: IpcMessageHandler | null): void {
    const nativeMethod = Object.hasOwn(this.#native, 'onIpcMessage') ? this.#native.onIpcMessage : nativeOnIpcMessage;
    nativeMethod.call(this.#native, handler);
  }

  /**
   * Routes one native message to the user callback or the exposed-method dispatcher.
   * @param message IPC payload received from the webview.
   */
  #dispatchMessage(message: IpcMessage): void {
    if (this.#native.isDisposed()) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(message.body.toString());
    } catch {
      this.#userHandler?.(message);
      return;
    }

    if (parsed === null || typeof parsed !== 'object' || (parsed as ExposeCall).__e !== true) {
      this.#userHandler?.(message);
      return;
    }

    const call = parsed as ExposeCall;
    const namespaceName = typeof call.ns === 'string' ? call.ns : '';
    const methodName = typeof call.method === 'string' ? call.method : '';
    const id = call.id;
    const namespace = this.#namespaces.get(namespaceName);
    const fn = namespace?.functions.get(methodName);
    if (fn === undefined || namespace === undefined) {
      this.#sendError(id, 'No such method: ' + String(call.method));
      return;
    }
    if (!Array.isArray(call.args)) {
      this.#sendError(id, 'Arguments must be an array', 'SerializationError');
      return;
    }

    const args: unknown[] = call.args;
    void Promise.resolve()
      .then(() => Reflect.apply(fn, namespace.target, args) as unknown)
      .then((result) => {
        try {
          const resultJson = serializeJson(result, 'Return value');
          if (!this.#native.isDisposed()) {
            this.#native.evaluateScript(
              'window.__webviewjs__&&window.__webviewjs__.resolve(' + Number(id) + ',' + resultJson + ')',
            );
          }
        } catch {
          this.#sendError(id, 'Return value is not JSON-serialisable', 'SerializationError');
        }
      })
      .catch((error: unknown) => {
        const messageText =
          error !== null && typeof error === 'object' && 'message' in error ? String(error.message) : String(error);
        const errorName =
          error !== null && typeof error === 'object' && 'name' in error && error.name === 'SerializationError'
            ? 'SerializationError'
            : 'Error';
        this.#sendError(id, messageText, errorName);
      });
  }

  /**
   * Sends a serialized rejection response to a pending page-side RPC call.
   * @param id Page-side request identifier.
   * @param message Error message returned to the page.
   * @param name Error name returned to the page.
   */
  #sendError(id: unknown, message: string, name = 'Error'): void {
    if (this.#native.isDisposed()) {
      return;
    }
    try {
      this.#native.evaluateScript(
        'window.__webviewjs__&&window.__webviewjs__.reject(' +
          Number(id) +
          ',' +
          JSON.stringify(String(message)) +
          ',' +
          JSON.stringify(name) +
          ')',
      );
    } catch {
      // A response can race with disposal after the initial check.
    }
  }
}

/**
 * Returns the existing bridge for a webview or creates one on demand.
 * @param webview Native webview to associate with the bridge.
 */
function bridgeFor(webview: Webview): WebviewIpcBridge {
  let bridge = bridges.get(webview);
  if (bridge === undefined) {
    bridge = new WebviewIpcBridge(webview);
    bridges.set(webview, bridge);
  }
  return bridge;
}

/**
 * Sets or clears the callback for IPC messages posted by the page.
 * @param handler Callback to receive messages, or `null` to remove the callback.
 */
export function onIpcMessage(this: Webview, handler?: IpcMessageHandler | null): void {
  bridgeFor(this).setUserHandler(handler);
}

/**
 * Exposes an object to the page through promise-based IPC calls.
 * @param name Valid identifier used as the exposed namespace.
 * @param target Object whose enumerable values and methods are exposed.
 */
export function expose(this: Webview, name: string, target: object): void {
  bridgeFor(this).expose(name, target);
}

/** Removes bridge resources before invoking the native webview disposal method. */
export function disposeWebview(this: Webview): void {
  const bridge = bridges.get(this);
  bridge?.dispose();
  bridges.delete(this);
  const dispose = Object.hasOwn(this, 'dispose') ? this.dispose : nativeDispose;
  dispose.call(this);
}

export { SerializationError };

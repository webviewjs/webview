import type { IpcMessage } from '../../../js-bindings';
import type { NativeWebview } from '../native-binding';
import { SerializationError } from '../../errors/serialization-error';
import { serializeJson, validateJsonValue } from './serialization';

export type IpcMessageHandler = (message: IpcMessage) => void;

interface ExposedNamespace {
  target: object;
  functions: Map<string, Function>;
}

interface ExposeCall {
  __e?: unknown;
  ns?: unknown;
  method?: unknown;
  id?: unknown;
  args?: unknown;
}

export class WebviewIpcBridge {
  readonly #native: NativeWebview;
  readonly #isDisposed: () => boolean;
  readonly #namespaces = new Map<string, ExposedNamespace>();
  #userHandler: IpcMessageHandler | null = null;
  #transportInstalled = false;
  readonly #transportHandler: (message: IpcMessage) => void;

  constructor(native: NativeWebview, isDisposed: () => boolean) {
    this.#native = native;
    this.#isDisposed = isDisposed;
    this.#transportHandler = (message) => this.#dispatchMessage(message);
  }

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

  dispose(): void {
    this.#namespaces.clear();
    this.#userHandler = null;
    this.#removeTransport();
  }

  #assertNotDisposed(): void {
    if (this.#isDisposed()) {
      throw new Error('Webview has been disposed');
    }
  }

  #installTransport(): void {
    if (this.#transportInstalled) {
      return;
    }
    this.#native.onIpcMessage(this.#transportHandler);
    this.#transportInstalled = true;
  }

  #removeTransport(): void {
    if (!this.#transportInstalled) {
      return;
    }
    try {
      this.#native.onIpcMessage(null);
    } catch {
      // Native disposal clears the IPC callback at the same time.
    }
    this.#transportInstalled = false;
  }

  #dispatchMessage(message: IpcMessage): void {
    if (this.#isDisposed()) {
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
          if (!this.#isDisposed()) {
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

  #sendError(id: unknown, message: string, name = 'Error'): void {
    if (this.#isDisposed()) {
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

export { SerializationError };

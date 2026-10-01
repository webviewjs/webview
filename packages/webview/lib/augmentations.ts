import type { EventEmitter } from 'node:events';
import type { ApplicationRunOptions } from '../js-bindings';
import type { ApplicationEventMap, ApplicationWhenReadyOptions } from './types/application';
import type { BrowserWindowEventMap, BrowserWindowProtocolHandler } from './types/browser-window';
import type { NodeEventMap } from './internal/events/event-emitter';
import type { TrayEventMap } from './types/tray-icon';
import type { ExposedTarget, WebviewEventMap, WebviewOptions as PublicWebviewOptions } from './types/webview';
import type { ApplicationEvent, IpcMessage } from '../js-bindings';

declare module '../js-bindings' {
  interface Application extends EventEmitter<NodeEventMap<ApplicationEventMap>> {
    /**
     * Starts polling native application events. Calls made while the event pump
     * is already running do not create another timer.
     * @param options Polling interval in milliseconds (default `16`) and whether
     * the timer keeps Node.js alive (default `true`).
     */
    run(options?: ApplicationRunOptions | null): void;
    /** Stops the JavaScript timer that pumps native application events. */
    stop(): void;
    /**
     * Resolves when the native application is ready. By default, starts the
     * event pump while waiting.
     * @param options Set `autoRun: false` to wait without starting the event
     * pump; `interval` and `ref` are only accepted when the pump is started.
     * @returns A promise that resolves when the native `ready` event is emitted.
     */
    whenReady(options?: ApplicationWhenReadyOptions): Promise<void>;
    /**
     * Sets or clears the legacy single native-event callback. Events are also
     * emitted through this instance's Node.js `EventEmitter` methods.
     * @param handler Callback for native application events, or `null` to clear it.
     */
    onEvent(handler?: ((event: ApplicationEvent) => void) | null): void;
    /**
     * Compatibility alias for {@link Application.onEvent}.
     * @param handler Callback for native application events, or `null` to clear it.
     */
    bind(handler?: ((event: ApplicationEvent) => void) | null): void;
    /** Exits the application when used with JavaScript's explicit resource management. */
    [Symbol.dispose](): void;
  }

  interface BrowserWindow extends EventEmitter<NodeEventMap<BrowserWindowEventMap>> {
    /**
     * Registers a handler for requests to a custom URL protocol.
     * @param name Protocol scheme name to register.
     * @param handler Callback that receives a Fetch API `Request` and returns a
     * Fetch API `Response` or a native custom-protocol response.
     */
    registerProtocol(name: string, handler: BrowserWindowProtocolHandler): void;
    /**
     * Creates a webview attached to this window and forwards its typed events.
     * @param options Native webview options and optional JavaScript callbacks.
     * @returns The newly created native webview with WebviewJS event and IPC methods.
     */
    createWebview(options?: PublicWebviewOptions | null): Webview;
    /** Disposes the window when used with JavaScript's explicit resource management. */
    [Symbol.dispose](): void;
  }

  interface Webview extends EventEmitter<NodeEventMap<WebviewEventMap>> {
    /**
     * Sets or clears the callback for messages sent from the page with `ipc.postMessage`.
     * @param handler Callback invoked for each page message, or `null` to clear it.
     */
    onIpcMessage(handler?: ((message: IpcMessage) => void) | null): void;
    /**
     * Exposes an object's enumerable properties and methods to page-side IPC calls.
     * Enumerable data properties must be JSON-serializable; enumerable functions
     * are callable from the page and their results must also be JSON-serializable.
     * @param name JavaScript identifier used as the page-side namespace.
     * @param target Object whose enumerable values and functions are exposed.
     */
    expose(name: string, target: ExposedTarget): void;
    /** Disposes the webview when used with JavaScript's explicit resource management. */
    [Symbol.dispose](): void;
  }

  interface TrayIcon extends EventEmitter<NodeEventMap<TrayEventMap>> {
    /** Disposes the tray icon when used with JavaScript's explicit resource management. */
    [Symbol.dispose](): void;
  }

  interface WebContext {
    /** Disposes the web context when used with JavaScript's explicit resource management. */
    [Symbol.dispose](): void;
  }
}

export {};

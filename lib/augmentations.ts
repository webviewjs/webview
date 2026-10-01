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
    run(options?: ApplicationRunOptions | null): void;
    stop(): void;
    whenReady(options?: ApplicationWhenReadyOptions): Promise<void>;
    onEvent(handler?: ((event: ApplicationEvent) => void) | null): void;
    bind(handler?: ((event: ApplicationEvent) => void) | null): void;
    [Symbol.dispose](): void;
  }

  interface BrowserWindow extends EventEmitter<NodeEventMap<BrowserWindowEventMap>> {
    registerProtocol(name: string, handler: BrowserWindowProtocolHandler): void;
    createWebview(options?: PublicWebviewOptions | null): Webview;
    [Symbol.dispose](): void;
  }

  interface Webview extends EventEmitter<NodeEventMap<WebviewEventMap>> {
    onIpcMessage(handler?: ((message: IpcMessage) => void) | null): void;
    expose(name: string, target: ExposedTarget): void;
    [Symbol.dispose](): void;
  }

  interface TrayIcon extends EventEmitter<NodeEventMap<TrayEventMap>> {
    [Symbol.dispose](): void;
  }

  interface WebContext {
    [Symbol.dispose](): void;
  }
}

export {};

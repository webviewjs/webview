import { Application, BrowserWindow, TrayIcon, WebContext, Webview } from '../js-bindings';
import {
  bind,
  disposeApplication,
  ensureApplicationEvents,
  onEvent,
  run,
  stop,
  whenReady,
} from './application/lifecycle';
import { createWebview } from './browser-window/create-webview';
import { ensureBrowserWindowEvents } from './browser-window/events';
import { registerProtocol } from './browser-window/protocol';
import { installEventEmitterMethods } from './internal/events/event-emitter';
import { disposeWebview, expose, onIpcMessage } from './internal/ipc/ipc-bridge';
import { ensureTrayEvents } from './tray-icon/events';
import type { ApplicationEventMap } from './types/application';
import type { BrowserWindowEventMap } from './types/browser-window';
import type { TrayEventMap } from './types/tray-icon';
import type { WebviewEventMap } from './types/webview';

installEventEmitterMethods<ApplicationEventMap>(Application.prototype, ensureApplicationEvents);
Application.prototype.onEvent = onEvent;
Application.prototype.bind = bind;
Application.prototype.run = run;
Application.prototype.stop = stop;
Application.prototype.whenReady = whenReady;
Application.prototype[Symbol.dispose] = disposeApplication;

installEventEmitterMethods<BrowserWindowEventMap>(BrowserWindow.prototype, ensureBrowserWindowEvents);
BrowserWindow.prototype.registerProtocol = registerProtocol;
BrowserWindow.prototype.createWebview = createWebview;
BrowserWindow.prototype[Symbol.dispose] = function (): void {
  this.dispose();
};

installEventEmitterMethods<WebviewEventMap>(Webview.prototype);
Webview.prototype.onIpcMessage = onIpcMessage;
Webview.prototype.expose = expose;
Webview.prototype.dispose = disposeWebview;
Webview.prototype[Symbol.dispose] = function (): void {
  this.dispose();
};

installEventEmitterMethods<TrayEventMap>(TrayIcon.prototype, ensureTrayEvents);
TrayIcon.prototype[Symbol.dispose] = function (): void {
  this.dispose();
};

WebContext.prototype[Symbol.dispose] = function (): void {
  this.dispose();
};

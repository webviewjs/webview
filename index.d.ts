export * from './js-bindings';

export class SerializationError extends Error {
  name: 'SerializationError';
}

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type ExposedTarget = Record<string, JsonValue | ((...args: any[]) => unknown | Promise<unknown>)>;

export type NotificationPermission = 'granted';
export type NotificationDirection = 'auto' | 'ltr' | 'rtl';
export type NotificationEventName = 'click' | 'close' | 'error' | 'show';

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationOptions {
  body?: string;
  icon?: string;
  image?: string | Buffer;
  badge?: string;
  tag?: string;
  data?: unknown;
  dir?: NotificationDirection;
  lang?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  persistent?: boolean;
  actions?: NotificationAction[];
  silent?: boolean;
  timestamp?: number;
  vibrate?: number | number[];
}

export interface NotificationEvent {
  type: NotificationEventName;
  target: Notification;
  action?: string;
  error?: Error;
}

export class Notification {
  constructor(title: string, options?: NotificationOptions);
  static readonly permission: NotificationPermission;
  static requestPermission(): Promise<NotificationPermission>;
  readonly title: string;
  readonly body: string;
  readonly icon: string;
  readonly image: string | Buffer;
  readonly badge: string;
  readonly tag: string;
  readonly data: unknown;
  readonly dir: NotificationDirection;
  readonly lang: string;
  readonly renotify: boolean;
  readonly requireInteraction: boolean;
  readonly persistent: boolean;
  readonly actions: NotificationAction[];
  readonly silent: boolean;
  readonly timestamp: number;
  readonly vibrate: number | number[];
  onclick: ((event: NotificationEvent) => void) | null;
  onclose: ((event: NotificationEvent) => void) | null;
  onerror: ((event: NotificationEvent) => void) | null;
  onshow: ((event: NotificationEvent) => void) | null;
  close(): void;
  on(event: NotificationEventName, listener: (event: NotificationEvent) => void): this;
  once(event: NotificationEventName, listener: (event: NotificationEvent) => void): this;
  off(event: NotificationEventName, listener: (event: NotificationEvent) => void): this;
  addListener(event: NotificationEventName, listener: (event: NotificationEvent) => void): this;
  removeListener(event: NotificationEventName, listener: (event: NotificationEvent) => void): this;
  removeAllListeners(event?: NotificationEventName): this;
  listenerCount(event: NotificationEventName, listener?: (event: NotificationEvent) => void): number;
  listeners(event: NotificationEventName): Function[];
  rawListeners(event: NotificationEventName): Function[];
  emit(event: NotificationEventName, eventObject: NotificationEvent): boolean;
  eventNames(): Array<string | symbol>;
}

export interface ApplicationEventMap {
  'window-close-requested': import('./js-bindings').ApplicationEvent;
  'application-close-requested': import('./js-bindings').ApplicationEvent;
  'custom-menu-click': import('./js-bindings').ApplicationEvent;
  ready: import('./js-bindings').ApplicationEvent;
}

export interface TrayEventMap {
  click: import('./js-bindings').TrayEventPayload;
  'double-click': import('./js-bindings').TrayEventPayload;
  enter: import('./js-bindings').TrayEventPayload;
  move: import('./js-bindings').TrayEventPayload;
  leave: import('./js-bindings').TrayEventPayload;
}

export type ApplicationWhenReadyOptions =
  | {
      autoRun?: true;
      interval?: number;
      ref?: boolean;
    }
  | {
      autoRun: false;
      interval?: never;
      ref?: never;
    };

// ── Webview events ────────────────────────────────────────────────────────────

export interface WebviewPageLoadEvent {
  event: number;
  url?: string;
}

export interface WebviewTitleChangedEvent {
  event: number;
  title?: string;
}

export interface WebviewDownloadEvent {
  event: number;
  url?: string;
  /** Only set for `download-completed` events. */
  success?: boolean;
}

export interface WebviewNavigationEvent {
  event: number;
  url?: string;
}

export interface WebviewNewWindowEvent {
  event: number;
  url?: string;
}

/** Maps Webview event names to their typed payloads. */
export interface WebviewEventMap {
  'page-load-started': WebviewPageLoadEvent;
  'page-load-finished': WebviewPageLoadEvent;
  'title-changed': WebviewTitleChangedEvent;
  'download-started': WebviewDownloadEvent;
  'download-completed': WebviewDownloadEvent;
  /** Fired for every navigation attempt.  Use `navigationHandler` option to allow/deny. */
  navigation: WebviewNavigationEvent;
  /** Fired when the page attempts to open a new browser window (`window.open`, `target="_blank"`, etc.). */
  'new-window': WebviewNewWindowEvent;
}

export interface WindowMoveEvent {
  event: number;
  x: number;
  y: number;
}

export interface WindowResizeEvent {
  event: number;
  width: number;
  height: number;
}

export interface WindowMouseEvent {
  event: number;
  x: number;
  y: number;
  button?: number;
  modifiers?: number;
}

export interface WindowScrollEvent {
  event: number;
  deltaX: number;
  deltaY: number;
}

export interface WindowBaseEvent {
  event: number;
}

export interface WindowKeyEvent {
  event: number;
  key?: string;
  code?: string;
  modifiers?: number;
  isRepeat?: boolean;
}

export interface WindowFileEvent {
  event: number;
  files?: string[];
}

export interface WindowScaleEvent {
  event: number;
  scaleFactor: number;
}

export interface WindowThemeEvent {
  event: number;
  text: 'light' | 'dark';
}

export interface WindowImeEvent {
  event: number;
  text?: string;
  phase: 'enabled' | 'preedit' | 'commit' | 'disabled';
}

export interface WindowTouchEvent {
  event: number;
  x: number;
  y: number;
  touchId: number;
  phase: 'started' | 'moved' | 'ended' | 'cancelled';
}

export interface BrowserWindowEventMap {
  move: WindowMoveEvent;
  resize: WindowResizeEvent;
  close: WindowBaseEvent;
  focus: WindowBaseEvent;
  blur: WindowBaseEvent;
  'mouse-enter': WindowMouseEvent;
  'mouse-leave': WindowBaseEvent;
  'mouse-move': WindowMouseEvent;
  'mouse-down': WindowMouseEvent;
  'mouse-up': WindowMouseEvent;
  scroll: WindowScrollEvent;
  'key-down': WindowKeyEvent;
  'key-up': WindowKeyEvent;
  'file-drop': WindowFileEvent;
  'file-hover': WindowFileEvent;
  'file-hover-cancelled': WindowBaseEvent;
  'scale-factor-changed': WindowScaleEvent;
  'theme-changed': WindowThemeEvent;
  ime: WindowImeEvent;
  touch: WindowTouchEvent;
}

declare module './js-bindings' {
  interface TrayIcon {
    [Symbol.dispose](): void;

    on<K extends keyof TrayEventMap>(event: K, listener: (payload: TrayEventMap[K]) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once<K extends keyof TrayEventMap>(event: K, listener: (payload: TrayEventMap[K]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    off<K extends keyof TrayEventMap>(event: K, listener: (payload: TrayEventMap[K]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    addListener<K extends keyof TrayEventMap>(event: K, listener: (payload: TrayEventMap[K]) => void): this;
    addListener(event: string, listener: (...args: any[]) => void): this;
    removeListener<K extends keyof TrayEventMap>(event: K, listener: (payload: TrayEventMap[K]) => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
    listenerCount(event: string): number;
    listeners(event: string): Function[];
    rawListeners(event: string): Function[];
    emit(event: string, ...args: any[]): boolean;
    eventNames(): (string | symbol)[];
  }

  interface Application {
    [Symbol.dispose](): void;

    whenReady(options?: ApplicationWhenReadyOptions): Promise<void>;
    on<K extends keyof ApplicationEventMap>(event: K, listener: (payload: ApplicationEventMap[K]) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once<K extends keyof ApplicationEventMap>(event: K, listener: (payload: ApplicationEventMap[K]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    off<K extends keyof ApplicationEventMap>(event: K, listener: (payload: ApplicationEventMap[K]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    addListener<K extends keyof ApplicationEventMap>(
      event: K,
      listener: (payload: ApplicationEventMap[K]) => void,
    ): this;
    addListener(event: string, listener: (...args: any[]) => void): this;
    removeListener<K extends keyof ApplicationEventMap>(
      event: K,
      listener: (payload: ApplicationEventMap[K]) => void,
    ): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
    listenerCount(event: string): number;
    listeners(event: string): Function[];
    rawListeners(event: string): Function[];
    emit(event: string, ...args: any[]): boolean;
    eventNames(): (string | symbol)[];
  }

  interface WebviewOptions {
    /**
     * Shared `WebContext` for cookie/data isolation across webviews.
     * Create one with `app.createWebContext({ dataDirectory })` and pass it here.
     */
    webContext?: import('./js-bindings').WebContext | null;
    /**
     * Synchronous navigation guard.  Called with the target URL before every
     * navigation; return `true` to allow, `false` to cancel.
     *
     * A `navigation` event is **always** emitted regardless of this handler.
     */
    navigationHandler?: (url: string) => boolean;
  }

  interface BrowserWindow {
    [Symbol.dispose](): void;

    /**
     * Register a custom protocol handler.
     *
     * The handler receives a global `Request` object and should return a
     * global `Response` (compatible with Hono, itty-router, and any other
     * Fetch-API framework), or a legacy `CustomProtocolResponse` plain object.
     *
     * @example
     * ```ts
     * // With Hono:
     * win.registerProtocol('app', (req) => honoApp.fetch(req));
     *
     * // With a plain Response:
     * win.registerProtocol('app', async (req) => {
     *   const body = await readFile('./index.html');
     *   return new Response(body, { headers: { 'Content-Type': 'text/html' } });
     * });
     * ```
     */
    registerProtocol(
      name: string,
      handler: (request: Request) => Response | CustomProtocolResponse | Promise<Response | CustomProtocolResponse>,
    ): void;

    on<K extends keyof BrowserWindowEventMap>(event: K, listener: (payload: BrowserWindowEventMap[K]) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once<K extends keyof BrowserWindowEventMap>(event: K, listener: (payload: BrowserWindowEventMap[K]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    off<K extends keyof BrowserWindowEventMap>(event: K, listener: (payload: BrowserWindowEventMap[K]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    addListener<K extends keyof BrowserWindowEventMap>(
      event: K,
      listener: (payload: BrowserWindowEventMap[K]) => void,
    ): this;
    addListener(event: string, listener: (...args: any[]) => void): this;
    removeListener<K extends keyof BrowserWindowEventMap>(
      event: K,
      listener: (payload: BrowserWindowEventMap[K]) => void,
    ): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
    listenerCount(event: string): number;
    listeners(event: string): Function[];
    rawListeners(event: string): Function[];
    emit(event: string, ...args: any[]): boolean;
    eventNames(): (string | symbol)[];
  }

  interface Webview {
    [Symbol.dispose](): void;

    expose(name: string, target: ExposedTarget): void;

    // EventEmitter — mirrors BrowserWindow events but for webview-level events.
    on<K extends keyof WebviewEventMap>(event: K, listener: (payload: WebviewEventMap[K]) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once<K extends keyof WebviewEventMap>(event: K, listener: (payload: WebviewEventMap[K]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    off<K extends keyof WebviewEventMap>(event: K, listener: (payload: WebviewEventMap[K]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    addListener<K extends keyof WebviewEventMap>(event: K, listener: (payload: WebviewEventMap[K]) => void): this;
    addListener(event: string, listener: (...args: any[]) => void): this;
    removeListener<K extends keyof WebviewEventMap>(event: K, listener: (payload: WebviewEventMap[K]) => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
    listenerCount(event: string): number;
    listeners(event: string): Function[];
    rawListeners(event: string): Function[];
    emit(event: string, ...args: any[]): boolean;
    eventNames(): (string | symbol)[];
  }

  interface WebContext {
    [Symbol.dispose](): void;
  }
}

'use strict';

import type {
  ApplicationEvent,
  BrowserWindowOptions,
  CursorType as CursorTypeEnum,
  CustomProtocolResponse,
  FullscreenType as FullscreenTypeEnum,
  IosValidOrientations as IosValidOrientationsEnum,
  IpcMessage,
  NativeNotificationOptions,
  NotificationEventPayload,
  ProtocolRequest,
  Theme as ThemeEnum,
  TrayEventPayload,
  TrayIconOptions,
  WebContextOptions,
  WebviewEventPayload,
  WebviewOptions,
  WindowEventPayload,
} from '../../js-bindings';

type FakeKind = 'application' | 'window' | 'webview' | 'webContext' | 'tray' | 'notification';
type NativeCallback = (...args: any[]) => void;

export interface NativeCall {
  method: string;
  args: unknown[];
}

export interface FakeState {
  kind: FakeKind;
  constructorArgs: unknown[];
  calls: NativeCall[];
  values: Record<string, unknown>;
  disposed: boolean;
  closed: boolean;
  callback: NativeCallback | null;
  windowCallback: ((event: WindowEventPayload) => void) | null;
  webviewCallback: ((error: Error | null, event?: WebviewEventPayload) => void) | null;
  navigationCallback: ((url: string) => boolean) | null;
  newWindowCallback: ((event: WebviewEventPayload) => boolean) | null;
  trayCallback: ((event: TrayEventPayload) => void) | null;
  protocols: Map<string, (request: ProtocolRequest) => void>;
  completedProtocols: Array<{ id: number; response: CustomProtocolResponse }>;
  webviews: Webview[];
  exposed: Array<{ name: string; staticsJson: string; functions: string[] }>;
  scripts: string[];
  pumpResult: boolean;
  ready: boolean;
  exited: boolean;
  preventCloseResult: boolean;
  menu: unknown;
  options?: NativeNotificationOptions;
  createdWith?: unknown;
  createArgs?: unknown[];
  registeredSchemes?: Set<string>;
}

const records = new WeakMap<object, FakeState>();
const allNotifications: NativeNotification[] = [];
const defaultValues: Record<string, unknown> = {
  isChild: false,
  isFocused: false,
  isVisible: true,
  isDecorated: true,
  isClosable: true,
  isMaximizable: true,
  isMinimizable: true,
  isMaximized: false,
  isMinimized: false,
  isResizable: true,
  hasMenu: false,
  theme: 0,
  fullscreen: null,
  width: 800,
  height: 600,
  x: 0,
  y: 0,
  scaleFactor: 1,
  dataDirectory: null,
  url: null,
  rect: null,
  getBounds: null,
  getCurrentMonitor: null,
  getPrimaryMonitor: null,
};

function stateFor(instance: object, expectedKind?: FakeKind): FakeState {
  const state = records.get(instance);
  if (!state || (expectedKind && state.kind !== expectedKind)) {
    throw new TypeError(`Object is not a fake native ${expectedKind ?? 'resource'}`);
  }
  return state;
}

function createState(instance: object, kind: FakeKind, constructorArgs: unknown[] = []): FakeState {
  const state = {
    kind,
    constructorArgs,
    calls: [],
    values: Object.create(null),
    disposed: false,
    closed: false,
    callback: null,
    windowCallback: null,
    webviewCallback: null,
    navigationCallback: null,
    newWindowCallback: null,
    trayCallback: null,
    protocols: new Map(),
    completedProtocols: [],
    webviews: [],
    exposed: [],
    scripts: [],
    pumpResult: true,
    ready: false,
    exited: false,
    preventCloseResult: true,
    menu: null,
  } satisfies FakeState;
  records.set(instance, state);
  return state;
}

function recordCall(
  instance: object,
  method: string,
  args: unknown[] = [],
  { allowDisposed = false }: { allowDisposed?: boolean } = {},
): FakeState {
  const state = stateFor(instance);
  if (state.disposed && !allowDisposed) {
    throw new Error(`${state.kind} has been disposed; cannot call ${method}()`);
  }
  state.calls.push({ method, args });
  return state;
}

function defineNativeMethod(
  prototype: object,
  name: string,
  implementation?: (this: object, ...args: any[]) => unknown,
): void {
  Object.defineProperty(prototype, name, {
    configurable: true,
    writable: true,
    value:
      implementation ??
      function unsupportedNativeMethod(this: object, ...args: any[]): unknown {
        const state = recordCall(this, name, args);
        throw new Error(`Fake native behavior is not implemented: ${state.kind}.${name}()`);
      },
  });
}

function defineNativeGetter(prototype: object, name: string): void {
  Object.defineProperty(prototype, name, {
    configurable: true,
    get(this: object): unknown {
      const state = recordCall(this, name, []);
      if (Object.hasOwn(state.values, name)) return state.values[name];
      if (Object.hasOwn(defaultValues, name)) return defaultValues[name];
      throw new Error(`Fake native getter is not implemented: ${this.constructor.name}.${name}`);
    },
  });
}

class Application {
  constructor(options: { controlFlow?: number; waitTime?: number; exitCode?: number } | null = null) {
    createState(this, 'application', [options]);
  }

  onEvent(handler: ((event: ApplicationEvent) => void) | null = null): void {
    const state = recordCall(this, 'onEvent', [handler]);
    state.callback = handler;
  }

  bind(handler: ((event: ApplicationEvent) => void) | null = null): void {
    const state = recordCall(this, 'bind', [handler]);
    state.callback = handler;
  }

  isReady(): boolean {
    const state = recordCall(this, 'isReady');
    return state.ready;
  }

  exit(): void {
    const state = recordCall(this, 'exit');
    state.exited = true;
    state.pumpResult = false;
  }

  createWebContext(options: WebContextOptions | null = null): WebContext {
    recordCall(this, 'createWebContext', [options]);
    const context = new WebContext(options);
    stateFor(context).createdWith = options;
    return context;
  }

  createTrayIcon(options: TrayIconOptions): TrayIcon {
    recordCall(this, 'createTrayIcon', [options]);
    const tray = new TrayIcon();
    stateFor(tray).createdWith = options;
    return tray;
  }

  createBrowserWindow(options: BrowserWindowOptions | null = null): BrowserWindow {
    recordCall(this, 'createBrowserWindow', [options]);
    return new BrowserWindow(options);
  }

  createChildBrowserWindow(options: BrowserWindowOptions | null = null): BrowserWindow {
    recordCall(this, 'createChildBrowserWindow', [options]);
    const window = new BrowserWindow(options);
    stateFor(window).values.isChild = true;
    return window;
  }

  setMenu(menu: unknown = null): void {
    const state = recordCall(this, 'setMenu', [menu]);
    state.menu = menu;
  }

  pumpEvents(): boolean {
    const state = recordCall(this, 'pumpEvents');
    return state.pumpResult && !state.exited;
  }

  runSync(): void {
    recordCall(this, 'runSync');
  }

  run(options: { interval?: number; ref?: boolean } | null = null): void {
    recordCall(this, 'run', [options]);
  }
}

class BrowserWindow {
  constructor(options: BrowserWindowOptions | null = null) {
    createState(this, 'window', [options]);
  }

  _registerProtocol(name: string, handler: (request: ProtocolRequest) => void): void {
    const state = recordCall(this, '_registerProtocol', [name, handler]);
    state.protocols.set(name, handler);
  }

  _completeProtocol(id: number, response: CustomProtocolResponse): void {
    const state = recordCall(this, '_completeProtocol', [id, response]);
    state.completedProtocols.push({ id, response });
  }

  createWebview(
    options: WebviewOptions | null = null,
    webContext: WebContext | null = null,
    eventHandler: ((error: Error | null, event?: WebviewEventPayload) => void) | null = null,
    navigationHandler: ((url: string) => boolean) | null = null,
    newWindowHandler: ((event: WebviewEventPayload) => boolean) | null = null,
  ): Webview {
    const state = recordCall(this, 'createWebview', [
      options,
      webContext,
      eventHandler,
      navigationHandler,
      newWindowHandler,
    ]);
    const webview = new Webview();
    const webviewState = stateFor(webview);
    webviewState.createArgs = [options, webContext, eventHandler, navigationHandler, newWindowHandler];
    webviewState.webviewCallback = eventHandler;
    webviewState.navigationCallback = navigationHandler;
    webviewState.newWindowCallback = newWindowHandler;
    state.webviews.push(webview);
    return webview;
  }

  get isChild(): boolean {
    return readWindowValue<boolean>(this, 'isChild');
  }
  get title(): string {
    return readWindowValue(this, 'title', '');
  }
  set title(value: string) {
    writeWindowValue(this, 'title', value);
  }
  get theme(): ThemeEnum {
    return readWindowValue(this, 'theme');
  }
  get fullscreen(): FullscreenTypeEnum | null {
    return readWindowValue(this, 'fullscreen');
  }
  get width(): number {
    return readWindowValue(this, 'width');
  }
  get height(): number {
    return readWindowValue(this, 'height');
  }
  get x(): number {
    return readWindowValue(this, 'x');
  }
  get y(): number {
    return readWindowValue(this, 'y');
  }

  dispose(): void {
    const state = recordCall(this, 'dispose', [], { allowDisposed: true });
    state.disposed = true;
  }

  isDisposed(): boolean {
    recordCall(this, 'isDisposed', [], { allowDisposed: true });
    return stateFor(this).disposed;
  }

  _preventClose(): boolean {
    const state = recordCall(this, '_preventClose');
    return state.preventCloseResult;
  }

  _onWindowEvent(handler: ((event: WindowEventPayload) => void) | null = null): void {
    const state = recordCall(this, '_onWindowEvent', [handler]);
    state.windowCallback = handler;
  }

  setTitle(title: string): void {
    const state = recordCall(this, 'setTitle', [title]);
    state.values.title = title;
  }

  hide(): void {
    const state = recordCall(this, 'hide');
    state.values.visible = false;
  }

  show(): void {
    const state = recordCall(this, 'show');
    state.values.visible = true;
  }
}

function readWindowValue<T>(window: object, name: string, fallback?: T): T {
  const state = recordCall(window, name);
  if (Object.hasOwn(state.values, name)) return state.values[name] as T;
  if (fallback !== undefined) return fallback;
  return defaultValues[name as keyof typeof defaultValues] as T;
}

function writeWindowValue(window: object, name: string, value: unknown): void {
  const state = recordCall(window, `set ${name}`, [value]);
  state.values[name] = value;
}

class Webview {
  constructor() {
    createState(this, 'webview');
  }

  onIpcMessage(handler: ((message: IpcMessage) => void) | null = null): void {
    const state = recordCall(this, 'onIpcMessage', [handler]);
    state.callback = handler;
  }

  dispose(): void {
    const state = recordCall(this, 'dispose', [], { allowDisposed: true });
    state.disposed = true;
    state.callback = null;
  }

  isDisposed(): boolean {
    recordCall(this, 'isDisposed', [], { allowDisposed: true });
    return stateFor(this).disposed;
  }

  _exposeInternal(name: string, staticsJson: string, functions: string[]): void {
    const state = recordCall(this, '_exposeInternal', [name, staticsJson, functions]);
    state.exposed.push({ name, staticsJson, functions });
  }

  evaluateScript(script: string): void {
    const state = recordCall(this, 'evaluateScript', [script]);
    state.scripts.push(script);
  }

  url(): string | null {
    return readWindowValue(this, 'url');
  }
  get width(): number | null {
    return readWindowValue(this, 'width');
  }
  get height(): number | null {
    return readWindowValue(this, 'height');
  }
  get x(): number | null {
    return readWindowValue(this, 'x');
  }
  get y(): number | null {
    return readWindowValue(this, 'y');
  }
}

class WebContext {
  constructor(options: WebContextOptions | null = null) {
    createState(this, 'webContext', [options]);
  }

  get dataDirectory(): string | null {
    return readContextValue(this, 'dataDirectory');
  }

  isCustomProtocolRegistered(scheme: string): boolean {
    const state = recordCall(this, 'isCustomProtocolRegistered', [scheme]);
    return state.registeredSchemes?.has(scheme) ?? false;
  }

  setAllowsAutomation(value: boolean): void {
    const state = recordCall(this, 'setAllowsAutomation', [value]);
    state.values.allowsAutomation = value;
  }

  dispose(): void {
    const state = recordCall(this, 'dispose', [], { allowDisposed: true });
    state.disposed = true;
  }

  isDisposed(): boolean {
    recordCall(this, 'isDisposed', [], { allowDisposed: true });
    return stateFor(this).disposed;
  }
}

function readContextValue(context: object, name: string): string | null {
  const state = recordCall(context, name);
  if (Object.hasOwn(state.values, name)) return state.values[name] as string | null;
  return defaultValues[name as keyof typeof defaultValues] as string | null;
}

class TrayIcon {
  constructor() {
    createState(this, 'tray', []);
  }

  get id(): string {
    return readTrayValue(this, 'id', 'fake-tray');
  }

  _onTrayEvent(handler: ((event: TrayEventPayload) => void) | null = null): void {
    const state = recordCall(this, '_onTrayEvent', [handler]);
    state.trayCallback = handler;
  }

  dispose(): void {
    const state = recordCall(this, 'dispose', [], { allowDisposed: true });
    state.disposed = true;
    state.trayCallback = null;
  }

  isDisposed(): boolean {
    recordCall(this, 'isDisposed', [], { allowDisposed: true });
    return stateFor(this).disposed;
  }
}

function readTrayValue<T>(tray: object, name: string, fallback: T): T {
  const state = recordCall(tray, name);
  return Object.hasOwn(state.values, name) ? (state.values[name] as T) : fallback;
}

class NativeNotification {
  constructor(
    options: NativeNotificationOptions,
    callback: (error: Error | null, payload?: NotificationEventPayload) => void,
  ) {
    const state = createState(this, 'notification', [options, callback]);
    state.options = options;
    state.callback = callback;
    allNotifications.push(this);
  }

  close(): void {
    const state = recordCall(this, 'close', [], { allowDisposed: true });
    state.closed = true;
  }
}

const browserWindowMethods = [
  'getNativeHandle',
  'isFocused',
  'isVisible',
  'isDecorated',
  'isClosable',
  'isMaximizable',
  'isMinimizable',
  'isMaximized',
  'isMinimized',
  'isResizable',
  'setClosable',
  'setMaximizable',
  'setMinimizable',
  'setResizable',
  'setSize',
  'setMinSize',
  'getInnerSize',
  'setMaxSize',
  'getOuterSize',
  'openFileDialog',
  'id',
  'hasMenu',
  'setTheme',
  'setWindowIcon',
  'removeWindowIcon',
  'setEnable',
  'setTaskbarIcon',
  'removeTaskbarIcon',
  'setUndecoratedShadow',
  'getNativeHandleAnyThread',
  'simpleFullscreen',
  'setSimpleFullscreen',
  'hasShadow',
  'setHasShadow',
  'setTabbingIdentifier',
  'tabbingIdentifier',
  'isDocumentEdited',
  'setDocumentEdited',
  'getWaylandSurface',
  'setIosScaleFactor',
  'setValidOrientations',
  'setPrefersHomeIndicatorHidden',
  'setPreferredScreenEdgesDeferringSystemGestures',
  'setPrefersStatusBarHidden',
  'androidContentRect',
  'androidConfig',
  'setVisible',
  'setProgressBar',
  'setMaximized',
  'setMinimized',
  'focus',
  'getAvailableMonitors',
  'getCurrentMonitor',
  'getPrimaryMonitor',
  'getMonitorFromPoint',
  'setContentProtection',
  'setAlwaysOnTop',
  'setAlwaysOnBottom',
  'setDecorations',
  'setFullscreen',
  'close',
  'setPosition',
  'getPosition',
  'center',
  'scaleFactor',
  'setCursor',
  'setCursorVisible',
  'setCursorPosition',
  'setIgnoreCursorEvents',
  'setSkipTaskbar',
  'requestRedraw',
];

const webviewMethods = [
  'print',
  'zoom',
  'setWebviewVisibility',
  'isDevtoolsOpen',
  'openDevtools',
  'closeDevtools',
  'loadUrl',
  'loadHtml',
  'evaluateScriptWithCallback',
  'reload',
  'loadUrlWithHeaders',
  'getCookies',
  'setCookie',
  'deleteCookie',
  'clearAllBrowsingData',
  'setBackgroundColor',
  'getBounds',
  'setBounds',
  'focus',
  'focusParent',
];

const trayMethods = [
  'setIcon',
  'removeIcon',
  'setMenu',
  'setTooltip',
  'setTitle',
  'setVisible',
  'setIconAsTemplate',
  'setShowMenuOnLeftClick',
  'setShowMenuOnRightClick',
  'showMenu',
  'rect',
];

for (const name of browserWindowMethods) defineNativeMethod(BrowserWindow.prototype, name);
for (const name of webviewMethods) defineNativeMethod(Webview.prototype, name);
for (const name of trayMethods) defineNativeMethod(TrayIcon.prototype, name);

const getterProperties: Array<[object, readonly string[]]> = [
  [BrowserWindow.prototype, ['isChild', 'title', 'theme', 'fullscreen', 'width', 'height', 'x', 'y']],
  [Webview.prototype, ['width', 'height', 'x', 'y']],
  [WebContext.prototype, ['dataDirectory']],
  [TrayIcon.prototype, ['id']],
];

for (const [prototype, names] of getterProperties) {
  for (const name of names) {
    if (!Object.getOwnPropertyDescriptor(prototype, name)) defineNativeGetter(prototype, name);
  }
}

const enumValues = {
  ControlFlow: { Poll: 0, Wait: 1, WaitUntil: 2, Exit: 3, ExitWithCode: 4 },
  CursorType: {
    Default: 0,
    Crosshair: 1,
    Hand: 2,
    Arrow: 3,
    Move: 4,
    Text: 5,
    Wait: 6,
    Help: 7,
    Progress: 8,
    NotAllowed: 9,
    ContextMenu: 10,
    Cell: 11,
    VerticalText: 12,
    Alias: 13,
    Copy: 14,
    NoDrop: 15,
    Grab: 16,
    Grabbing: 17,
    ZoomIn: 18,
    ZoomOut: 19,
    ResizeEast: 20,
    ResizeNorth: 21,
    ResizeNorthEast: 22,
    ResizeNorthWest: 23,
    ResizeSouth: 24,
    ResizeSouthEast: 25,
    ResizeSouthWest: 26,
    ResizeWest: 27,
    ResizeEastWest: 28,
    ResizeNorthSouth: 29,
    ResizeNorthEastSouthWest: 30,
    ResizeNorthWestSouthEast: 31,
    ResizeColumn: 32,
    ResizeRow: 33,
    AllScroll: 34,
  },
  FullscreenType: { Exclusive: 0, Borderless: 1 },
  IosValidOrientations: { LandscapeAndPortrait: 0, Landscape: 1, Portrait: 2 },
  ProgressBarState: { None: 0, Normal: 1, Indeterminate: 2, Paused: 3, Error: 4 },
  Theme: { Light: 0, Dark: 1, System: 2 },
  WebviewApplicationEvent: { WindowCloseRequested: 0, ApplicationCloseRequested: 1, CustomMenuClick: 2, Ready: 3 },
  WebviewEventType: {
    PageLoadStarted: 0,
    PageLoadFinished: 1,
    TitleChanged: 2,
    DownloadStarted: 3,
    DownloadCompleted: 4,
    NavigationStarted: 5,
    NewWindowRequested: 6,
  },
  WindowCommand: { Close: 0, Show: 1, Hide: 2 },
  WindowEventType: {
    Moved: 0,
    Resized: 1,
    CloseRequested: 2,
    Focused: 3,
    Blurred: 4,
    MouseEnter: 5,
    MouseLeave: 6,
    MouseMove: 7,
    MouseDown: 8,
    MouseUp: 9,
    Scroll: 10,
    KeyDown: 11,
    KeyUp: 12,
    FileDrop: 13,
    FileHover: 14,
    FileHoverCancelled: 15,
    ScaleFactorChanged: 16,
    ThemeChanged: 17,
    Ime: 18,
    Touch: 19,
  },
};

const prototypeBaseline = Object.freeze({
  Application: Object.getOwnPropertyDescriptors(Application.prototype),
  BrowserWindow: Object.getOwnPropertyDescriptors(BrowserWindow.prototype),
  Webview: Object.getOwnPropertyDescriptors(Webview.prototype),
  WebContext: Object.getOwnPropertyDescriptors(WebContext.prototype),
  TrayIcon: Object.getOwnPropertyDescriptors(TrayIcon.prototype),
  NativeNotification: Object.getOwnPropertyDescriptors(NativeNotification.prototype),
});

export {
  Application,
  BrowserWindow,
  Webview,
  WebContext,
  TrayIcon,
  NativeNotification,
  Webview as JsWebview,
  WebContext as JsWebContext,
  TrayIcon as JsTrayIcon,
  NativeNotification as JsNotification,
  prototypeBaseline as __prototypeBaseline,
  stateFor as __stateFor,
  allNotifications as __allNotifications,
};

export const VERSION = '0.0.0-test';
export const originalUriPrefix = (protocol: string): string => `${protocol}://`;
export const workAroundUriPrefix = (httpOrHttps: string, protocol: string): string => `${httpOrHttps}://${protocol}.`;
export const ControlFlow = enumValues.ControlFlow;
export const CursorType = enumValues.CursorType;
export const FullscreenType = enumValues.FullscreenType;
export const IosValidOrientations = enumValues.IosValidOrientations;
export const ProgressBarState = enumValues.ProgressBarState;
export const Theme = enumValues.Theme;
export const WebviewApplicationEvent = enumValues.WebviewApplicationEvent;
export const WebviewEventType = enumValues.WebviewEventType;
export const WindowCommand = enumValues.WindowCommand;
export const WindowEventType = enumValues.WindowEventType;
export function applyUriWorkAround(uri: string, httpOrHttps: string, protocol: string): string {
  return uri.replace(originalUriPrefix(protocol), workAroundUriPrefix(httpOrHttps, protocol));
}
export function isWorkAroundUri(uri: string, httpOrHttps: string, protocol: string): boolean {
  return uri.startsWith(workAroundUriPrefix(httpOrHttps, protocol));
}
export function revertUriWorkAround(uri: string, httpOrHttps: string, protocol: string): string {
  return uri.replace(workAroundUriPrefix(httpOrHttps, protocol), originalUriPrefix(protocol));
}
export function getWebviewVersion(): string {
  return VERSION;
}

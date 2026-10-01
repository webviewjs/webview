import type {
  AndroidContentRect,
  CursorType,
  Dimensions,
  FileDialogOptions,
  FullscreenType,
  IosValidOrientations,
  JsProgressBar,
  Monitor,
  Position,
  Theme,
  WebviewEventPayload,
  WebviewNewWindowFeatures,
  WindowEventPayload,
} from '../js-bindings';
import type { NativeBrowserWindow } from './internal/native-binding';
import { NativeHandle } from './internal/native-handle';
import { ProtocolBridge } from './internal/protocol/protocol-bridge';
import { BrowserWindowCloseEvent } from './internal/events/browser-window-close-event';
import type { BrowserWindowProtocolHandler, BrowserWindowEventMap } from './types/browser-window';
import { TypedEventEmitter } from './types/events';
import { Webview } from './webview';
import type { WebviewEventMap, WebviewOptions, WebviewNewWindowEvent } from './types/webview';

export class BrowserWindow extends TypedEventEmitter<BrowserWindowEventMap> {
  readonly #handle: NativeHandle<NativeBrowserWindow>;
  readonly #protocolBridge: ProtocolBridge;

  private constructor(native: NativeBrowserWindow) {
    super();
    this.#handle = new NativeHandle(native, 'BrowserWindow');
    this.#protocolBridge = new ProtocolBridge(native, () => this.isDisposed());
    native._onWindowEvent((payload) => this.#dispatchWindowEvent(payload));
  }

  /** @internal */
  static fromNative(native: NativeBrowserWindow): BrowserWindow {
    return new BrowserWindow(native);
  }

  isDisposed(): boolean {
    return this.#handle.isDisposed();
  }

  dispose(): void {
    this.#handle.dispose();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  protected unwrap(): NativeBrowserWindow {
    return this.#handle.unwrapForNative();
  }

  registerProtocol(name: string, handler: BrowserWindowProtocolHandler): void {
    this.unwrap();
    this.#protocolBridge.register(name, handler);
  }

  createWebview(options?: WebviewOptions | null): Webview {
    const native = this.unwrap();
    const { webContext, navigationHandler, newWindowHandler, ...nativeOptions } = options ?? {};
    const nativeContext = webContext == null ? null : webContext.unwrapForNative();

    let wrappedWebview: Webview | undefined;
    const eventHandler = (error: Error | null, payload: WebviewEventPayload): void => {
      if (error) {
        throw error;
      }
      wrappedWebview?.dispatchNativeEvent(payload);
    };
    const newWindowAdapter = newWindowHandler
      ? (payload: WebviewEventPayload): boolean => newWindowHandler(payload as WebviewNewWindowEvent)
      : null;

    const nativeWebview = native.createWebview(
      nativeOptions,
      nativeContext,
      eventHandler,
      navigationHandler ?? null,
      newWindowAdapter,
    );
    wrappedWebview = Webview.fromNative(nativeWebview);
    return wrappedWebview;
  }

  #dispatchWindowEvent(payload: WindowEventPayload): void {
    if (payload.event !== 'close') {
      this.emit(payload.event, payload);
      return;
    }

    const event = new BrowserWindowCloseEvent(payload, () => this.unwrap()._preventClose());
    try {
      this.emit('close', event);
    } finally {
      event.finishDispatch();
    }
  }

  get isChild(): boolean {
    return this.unwrap().isChild;
  }

  getNativeHandle(): bigint {
    return this.unwrap().getNativeHandle();
  }

  isFocused(): boolean {
    return this.unwrap().isFocused();
  }

  isVisible(): boolean {
    return this.unwrap().isVisible();
  }

  isDecorated(): boolean {
    return this.unwrap().isDecorated();
  }

  isClosable(): boolean {
    return this.unwrap().isClosable();
  }

  isMaximizable(): boolean {
    return this.unwrap().isMaximizable();
  }

  isMinimizable(): boolean {
    return this.unwrap().isMinimizable();
  }

  isMaximized(): boolean {
    return this.unwrap().isMaximized();
  }

  isMinimized(): boolean {
    return this.unwrap().isMinimized();
  }

  isResizable(): boolean {
    return this.unwrap().isResizable();
  }

  setTitle(title: string): void {
    this.unwrap().setTitle(title);
  }

  get title(): string {
    return this.unwrap().title;
  }

  setClosable(closable: boolean): void {
    this.unwrap().setClosable(closable);
  }

  setMaximizable(maximizable: boolean): void {
    this.unwrap().setMaximizable(maximizable);
  }

  setMinimizable(minimizable: boolean): void {
    this.unwrap().setMinimizable(minimizable);
  }

  setResizable(resizable: boolean): void {
    this.unwrap().setResizable(resizable);
  }

  setSize(width: number, height: number, logical?: boolean | null): Dimensions | null {
    return this.unwrap().setSize(width, height, logical);
  }

  setMinSize(width: number, height: number, logical?: boolean | null): void {
    this.unwrap().setMinSize(width, height, logical);
  }

  getInnerSize(logical?: boolean | null): Dimensions {
    return this.unwrap().getInnerSize(logical);
  }

  setMaxSize(width: number, height: number, logical?: boolean | null): void {
    this.unwrap().setMaxSize(width, height, logical);
  }

  getOuterSize(logical?: boolean | null): Dimensions {
    return this.unwrap().getOuterSize(logical);
  }

  openFileDialog(options?: FileDialogOptions | null): string[] {
    return this.unwrap().openFileDialog(options);
  }

  id(): number {
    return this.unwrap().id();
  }

  hasMenu(): boolean {
    return this.unwrap().hasMenu();
  }

  get theme(): Theme {
    return this.unwrap().theme;
  }

  setTheme(theme: Theme): void {
    this.unwrap().setTheme(theme);
  }

  setWindowIcon(icon: Uint8Array | number[], width?: number | null, height?: number | null): void {
    this.unwrap().setWindowIcon(icon, width, height);
  }

  removeWindowIcon(): void {
    this.unwrap().removeWindowIcon();
  }

  setEnable(enabled: boolean): void {
    this.unwrap().setEnable(enabled);
  }

  setTaskbarIcon(icon: Uint8Array | number[], width?: number | null, height?: number | null): void {
    this.unwrap().setTaskbarIcon(icon, width, height);
  }

  removeTaskbarIcon(): void {
    this.unwrap().removeTaskbarIcon();
  }

  setUndecoratedShadow(shadow: boolean): void {
    this.unwrap().setUndecoratedShadow(shadow);
  }

  getNativeHandleAnyThread(): bigint {
    return this.unwrap().getNativeHandleAnyThread();
  }

  simpleFullscreen(): boolean {
    return this.unwrap().simpleFullscreen();
  }

  setSimpleFullscreen(fullscreen: boolean): boolean {
    return this.unwrap().setSimpleFullscreen(fullscreen);
  }

  hasShadow(): boolean {
    return this.unwrap().hasShadow();
  }

  setHasShadow(value: boolean): void {
    this.unwrap().setHasShadow(value);
  }

  setTabbingIdentifier(identifier: string): void {
    this.unwrap().setTabbingIdentifier(identifier);
  }

  tabbingIdentifier(): string {
    return this.unwrap().tabbingIdentifier();
  }

  isDocumentEdited(): boolean {
    return this.unwrap().isDocumentEdited();
  }

  setDocumentEdited(edited: boolean): void {
    this.unwrap().setDocumentEdited(edited);
  }

  getWaylandSurface(): bigint {
    return this.unwrap().getWaylandSurface();
  }

  setIosScaleFactor(value: number): void {
    this.unwrap().setIosScaleFactor(value);
  }

  setValidOrientations(value: IosValidOrientations): void {
    this.unwrap().setValidOrientations(value);
  }

  setPrefersHomeIndicatorHidden(value: boolean): void {
    this.unwrap().setPrefersHomeIndicatorHidden(value);
  }

  setPreferredScreenEdgesDeferringSystemGestures(edges: number): void {
    this.unwrap().setPreferredScreenEdgesDeferringSystemGestures(edges);
  }

  setPrefersStatusBarHidden(value: boolean): void {
    this.unwrap().setPrefersStatusBarHidden(value);
  }

  androidContentRect(): AndroidContentRect {
    return this.unwrap().androidContentRect();
  }

  androidConfig(): string {
    return this.unwrap().androidConfig();
  }

  setVisible(visible: boolean): void {
    this.unwrap().setVisible(visible);
  }

  setProgressBar(state: JsProgressBar): void {
    this.unwrap().setProgressBar(state);
  }

  setMaximized(value: boolean): void {
    this.unwrap().setMaximized(value);
  }

  setMinimized(value: boolean): void {
    this.unwrap().setMinimized(value);
  }

  focus(): void {
    this.unwrap().focus();
  }

  getAvailableMonitors(): Monitor[] {
    return this.unwrap().getAvailableMonitors();
  }

  getCurrentMonitor(): Monitor | null {
    return this.unwrap().getCurrentMonitor();
  }

  getPrimaryMonitor(): Monitor | null {
    return this.unwrap().getPrimaryMonitor();
  }

  getMonitorFromPoint(x: number, y: number): Monitor | null {
    return this.unwrap().getMonitorFromPoint(x, y);
  }

  setContentProtection(enabled: boolean): void {
    this.unwrap().setContentProtection(enabled);
  }

  setAlwaysOnTop(enabled: boolean): void {
    this.unwrap().setAlwaysOnTop(enabled);
  }

  setAlwaysOnBottom(enabled: boolean): void {
    this.unwrap().setAlwaysOnBottom(enabled);
  }

  setDecorations(enabled: boolean): void {
    this.unwrap().setDecorations(enabled);
  }

  get fullscreen(): FullscreenType | null {
    return this.unwrap().fullscreen;
  }

  setFullscreen(fullscreenType?: FullscreenType | null): void {
    this.unwrap().setFullscreen(fullscreenType);
  }

  close(): void {
    this.unwrap().close();
  }

  hide(): void {
    this.unwrap().hide();
  }

  show(): void {
    this.unwrap().show();
  }

  setPosition(x: number, y: number, logical?: boolean | null): void {
    this.unwrap().setPosition(x, y, logical);
  }

  getPosition(logical?: boolean | null): Position {
    return this.unwrap().getPosition(logical);
  }

  center(): void {
    this.unwrap().center();
  }

  get width(): number {
    return this.unwrap().width;
  }

  get height(): number {
    return this.unwrap().height;
  }

  get x(): number {
    return this.unwrap().x;
  }

  get y(): number {
    return this.unwrap().y;
  }

  scaleFactor(): number {
    return this.unwrap().scaleFactor();
  }

  setCursor(cursor: CursorType): void {
    this.unwrap().setCursor(cursor);
  }

  setCursorVisible(visible: boolean): void {
    this.unwrap().setCursorVisible(visible);
  }

  setCursorPosition(x: number, y: number): void {
    this.unwrap().setCursorPosition(x, y);
  }

  setIgnoreCursorEvents(ignore: boolean): void {
    this.unwrap().setIgnoreCursorEvents(ignore);
  }

  setSkipTaskbar(skip: boolean): void {
    this.unwrap().setSkipTaskbar(skip);
  }

  requestRedraw(): void {
    this.unwrap().requestRedraw();
  }
}

export type {
  BrowserWindowEventMap,
  BrowserWindowProtocolHandler,
  WebviewEventMap,
  WebviewEventPayload,
  WebviewNewWindowFeatures,
};

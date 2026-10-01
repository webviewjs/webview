import type { HeaderData, IpcMessage, WebviewBounds, WebviewCookie, WebviewEventPayload } from '../js-bindings';
import { nativeBinding, type NativeWebview } from './internal/native-binding';
import { NativeHandle } from './internal/native-handle';
import { WebviewIpcBridge, type IpcMessageHandler } from './internal/ipc/ipc-bridge';
import type { ExposedTarget, WebviewEventMap } from './types/webview';
import { TypedEventEmitter } from './types/events';

const INTERNAL_WEBVIEW = Symbol('Webview internal construction');
type ScriptResultHandler = (error: Error | null, result: string) => void;

export class Webview extends TypedEventEmitter<WebviewEventMap> {
  readonly #handle: NativeHandle<NativeWebview>;
  readonly #ipc: WebviewIpcBridge;

  constructor();
  /** @internal */
  constructor(token: typeof INTERNAL_WEBVIEW, native: NativeWebview);
  constructor(token?: typeof INTERNAL_WEBVIEW, native?: NativeWebview) {
    super();
    const wrappedNative = token === INTERNAL_WEBVIEW && native !== undefined ? native : new nativeBinding.Webview();
    this.#handle = new NativeHandle(wrappedNative, 'Webview');
    this.#ipc = new WebviewIpcBridge(wrappedNative, () => this.isDisposed());
  }

  /** @internal */
  static fromNative(native: NativeWebview): Webview {
    return new Webview(INTERNAL_WEBVIEW, native);
  }

  isDisposed(): boolean {
    return this.#handle.isDisposed();
  }

  dispose(): void {
    if (this.isDisposed()) {
      return;
    }
    this.#ipc.dispose();
    this.#handle.dispose();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  protected unwrap(): NativeWebview {
    return this.#handle.unwrapForNative();
  }

  /** @internal */
  dispatchNativeEvent(payload: WebviewEventPayload): void {
    this.emit(payload.event, payload);
  }

  onIpcMessage(handler?: IpcMessageHandler | null): void {
    this.#ipc.setUserHandler(handler);
  }

  expose(name: string, target: ExposedTarget): void {
    this.#ipc.expose(name, target);
  }

  print(): void {
    this.unwrap().print();
  }

  zoom(scaleFactor: number): void {
    this.unwrap().zoom(scaleFactor);
  }

  setWebviewVisibility(visible: boolean): void {
    this.unwrap().setWebviewVisibility(visible);
  }

  isDevtoolsOpen(): boolean {
    return this.unwrap().isDevtoolsOpen();
  }

  openDevtools(): void {
    this.unwrap().openDevtools();
  }

  closeDevtools(): void {
    this.unwrap().closeDevtools();
  }

  loadUrl(url: string): void {
    this.unwrap().loadUrl(url);
  }

  loadHtml(html: string): void {
    this.unwrap().loadHtml(html);
  }

  evaluateScript(js: string): void {
    this.unwrap().evaluateScript(js);
  }

  evaluateScriptWithCallback(js: string, callback: ScriptResultHandler): void {
    this.unwrap().evaluateScriptWithCallback(js, callback);
  }

  reload(): void {
    this.unwrap().reload();
  }

  url(): string | null {
    return this.unwrap().url();
  }

  get width(): number | null {
    return this.unwrap().width;
  }

  get height(): number | null {
    return this.unwrap().height;
  }

  get x(): number | null {
    return this.unwrap().x;
  }

  get y(): number | null {
    return this.unwrap().y;
  }

  loadUrlWithHeaders(url: string, headers: HeaderData[]): void {
    this.unwrap().loadUrlWithHeaders(url, headers);
  }

  getCookies(url?: string | null): WebviewCookie[] {
    return this.unwrap().getCookies(url);
  }

  setCookie(cookie: WebviewCookie): void {
    this.unwrap().setCookie(cookie);
  }

  deleteCookie(name: string, domain?: string | null, path?: string | null): void {
    this.unwrap().deleteCookie(name, domain, path);
  }

  clearAllBrowsingData(): void {
    this.unwrap().clearAllBrowsingData();
  }

  setBackgroundColor(r: number, g: number, b: number, a: number): void {
    this.unwrap().setBackgroundColor(r, g, b, a);
  }

  getBounds(): WebviewBounds | null {
    return this.unwrap().getBounds();
  }

  setBounds(bounds: WebviewBounds): void {
    this.unwrap().setBounds(bounds);
  }

  focus(): void {
    this.unwrap().focus();
  }

  focusParent(): void {
    this.unwrap().focusParent();
  }
}

export type { ExposedTarget, IpcMessage, WebviewEventMap };

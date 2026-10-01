import type { BrowserWindow, Webview as NativeWebview, WebviewEventPayload } from '../../js-bindings';
import { BrowserWindow as NativeBrowserWindow, WebContext as NativeWebContext } from '../../js-bindings';
import type { WebviewNewWindowEvent, WebviewOptions } from '../types/webview';
import { emitEvent } from '../internal/events/event-emitter';

type NativeEventHandler = (error: Error | null, payload: WebviewEventPayload) => void;
type NativeCreateWebview = (
  this: BrowserWindow,
  options?: import('../../js-bindings').WebviewOptions | null,
  webContext?: InstanceType<typeof NativeWebContext> | null,
  eventHandler?: NativeEventHandler | null,
  navigationHandler?: ((url: string) => boolean) | null,
  newWindowHandler?: ((payload: WebviewEventPayload) => boolean) | null,
) => NativeWebview;

const nativeCreateWebview = NativeBrowserWindow.prototype.createWebview as NativeCreateWebview;

export function createWebview(this: BrowserWindow, options?: WebviewOptions | null): NativeWebview {
  const { webContext, navigationHandler, newWindowHandler, ...nativeOptions } = options ?? {};
  let webview: NativeWebview | undefined;
  const eventHandler: NativeEventHandler = (error, payload) => {
    if (error) {
      throw error;
    }
    if (webview !== undefined) {
      emitEvent(webview, payload.event, payload);
    }
  };
  const newWindowAdapter = newWindowHandler
    ? (payload: WebviewEventPayload): boolean => newWindowHandler(payload as WebviewNewWindowEvent)
    : null;

  const createNative = Object.hasOwn(this, 'createWebview')
    ? (this.createWebview as NativeCreateWebview)
    : nativeCreateWebview;
  webview = createNative.call(
    this,
    nativeOptions,
    webContext ?? null,
    eventHandler,
    navigationHandler ?? null,
    newWindowAdapter,
  );
  return webview;
}

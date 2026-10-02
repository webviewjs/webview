import type { BrowserWindow, Webview as NativeWebview, WebviewEventPayload } from '../../js-bindings';
import { BrowserWindow as NativeBrowserWindow, WebContext as NativeWebContext } from '../../js-bindings';
import type { WebviewNewWindowEvent, WebviewOptions } from '../types/webview';
import { emitEvent } from '../internal/events/event-emitter';

/** Callback shape accepted by the native webview creation binding. */
type NativeEventHandler = (error: Error | null, payload: WebviewEventPayload) => void;
/** Native `createWebview` signature before JavaScript option adaptation. */
type NativeCreateWebview = (
  this: BrowserWindow,
  options?: import('../../js-bindings').WebviewOptions | null,
  webContext?: InstanceType<typeof NativeWebContext> | null,
  eventHandler?: NativeEventHandler | null,
  navigationHandler?: ((url: string) => boolean) | null,
  newWindowHandler?: ((payload: WebviewEventPayload) => boolean) | null,
) => NativeWebview;

/** Unmodified native constructor method, saved before prototype augmentation. */
const nativeCreateWebview = NativeBrowserWindow.prototype.createWebview as NativeCreateWebview;

/**
 * Creates a native webview and forwards its events through the typed emitter.
 * @param options Native creation options and JavaScript navigation callbacks.
 */
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

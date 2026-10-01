import type {
  WebviewEventPayload,
  WebviewNewWindowFeatures,
  WebviewOptions as NativeWebviewOptions,
} from '../../js-bindings';
import type { WebContext } from '../../js-bindings';

export type { IpcMessage, WebviewBounds, WebviewCookie } from '../../js-bindings';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ExposedTarget = object;

export interface WebviewOptions extends Omit<
  NativeWebviewOptions,
  'webContext' | 'navigationHandler' | 'newWindowHandler'
> {
  webContext?: WebContext | null;
  navigationHandler?: (url: string) => boolean;
  newWindowHandler?: (event: WebviewNewWindowEvent) => boolean;
}

export interface WebviewPageLoadEvent extends WebviewEventPayload {
  event: string;
}

export interface WebviewTitleChangedEvent extends WebviewEventPayload {
  event: string;
}

export interface WebviewDownloadEvent extends WebviewEventPayload {
  event: string;
}

export interface WebviewDownloadStartedEvent extends WebviewDownloadEvent {}

export interface WebviewNavigationEvent extends WebviewEventPayload {
  event: 'navigation';
  target: 'current';
}

export interface WebviewNewWindowEvent extends WebviewEventPayload {
  event: 'new-window';
  target: 'new-window';
  windowFeatures?: WebviewNewWindowFeatures;
}

export interface WebviewEventMap {
  'page-load-started': WebviewPageLoadEvent;
  'page-load-finished': WebviewPageLoadEvent;
  'title-changed': WebviewTitleChangedEvent;
  'download-started': WebviewDownloadStartedEvent;
  'download-completed': WebviewDownloadEvent;
  navigation: WebviewNavigationEvent;
  'new-window': WebviewNewWindowEvent;
}

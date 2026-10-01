import type {
  WebviewEventPayload,
  WebviewNewWindowFeatures,
  WebviewOptions as NativeWebviewOptions,
} from '../../js-bindings';
import type { WebContext } from '../../js-bindings';

export type { IpcMessage, WebviewBounds, WebviewCookie } from '../../js-bindings';

/** A JSON-compatible value that can cross the webview IPC boundary. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
/** An object whose enumerable properties are exposed to page-side IPC calls. */
export type ExposedTarget = object;

/** Options for creating a webview, including JavaScript navigation callbacks. */
export interface WebviewOptions extends Omit<
  NativeWebviewOptions,
  'webContext' | 'navigationHandler' | 'newWindowHandler'
> {
  /** Reuses a native web context for shared webview state, or creates a default context. */
  webContext?: WebContext | null;
  /**
   * Decides whether a navigation to `url` is allowed. Return `true` to allow
   * the navigation or `false` to cancel it.
   */
  navigationHandler?: (url: string) => boolean;
  /** Decides whether a request to open a new window is allowed. */
  newWindowHandler?: (event: WebviewNewWindowEvent) => boolean;
}

/** Payload emitted when a page begins or finishes loading. */
export interface WebviewPageLoadEvent extends WebviewEventPayload {
  /** Native page-load event name. */
  event: string;
}

/** Payload emitted when the page title changes. */
export interface WebviewTitleChangedEvent extends WebviewEventPayload {
  /** Native title-change event name. */
  event: string;
}

/** Payload emitted when a page download completes. */
export interface WebviewDownloadEvent extends WebviewEventPayload {
  /** Native download event name. */
  event: string;
}

/** Payload emitted when a page download starts. */
export interface WebviewDownloadStartedEvent extends WebviewDownloadEvent {}

/** Payload for a navigation request targeting the current webview. */
export interface WebviewNavigationEvent extends WebviewEventPayload {
  /** Always `navigation` for this event. */
  event: 'navigation';
  /** Current webview navigation target. */
  target: 'current';
}

/** Payload for a page request to open a new webview window. */
export interface WebviewNewWindowEvent extends WebviewEventPayload {
  /** Always `new-window` for this event. */
  event: 'new-window';
  /** Target requested by the page. */
  target: 'new-window';
  /** Window features requested by the page, when present. */
  windowFeatures?: WebviewNewWindowFeatures;
}

/** Maps webview event names to their payload types. */
export interface WebviewEventMap {
  /** Emitted when page loading begins. */
  'page-load-started': WebviewPageLoadEvent;
  /** Emitted when page loading finishes. */
  'page-load-finished': WebviewPageLoadEvent;
  /** Emitted when the document title changes. */
  'title-changed': WebviewTitleChangedEvent;
  /** Emitted when a page download starts. */
  'download-started': WebviewDownloadStartedEvent;
  /** Emitted when a page download completes. */
  'download-completed': WebviewDownloadEvent;
  /** Emitted when the page requests navigation. */
  navigation: WebviewNavigationEvent;
  /** Emitted when the page requests a new window. */
  'new-window': WebviewNewWindowEvent;
}

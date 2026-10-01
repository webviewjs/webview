import type { CustomProtocolResponse, WebviewEventPayload, WebviewNewWindowFeatures } from '../../js-bindings';

/** Native window creation, protocol response, and file-dialog options. */
export type { BrowserWindowOptions, CustomProtocolResponse, FileDialogOptions } from '../../js-bindings';

/** Payload for a window move event. */
export interface WindowMoveEvent {
  /** Event name reported by the native window. */
  event: string;
  /** Horizontal position of the window in logical pixels. */
  x: number;
  /** Vertical position of the window in logical pixels. */
  y: number;
}

/** Payload for a window resize event. */
export interface WindowResizeEvent {
  /** Event name reported by the native window. */
  event: string;
  /** New width of the window in logical pixels. */
  width: number;
  /** New height of the window in logical pixels. */
  height: number;
}

/** Payload for pointer events received by a browser window. */
export interface WindowMouseEvent {
  /** Event name, such as `mouse-move` or `mouse-down`. */
  event: string;
  /** Horizontal pointer position in window coordinates. */
  x: number;
  /** Vertical pointer position in window coordinates. */
  y: number;
  /** Native mouse-button identifier, when the event has one. */
  button?: number;
  /** Native modifier-key bitmask, when supplied by the platform. */
  modifiers?: number;
}

/** Payload for a mouse-wheel or trackpad scroll event. */
export interface WindowScrollEvent {
  /** Event name reported by the native window. */
  event: string;
  /** Horizontal scroll delta. */
  deltaX: number;
  /** Vertical scroll delta. */
  deltaY: number;
}

/** Common payload shape for window events without additional data. */
export interface WindowBaseEvent {
  /** Event name reported by the native window. */
  event: string;
}

/** Close-request event whose default action can be prevented during dispatch. */
export interface BrowserWindowCloseEvent extends WindowBaseEvent {
  /** Always `close` for this event. */
  readonly event: 'close';
  /** Whether a listener successfully prevented the native close request. */
  readonly defaultPrevented: boolean;
  /** Prevents the pending close request while this event is being dispatched. */
  preventDefault(): void;
}

/** Payload for a keyboard event received by a browser window. */
export interface WindowKeyEvent {
  /** Event name, either `key-down` or `key-up`. */
  event: string;
  /** Platform-reported key value, when available. */
  key?: string;
  /** Platform-reported physical key code, when available. */
  code?: string;
  /** Native modifier-key bitmask, when supplied by the platform. */
  modifiers?: number;
  /** Whether the key event is an auto-repeat. */
  isRepeat?: boolean;
}

/** Payload for a file drag-and-drop event. */
export interface WindowFileEvent {
  /** Event name, such as `file-drop` or `file-hover`. */
  event: string;
  /** File paths involved in the event, when available. */
  files?: string[];
}

/** Payload emitted when the display scale factor changes. */
export interface WindowScaleEvent {
  /** Event name reported by the native window. */
  event: string;
  /** New display scale factor. */
  scaleFactor: number;
}

/** Payload emitted when the system appearance changes. */
export interface WindowThemeEvent {
  /** Event name reported by the native window. */
  event: string;
  /** Current system theme. */
  text: 'light' | 'dark';
}

/** Payload for an input-method-editor composition event. */
export interface WindowImeEvent {
  /** Event name reported by the native window. */
  event: string;
  /** Composition text, when provided by the platform. */
  text?: string;
  /** Current stage of the text-composition lifecycle. */
  phase: 'enabled' | 'preedit' | 'commit' | 'disabled';
}

/** Payload for a touch-screen contact event. */
export interface WindowTouchEvent {
  /** Event name reported by the native window. */
  event: string;
  /** Horizontal touch position in window coordinates. */
  x: number;
  /** Vertical touch position in window coordinates. */
  y: number;
  /** Identifier for this touch contact. */
  touchId: number;
  /** Stage of this touch contact's lifecycle. */
  phase: 'started' | 'moved' | 'ended' | 'cancelled';
}

/** Maps browser-window event names to their payload types. */
export interface BrowserWindowEventMap {
  /** Emitted when the window moves. */
  move: WindowMoveEvent;
  /** Emitted when the window changes size. */
  resize: WindowResizeEvent;
  /** Emitted when the window receives a close request. */
  close: BrowserWindowCloseEvent;
  /** Emitted when the window gains focus. */
  focus: WindowBaseEvent;
  /** Emitted when the window loses focus. */
  blur: WindowBaseEvent;
  /** Emitted when the pointer enters the window. */
  'mouse-enter': WindowMouseEvent;
  /** Emitted when the pointer leaves the window. */
  'mouse-leave': WindowBaseEvent;
  /** Emitted when the pointer moves. */
  'mouse-move': WindowMouseEvent;
  /** Emitted when a mouse button is pressed. */
  'mouse-down': WindowMouseEvent;
  /** Emitted when a mouse button is released. */
  'mouse-up': WindowMouseEvent;
  /** Emitted when the user scrolls. */
  scroll: WindowScrollEvent;
  /** Emitted when a keyboard key is pressed. */
  'key-down': WindowKeyEvent;
  /** Emitted when a keyboard key is released. */
  'key-up': WindowKeyEvent;
  /** Emitted when files are dropped onto the window. */
  'file-drop': WindowFileEvent;
  /** Emitted while files are dragged over the window. */
  'file-hover': WindowFileEvent;
  /** Emitted when a file drag leaves the window. */
  'file-hover-cancelled': WindowBaseEvent;
  /** Emitted when the display scale factor changes. */
  'scale-factor-changed': WindowScaleEvent;
  /** Emitted when the system theme changes. */
  'theme-changed': WindowThemeEvent;
  /** Emitted during text input composition. */
  ime: WindowImeEvent;
  /** Emitted for touch-screen contact updates. */
  touch: WindowTouchEvent;
}

/**
 * Handles requests made to a window's custom URL protocol.
 * Return a Fetch API `Response` or a native custom-protocol response.
 */
export type BrowserWindowProtocolHandler = (
  request: Request,
) => Response | CustomProtocolResponse | Promise<Response | CustomProtocolResponse>;

/** Event payload for a webview request to open a new window. */
export interface PublicNewWindowEvent extends WebviewEventPayload {
  /** Always `new-window` for this event. */
  event: 'new-window';
  /** Target classification, when included in the native payload. */
  target?: 'new-window';
  /** Features requested for the new window. */
  windowFeatures?: WebviewNewWindowFeatures;
}

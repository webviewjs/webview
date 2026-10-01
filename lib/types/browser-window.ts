import type { CustomProtocolResponse, WebviewEventPayload, WebviewNewWindowFeatures } from '../../js-bindings';

export type { BrowserWindowOptions, CustomProtocolResponse, FileDialogOptions } from '../../js-bindings';

export interface WindowMoveEvent {
  event: string;
  x: number;
  y: number;
}

export interface WindowResizeEvent {
  event: string;
  width: number;
  height: number;
}

export interface WindowMouseEvent {
  event: string;
  x: number;
  y: number;
  button?: number;
  modifiers?: number;
}

export interface WindowScrollEvent {
  event: string;
  deltaX: number;
  deltaY: number;
}

export interface WindowBaseEvent {
  event: string;
}

export interface BrowserWindowCloseEvent extends WindowBaseEvent {
  readonly event: 'close';
  readonly defaultPrevented: boolean;
  preventDefault(): void;
}

export interface WindowKeyEvent {
  event: string;
  key?: string;
  code?: string;
  modifiers?: number;
  isRepeat?: boolean;
}

export interface WindowFileEvent {
  event: string;
  files?: string[];
}

export interface WindowScaleEvent {
  event: string;
  scaleFactor: number;
}

export interface WindowThemeEvent {
  event: string;
  text: 'light' | 'dark';
}

export interface WindowImeEvent {
  event: string;
  text?: string;
  phase: 'enabled' | 'preedit' | 'commit' | 'disabled';
}

export interface WindowTouchEvent {
  event: string;
  x: number;
  y: number;
  touchId: number;
  phase: 'started' | 'moved' | 'ended' | 'cancelled';
}

export interface BrowserWindowEventMap {
  move: WindowMoveEvent;
  resize: WindowResizeEvent;
  close: BrowserWindowCloseEvent;
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

export type BrowserWindowProtocolHandler = (
  request: Request,
) => Response | CustomProtocolResponse | Promise<Response | CustomProtocolResponse>;

export interface PublicNewWindowEvent extends WebviewEventPayload {
  event: 'new-window';
  target?: 'new-window';
  windowFeatures?: WebviewNewWindowFeatures;
}

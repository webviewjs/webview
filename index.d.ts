export * from './js-bindings';

export class SerializationError extends Error {
  name: 'SerializationError';
}

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ExposedTarget = Record<
  string,
  JsonValue | ((...args: any[]) => unknown | Promise<unknown>)
>;

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
}

export interface WindowScrollEvent {
  event: number;
  deltaX: number;
  deltaY: number;
}

export interface WindowBaseEvent {
  event: number;
}

export interface BrowserWindowEventMap {
  'move': WindowMoveEvent;
  'resize': WindowResizeEvent;
  'close': WindowBaseEvent;
  'focus': WindowBaseEvent;
  'blur': WindowBaseEvent;
  'mouse-enter': WindowMouseEvent;
  'mouse-leave': WindowBaseEvent;
  'mouse-move': WindowMouseEvent;
  'mouse-down': WindowMouseEvent;
  'mouse-up': WindowMouseEvent;
  'scroll': WindowScrollEvent;
}

declare module './js-bindings' {
  interface BrowserWindow {
    registerProtocol(
      name: string,
      handler: (request: CustomProtocolRequest) => CustomProtocolResponse | Promise<CustomProtocolResponse>,
    ): void;

    on<K extends keyof BrowserWindowEventMap>(event: K, listener: (payload: BrowserWindowEventMap[K]) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once<K extends keyof BrowserWindowEventMap>(event: K, listener: (payload: BrowserWindowEventMap[K]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    off<K extends keyof BrowserWindowEventMap>(event: K, listener: (payload: BrowserWindowEventMap[K]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    addListener<K extends keyof BrowserWindowEventMap>(event: K, listener: (payload: BrowserWindowEventMap[K]) => void): this;
    addListener(event: string, listener: (...args: any[]) => void): this;
    removeListener<K extends keyof BrowserWindowEventMap>(event: K, listener: (payload: BrowserWindowEventMap[K]) => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
    listenerCount(event: string): number;
    listeners(event: string): Function[];
    rawListeners(event: string): Function[];
    emit(event: string, ...args: any[]): boolean;
    eventNames(): (string | symbol)[];
  }

  interface Webview {
    expose(name: string, target: ExposedTarget): void;
  }
}

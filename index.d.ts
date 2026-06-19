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

declare module './js-bindings' {
  interface BrowserWindow {
    registerProtocol(
      name: string,
      handler: (request: CustomProtocolRequest) => CustomProtocolResponse | Promise<CustomProtocolResponse>,
    ): void;
  }

  interface Webview {
    expose(name: string, target: ExposedTarget): void;
  }
}

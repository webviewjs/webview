import type { BrowserWindow, CustomProtocolResponse, ProtocolRequest } from '../../../js-bindings';
import type { BrowserWindowProtocolHandler } from '../../types/browser-window';

export class ProtocolBridge {
  readonly #native: BrowserWindow;

  constructor(native: BrowserWindow) {
    this.#native = native;
  }

  register(name: string, handler: BrowserWindowProtocolHandler): void {
    if (this.#native.isDisposed()) {
      throw new Error('BrowserWindow has been disposed');
    }
    this.#native._registerProtocol(name, (protocolRequest) => {
      void this.#handle(protocolRequest, handler);
    });
  }

  async #handle(protocolRequest: ProtocolRequest, handler: BrowserWindowProtocolHandler): Promise<void> {
    try {
      const response = await handler(this.#toRequest(protocolRequest));
      const nativeResponse = await this.#toNativeResponse(response);
      this.#complete(protocolRequest.id, nativeResponse);
    } catch (error) {
      this.#completeSafely(protocolRequest.id, this.#errorResponse(error));
    }
  }

  #toRequest(protocolRequest: ProtocolRequest): Request {
    const headers = new Headers();
    for (const { key, value } of protocolRequest.headers ?? []) {
      if (value != null) {
        headers.set(key, value);
      }
    }

    const method = protocolRequest.method;
    const canHaveBody = !['GET', 'HEAD'].includes(method.toUpperCase());
    const requestInit: RequestInit = { method, headers };
    if (canHaveBody && protocolRequest.body?.length) {
      requestInit.body = new Uint8Array(protocolRequest.body);
    }
    return new Request(protocolRequest.url, requestInit);
  }

  async #toNativeResponse(response: Response | CustomProtocolResponse): Promise<CustomProtocolResponse> {
    if (typeof Response !== 'undefined' && response instanceof Response) {
      const body = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get('content-type') ?? 'application/octet-stream';
      const headers: Array<{ key: string; value: string }> = [];
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'content-type') {
          headers.push({ key, value });
        }
      });
      return {
        statusCode: response.status,
        body,
        mimeType,
        headers,
      };
    }
    return response as CustomProtocolResponse;
  }

  #complete(id: number, response: CustomProtocolResponse): void {
    if (this.#native.isDisposed()) {
      return;
    }
    this.#native._completeProtocol(id, response);
  }

  #completeSafely(id: number, response: CustomProtocolResponse): void {
    try {
      this.#complete(id, response);
    } catch {
      // The native request responder can be gone if the window was disposed.
    }
  }

  #errorResponse(error: unknown): CustomProtocolResponse {
    const message =
      error !== null && typeof error === 'object' && 'message' in error ? String(error.message) : String(error);
    return {
      statusCode: 500,
      body: Buffer.from(message),
      mimeType: 'text/plain',
    };
  }
}

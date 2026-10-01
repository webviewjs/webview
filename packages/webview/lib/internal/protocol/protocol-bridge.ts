import type { BrowserWindow, CustomProtocolResponse, ProtocolRequest } from '../../../js-bindings';
import type { BrowserWindowProtocolHandler } from '../../types/browser-window';

/** Adapts native custom-protocol requests to Fetch API requests and responses. */
export class ProtocolBridge {
  /** Native browser window that registered the protocol handler. */
  readonly #native: BrowserWindow;

  /**
   * Creates a bridge associated with one native browser window.
   * @param native Browser window receiving custom-protocol requests.
   */
  constructor(native: BrowserWindow) {
    this.#native = native;
  }

  /**
   * Registers a handler and forwards subsequent native protocol requests to it.
   * @param name Protocol name to register.
   * @param handler JavaScript callback that generates each protocol response.
   */
  register(name: string, handler: BrowserWindowProtocolHandler): void {
    if (this.#native.isDisposed()) {
      throw new Error('BrowserWindow has been disposed');
    }
    this.#native._registerProtocol(name, (protocolRequest) => {
      void this.#handle(protocolRequest, handler);
    });
  }

  /**
   * Runs a handler for one request and safely completes the native response.
   * @param protocolRequest Request data received from the native binding.
   * @param handler Callback registered for this protocol.
   */
  async #handle(protocolRequest: ProtocolRequest, handler: BrowserWindowProtocolHandler): Promise<void> {
    try {
      const response = await handler(this.#toRequest(protocolRequest));
      const nativeResponse = await this.#toNativeResponse(response);
      this.#complete(protocolRequest.id, nativeResponse);
    } catch (error) {
      this.#completeSafely(protocolRequest.id, this.#errorResponse(error));
    }
  }

  /**
   * Converts a native protocol request into a Fetch API `Request`.
   * @param protocolRequest Request data received from the native binding.
   */
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

  /**
   * Converts a Fetch API `Response` to the native response shape when needed.
   * @param response Response returned by the protocol handler.
   */
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

  /**
   * Completes a native protocol request if its window remains alive.
   * @param id Identifier of the native request being completed.
   * @param response Response data returned to the webview.
   */
  #complete(id: number, response: CustomProtocolResponse): void {
    if (this.#native.isDisposed()) {
      return;
    }
    this.#native._completeProtocol(id, response);
  }

  /**
   * Attempts to complete a request while suppressing races with window disposal.
   * @param id Identifier of the native request being completed.
   * @param response Response data returned to the webview.
   */
  #completeSafely(id: number, response: CustomProtocolResponse): void {
    try {
      this.#complete(id, response);
    } catch {
      // The native request responder can be gone if the window was disposed.
    }
  }

  /**
   * Creates a plain-text HTTP 500 response from an error value.
   * @param error Error thrown by the user protocol handler or response adapter.
   */
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

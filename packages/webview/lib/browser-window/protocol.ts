import type { BrowserWindow } from '../../js-bindings';
import type { BrowserWindowProtocolHandler } from '../types/browser-window';
import { ProtocolBridge } from '../internal/protocol/protocol-bridge';

/**
 * Registers a JavaScript handler for requests to a custom URL protocol.
 * @param name Protocol name used in the webview URL scheme.
 * @param handler Callback that returns a Fetch `Response` or native response value.
 */
export function registerProtocol(this: BrowserWindow, name: string, handler: BrowserWindowProtocolHandler): void {
  new ProtocolBridge(this).register(name, handler);
}

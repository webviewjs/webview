import type { BrowserWindow } from '../../js-bindings';
import type { BrowserWindowProtocolHandler } from '../types/browser-window';
import { ProtocolBridge } from '../internal/protocol/protocol-bridge';

export function registerProtocol(this: BrowserWindow, name: string, handler: BrowserWindowProtocolHandler): void {
  new ProtocolBridge(this).register(name, handler);
}

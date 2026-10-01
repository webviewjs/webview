import type { TrayEventPayload, TrayIconOptions, TrayRect } from '../js-bindings';
import { nativeBinding, type NativeTrayIcon } from './internal/native-binding';
import { NativeHandle } from './internal/native-handle';
import type { TrayEventMap } from './types/tray-icon';
import { TypedEventEmitter } from './types/events';

const INTERNAL_TRAY_ICON = Symbol('TrayIcon internal construction');

export class TrayIcon extends TypedEventEmitter<TrayEventMap> {
  readonly #handle: NativeHandle<NativeTrayIcon>;

  constructor();
  /** @internal */
  constructor(token: typeof INTERNAL_TRAY_ICON, native: NativeTrayIcon);
  constructor(token?: typeof INTERNAL_TRAY_ICON, native?: NativeTrayIcon) {
    super();
    const wrappedNative = token === INTERNAL_TRAY_ICON && native !== undefined ? native : new nativeBinding.TrayIcon();
    this.#handle = new NativeHandle(wrappedNative, 'TrayIcon');
    wrappedNative._onTrayEvent((payload) => this.#dispatchNativeEvent(payload));
  }

  /** @internal */
  static fromNative(native: NativeTrayIcon): TrayIcon {
    return new TrayIcon(INTERNAL_TRAY_ICON, native);
  }

  /** @internal */
  #dispatchNativeEvent(payload: TrayEventPayload): void {
    this.emit(payload.event, payload);
  }

  protected unwrap(): NativeTrayIcon {
    return this.#handle.unwrapForNative();
  }

  isDisposed(): boolean {
    return this.#handle.isDisposed();
  }

  dispose(): void {
    this.#handle.dispose();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  get id(): string {
    return this.unwrap().id;
  }

  setIcon(icon: Uint8Array | number[], width?: number | null, height?: number | null): void {
    this.unwrap().setIcon(icon, width, height);
  }

  removeIcon(): void {
    this.unwrap().removeIcon();
  }

  setMenu(menu?: import('../js-bindings').MenuOptions | null): void {
    this.unwrap().setMenu(menu);
  }

  setTooltip(tooltip?: string | null): void {
    this.unwrap().setTooltip(tooltip);
  }

  setTitle(title?: string | null): void {
    this.unwrap().setTitle(title);
  }

  setVisible(visible: boolean): void {
    this.unwrap().setVisible(visible);
  }

  setIconAsTemplate(value: boolean): void {
    this.unwrap().setIconAsTemplate(value);
  }

  setShowMenuOnLeftClick(value: boolean): void {
    this.unwrap().setShowMenuOnLeftClick(value);
  }

  setShowMenuOnRightClick(value: boolean): void {
    this.unwrap().setShowMenuOnRightClick(value);
  }

  showMenu(): void {
    this.unwrap().showMenu();
  }

  rect(): TrayRect | null {
    return this.unwrap().rect();
  }
}

export type { TrayIconOptions };

import type {
  ApplicationEvent,
  ApplicationOptions,
  ApplicationRunOptions,
  BrowserWindowOptions,
  MenuOptions,
  TrayIconOptions,
  WebContextOptions,
} from '../js-bindings';
import { nativeBinding, type NativeApplication } from './internal/native-binding';
import { ApplicationEventLoop } from './internal/application/event-loop';
import { BrowserWindow } from './browser-window';
import { TrayIcon } from './tray-icon';
import { WebContext } from './web-context';
import type { ApplicationEventMap, ApplicationWhenReadyOptions } from './types/application';
import { TypedEventEmitter } from './types/events';

const INTERNAL_APPLICATION = Symbol('Application internal construction');

export class Application extends TypedEventEmitter<ApplicationEventMap> {
  readonly #native: NativeApplication;
  readonly #eventLoop: ApplicationEventLoop;
  #legacyEventHandler: ((event: ApplicationEvent) => void) | null = null;

  constructor(options?: ApplicationOptions | null);
  /** @internal */
  constructor(token: typeof INTERNAL_APPLICATION, native: NativeApplication);
  constructor(optionsOrToken?: ApplicationOptions | null | typeof INTERNAL_APPLICATION, native?: NativeApplication) {
    super();
    this.#native =
      optionsOrToken === INTERNAL_APPLICATION
        ? (native as NativeApplication)
        : new nativeBinding.Application(optionsOrToken);
    this.#eventLoop = new ApplicationEventLoop(() => this.#native.pumpEvents());
    this.#native.onEvent((event) => this.#dispatchNativeEvent(event));
  }

  /** @internal */
  static fromNative(native: NativeApplication): Application {
    return new Application(INTERNAL_APPLICATION, native);
  }

  #dispatchNativeEvent(event: ApplicationEvent): void {
    this.emit(event.event, event);
    this.#legacyEventHandler?.(event);
  }

  onEvent(handler?: ((event: ApplicationEvent) => void) | null): void {
    this.#legacyEventHandler = handler ?? null;
  }

  bind(handler?: ((event: ApplicationEvent) => void) | null): void {
    this.onEvent(handler);
  }

  isReady(): boolean {
    return this.#native.isReady();
  }

  exit(): void {
    this.#native.exit();
  }

  createWebContext(options?: WebContextOptions | null): WebContext {
    return WebContext.fromNative(this.#native.createWebContext(options));
  }

  createTrayIcon(options: TrayIconOptions): TrayIcon {
    return TrayIcon.fromNative(this.#native.createTrayIcon(options));
  }

  createBrowserWindow(options?: BrowserWindowOptions | null): BrowserWindow {
    return BrowserWindow.fromNative(this.#native.createBrowserWindow(options));
  }

  createChildBrowserWindow(options?: BrowserWindowOptions | null): BrowserWindow {
    return BrowserWindow.fromNative(this.#native.createChildBrowserWindow(options));
  }

  setMenu(menuOptions?: MenuOptions | null): void {
    this.#native.setMenu(menuOptions);
  }

  pumpEvents(): boolean {
    return this.#native.pumpEvents();
  }

  runSync(): void {
    this.#native.runSync();
  }

  run(options?: ApplicationRunOptions | null): void {
    this.#eventLoop.start(options as ApplicationRunOptions | undefined);
  }

  stop(): void {
    this.#eventLoop.stop();
  }

  whenReady(options: ApplicationWhenReadyOptions = {}): Promise<void> {
    const { autoRun = true, interval, ref } = options;
    if (!autoRun) {
      if (Object.prototype.hasOwnProperty.call(options, 'interval')) {
        throw new TypeError('interval is not supported when autoRun is false');
      }
      if (Object.prototype.hasOwnProperty.call(options, 'ref')) {
        throw new TypeError('ref is not supported when autoRun is false');
      }
    }

    const ready = this.isReady()
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          this.once('ready', resolve);
        });

    if (autoRun) {
      const runOptions: ApplicationRunOptions = {};
      if (interval !== undefined) {
        runOptions.interval = interval;
      }
      if (ref !== undefined) {
        runOptions.ref = ref;
      }
      this.run(runOptions);
    }

    return ready;
  }

  [Symbol.dispose](): void {
    this.exit();
  }
}

export type { ApplicationEventMap, ApplicationOptions, ApplicationRunOptions, ApplicationWhenReadyOptions };

import type { ApplicationEvent as NativeApplicationEvent } from '../../js-bindings';

/** Native application creation, run-loop, and menu configuration options. */
export type { ApplicationOptions, ApplicationRunOptions, MenuOptions } from '../../js-bindings';

/** Event payloads emitted by an {@link Application}. */
export interface ApplicationEventMap {
  /** Emitted when a window requests that the application close. */
  'window-close-requested': NativeApplicationEvent;
  /** Emitted when the application receives a close request. */
  'application-close-requested': NativeApplicationEvent;
  /** Emitted when a custom application menu item is selected. */
  'custom-menu-click': NativeApplicationEvent;
  /** Emitted once the native application is ready to run. */
  ready: NativeApplicationEvent;
}

/**
 * Controls how {@link Application.whenReady} waits for native readiness and
 * whether it starts the JavaScript event pump.
 */
export type ApplicationWhenReadyOptions =
  | {
      /** Start the event pump automatically. Defaults to `true`. */
      autoRun?: true;
      /** Event-pump interval in milliseconds when `autoRun` is enabled. */
      interval?: number;
      /** Keep the Node.js process alive while the event pump is running. */
      ref?: boolean;
    }
  | {
      /** Wait for readiness without starting the event pump. */
      autoRun: false;
      /** Not supported when `autoRun` is `false`. */
      interval?: never;
      /** Not supported when `autoRun` is `false`. */
      ref?: never;
    };

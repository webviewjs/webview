import type { TrayEventPayload } from '../../js-bindings';

/** Maps tray-icon interaction events to their native payload type. */
export type TrayEventMap = {
  /** Emitted when the tray icon is clicked. */
  click: TrayEventPayload;
  /** Emitted when the tray icon is double-clicked. */
  'double-click': TrayEventPayload;
  /** Emitted when the pointer enters the tray icon. */
  enter: TrayEventPayload;
  /** Emitted when the pointer moves over the tray icon. */
  move: TrayEventPayload;
  /** Emitted when the pointer leaves the tray icon. */
  leave: TrayEventPayload;
};

import type { TrayEventPayload, TrayIcon } from '../../js-bindings';
import { emitEvent, eventEmitterFor } from '../internal/events/event-emitter';

/** Tracks tray icons whose native event callback has already been subscribed. */
const subscribedTrays = new WeakSet<TrayIcon>();

/** Installs the native tray-event listener once and initializes its emitter. */
export function ensureTrayEvents(target: object): void {
  const tray = target as TrayIcon;
  if (subscribedTrays.has(tray)) {
    return;
  }

  subscribedTrays.add(tray);
  eventEmitterFor(tray);
  tray._onTrayEvent((payload) => dispatchTrayEvent(tray, payload));
}

/**
 * Emits a native tray interaction on the icon's JavaScript event emitter.
 * @param tray Tray icon that received the native event.
 * @param payload Event payload received from the native binding.
 */
function dispatchTrayEvent(tray: TrayIcon, payload: TrayEventPayload): void {
  emitEvent(tray, payload.event, payload);
}

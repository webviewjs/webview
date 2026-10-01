import type { TrayEventPayload, TrayIcon } from '../../js-bindings';
import { emitEvent, eventEmitterFor } from '../internal/events/event-emitter';

const subscribedTrays = new WeakSet<TrayIcon>();

export function ensureTrayEvents(target: object): void {
  const tray = target as TrayIcon;
  if (subscribedTrays.has(tray)) {
    return;
  }

  subscribedTrays.add(tray);
  eventEmitterFor(tray);
  tray._onTrayEvent((payload) => dispatchTrayEvent(tray, payload));
}

function dispatchTrayEvent(tray: TrayIcon, payload: TrayEventPayload): void {
  emitEvent(tray, payload.event, payload);
}

import type { BrowserWindow, WindowEventPayload } from '../../js-bindings';
import { BrowserWindowCloseEvent } from '../internal/events/browser-window-close-event';
import { emitEvent, eventEmitterFor } from '../internal/events/event-emitter';

const subscribedWindows = new WeakSet<BrowserWindow>();

export function ensureBrowserWindowEvents(target: object): void {
  const window = target as BrowserWindow;
  if (subscribedWindows.has(window)) {
    return;
  }

  subscribedWindows.add(window);
  eventEmitterFor(window);
  window._onWindowEvent((payload) => dispatchWindowEvent(window, payload));
}

function dispatchWindowEvent(window: BrowserWindow, payload: WindowEventPayload): void {
  if (payload.event !== 'close') {
    emitEvent(window, payload.event, payload);
    return;
  }

  const event = new BrowserWindowCloseEvent(payload, () => window._preventClose());
  try {
    emitEvent(window, 'close', event);
  } finally {
    event.finishDispatch();
  }
}

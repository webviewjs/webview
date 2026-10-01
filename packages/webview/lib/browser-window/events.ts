import type { BrowserWindow, WindowEventPayload } from '../../js-bindings';
import { BrowserWindowCloseEvent } from '../internal/events/browser-window-close-event';
import { emitEvent, eventEmitterFor } from '../internal/events/event-emitter';

/** Tracks windows whose native event callback has already been subscribed. */
const subscribedWindows = new WeakSet<BrowserWindow>();

/** Installs the native window-event listener once and initializes its emitter. */
export function ensureBrowserWindowEvents(target: object): void {
  const window = target as BrowserWindow;
  if (subscribedWindows.has(window)) {
    return;
  }

  subscribedWindows.add(window);
  eventEmitterFor(window);
  window._onWindowEvent((payload) => dispatchWindowEvent(window, payload));
}

/**
 * Emits a window event, wrapping close requests with a dispatch-scoped cancel event.
 * @param window Window that received the native event.
 * @param payload Event payload received from the native binding.
 */
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

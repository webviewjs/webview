import { Application as NativeApplication } from '../../js-bindings';
import type { Application, ApplicationEvent, ApplicationRunOptions } from '../../js-bindings';
import { ApplicationEventLoop } from '../internal/application/event-loop';
import { emitEvent, eventEmitterFor } from '../internal/events/event-emitter';
import type { ApplicationWhenReadyOptions } from '../types/application';

interface ApplicationState {
  /** JavaScript timer responsible for pumping the native event queue. */
  eventLoop: ApplicationEventLoop;
  /** Callback registered through the legacy `onEvent` API. */
  legacyEventHandler: ((event: ApplicationEvent) => void) | null;
  /** Whether the native callback has been connected to the shared event emitter. */
  nativeEventsInstalled: boolean;
}

/** Per-instance JavaScript state kept outside native N-API objects. */
const states = new WeakMap<Application, ApplicationState>();
/** Original binding method, retained before the public compatibility method is installed. */
const nativeOnEvent = NativeApplication.prototype.onEvent;

/** Returns or lazily creates the JavaScript lifecycle state for an application. */
function stateFor(application: Application): ApplicationState {
  let state = states.get(application);
  if (state === undefined) {
    state = {
      eventLoop: new ApplicationEventLoop(() => application.pumpEvents()),
      legacyEventHandler: null,
      nativeEventsInstalled: false,
    };
    states.set(application, state);
  }
  return state;
}

/** Installs the native event callback and event-emitter state once per application. */
export function ensureApplicationEvents(target: object): void {
  const application = target as Application;
  const state = stateFor(application);
  if (state.nativeEventsInstalled) {
    return;
  }

  state.nativeEventsInstalled = true;
  const subscribe = Object.hasOwn(application, 'onEvent') ? application.onEvent : nativeOnEvent;
  subscribe.call(application, (event) => {
    emitEvent(application, event.event, event);
    state.legacyEventHandler?.(event);
  });
  eventEmitterFor(application);
}

/**
 * Sets or clears the legacy single-callback application event handler.
 * @param handler Callback invoked after the matching EventEmitter event, or `null` to clear it.
 */
export function onEvent(this: Application, handler?: ((event: ApplicationEvent) => void) | null): void {
  stateFor(this).legacyEventHandler = handler ?? null;
  ensureApplicationEvents(this);
}

/**
 * Compatibility alias that delegates to {@link onEvent}.
 * @param handler Callback invoked for native application events, or `null` to clear it.
 */
export function bind(this: Application, handler?: ((event: ApplicationEvent) => void) | null): void {
  onEvent.call(this, handler);
}

/**
 * Starts the JavaScript timer that pumps native application events.
 * @param options Polling interval and Node.js timer reference behavior.
 */
export function run(this: Application, options?: ApplicationRunOptions | null): void {
  ensureApplicationEvents(this);
  stateFor(this).eventLoop.start(options ?? undefined);
}

/** Stops the timer that pumps native application events. */
export function stop(this: Application): void {
  stateFor(this).eventLoop.stop();
}

/**
 * Resolves when the native application emits its `ready` event.
 * @param options Controls automatic event-pump startup and timer behavior.
 */
export function whenReady(this: Application, options: ApplicationWhenReadyOptions = {}): Promise<void> {
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
        this.once('ready', () => resolve());
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

/** Exits the native application when disposed with `using` or `Symbol.dispose`. */
export function disposeApplication(this: Application): void {
  this.exit();
}

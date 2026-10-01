import { Application as NativeApplication } from '../../js-bindings';
import type { Application, ApplicationEvent, ApplicationRunOptions } from '../../js-bindings';
import { ApplicationEventLoop } from '../internal/application/event-loop';
import { emitEvent, eventEmitterFor } from '../internal/events/event-emitter';
import type { ApplicationWhenReadyOptions } from '../types/application';

interface ApplicationState {
  eventLoop: ApplicationEventLoop;
  legacyEventHandler: ((event: ApplicationEvent) => void) | null;
  nativeEventsInstalled: boolean;
}

const states = new WeakMap<Application, ApplicationState>();
const nativeOnEvent = NativeApplication.prototype.onEvent;

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

export function onEvent(this: Application, handler?: ((event: ApplicationEvent) => void) | null): void {
  stateFor(this).legacyEventHandler = handler ?? null;
  ensureApplicationEvents(this);
}

export function bind(this: Application, handler?: ((event: ApplicationEvent) => void) | null): void {
  onEvent.call(this, handler);
}

export function run(this: Application, options?: ApplicationRunOptions | null): void {
  ensureApplicationEvents(this);
  stateFor(this).eventLoop.start(options ?? undefined);
}

export function stop(this: Application): void {
  stateFor(this).eventLoop.stop();
}

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

export function disposeApplication(this: Application): void {
  this.exit();
}

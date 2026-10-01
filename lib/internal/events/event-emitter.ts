import { EventEmitter } from 'node:events';

export type EventListener<TPayload> = (payload: TPayload) => void;

/** Converts payload maps into the listener-signature event maps Node expects. */
export type NodeEventMap<TEventMap extends object> = {
  [TEvent in keyof TEventMap]: [payload: TEventMap[TEvent]];
};

type RuntimeListener = (...args: any[]) => void;
type PrepareEvents = (target: object) => void;

const emitters = new WeakMap<object, EventEmitter>();

export function eventEmitterFor(target: object): EventEmitter {
  let emitter = emitters.get(target);
  if (emitter === undefined) {
    emitter = new EventEmitter();
    emitters.set(target, emitter);
  }
  return emitter;
}

export function installEventEmitterMethods<TEventMap extends object>(prototype: object, prepare?: PrepareEvents): void {
  const get = (target: object): EventEmitter<NodeEventMap<TEventMap>> => {
    prepare?.(target);
    return eventEmitterFor(target) as EventEmitter<NodeEventMap<TEventMap>>;
  };

  const on = function (this: object, event: string | symbol, listener: RuntimeListener): object {
    get(this).on(event, listener);
    return this;
  };
  const once = function (this: object, event: string | symbol, listener: RuntimeListener): object {
    get(this).once(event, listener);
    return this;
  };
  const off = function (this: object, event: string | symbol, listener: RuntimeListener): object {
    get(this).off(event, listener);
    return this;
  };
  const addListener = function (this: object, event: string | symbol, listener: RuntimeListener): object {
    get(this).addListener(event, listener);
    return this;
  };
  const removeListener = function (this: object, event: string | symbol, listener: RuntimeListener): object {
    get(this).removeListener(event, listener);
    return this;
  };
  const removeAllListeners = function (this: object, event?: string | symbol): object {
    get(this).removeAllListeners(event);
    return this;
  };
  const listenerCount = function (this: object, event: string | symbol, listener?: RuntimeListener): number {
    return get(this).listenerCount(event, listener);
  };
  const listeners = function (this: object, event: string | symbol): Function[] {
    return get(this).listeners(event);
  };
  const rawListeners = function (this: object, event: string | symbol): Function[] {
    return get(this).rawListeners(event);
  };
  const emit = function (this: object, event: string | symbol, ...args: any[]): boolean {
    return (get(this) as EventEmitter).emit(event, ...args);
  };
  const eventNames = function (this: object): Array<string | symbol> {
    return get(this).eventNames();
  };

  const methods = {
    on,
    once,
    off,
    addListener,
    removeListener,
    removeAllListeners,
    listenerCount,
    listeners,
    rawListeners,
    emit,
    eventNames,
  } as unknown as EventEmitter<NodeEventMap<TEventMap>>;

  const target = prototype as unknown as EventEmitter<NodeEventMap<TEventMap>>;
  target.on = methods.on;
  target.once = methods.once;
  target.off = methods.off;
  target.addListener = methods.addListener;
  target.removeListener = methods.removeListener;
  target.removeAllListeners = methods.removeAllListeners;
  target.listenerCount = methods.listenerCount;
  target.listeners = methods.listeners;
  target.rawListeners = methods.rawListeners;
  target.emit = methods.emit;
  target.eventNames = methods.eventNames;
}

export function emitEvent(target: object, event: string | symbol, payload: unknown): boolean {
  return eventEmitterFor(target).emit(event, payload);
}

import { EventEmitter } from 'node:events';

/** Listener type for one typed WebviewJS event payload. */
export type EventListener<TPayload> = (payload: TPayload) => void;

/** Converts payload maps into the listener-signature event maps Node expects. */
export type NodeEventMap<TEventMap extends object> = {
  [TEvent in keyof TEventMap]: [payload: TEventMap[TEvent]];
};

/** A runtime listener signature accepted by Node's event emitter. */
type RuntimeListener = (...args: any[]) => void;
/** Hook that prepares an object before its lazily-created event emitter is used. */
type PrepareEvents = (target: object) => void;

/** Lazily allocated emitters associated with native object instances. */
const emitters = new WeakMap<object, EventEmitter>();

/**
 * Returns the event emitter associated with an object, creating it on first use.
 * @param target Native object that owns the JavaScript event listeners.
 */
export function eventEmitterFor(target: object): EventEmitter {
  let emitter = emitters.get(target);
  if (emitter === undefined) {
    emitter = new EventEmitter();
    emitters.set(target, emitter);
  }
  return emitter;
}

/**
 * Adds Node.js EventEmitter methods to a native prototype without changing its class.
 * @param prototype Prototype that receives the event methods.
 * @param prepare Optional initializer called before each method accesses the emitter.
 */
export function installEventEmitterMethods<TEventMap extends object>(prototype: object, prepare?: PrepareEvents): void {
  /** Prepares the receiver before returning its typed emitter. */
  const get = (target: object): EventEmitter<NodeEventMap<TEventMap>> => {
    prepare?.(target);
    return eventEmitterFor(target) as EventEmitter<NodeEventMap<TEventMap>>;
  };

  /**
   * Adds a listener and returns the receiver for chaining.
   * @param event Event name or symbol.
   * @param listener Listener to invoke for the event.
   */
  const on = function (this: object, event: string | symbol, listener: RuntimeListener): object {
    get(this).on(event, listener);
    return this;
  };
  /**
   * Adds a listener that is removed after its first invocation.
   * @param event Event name or symbol.
   * @param listener One-time listener to invoke for the event.
   */
  const once = function (this: object, event: string | symbol, listener: RuntimeListener): object {
    get(this).once(event, listener);
    return this;
  };
  /**
   * Removes a previously registered listener and returns the receiver.
   * @param event Event name or symbol.
   * @param listener Listener to remove.
   */
  const off = function (this: object, event: string | symbol, listener: RuntimeListener): object {
    get(this).off(event, listener);
    return this;
  };
  /**
   * Node.js alias for {@link on}.
   * @param event Event name or symbol.
   * @param listener Listener to invoke for the event.
   */
  const addListener = function (this: object, event: string | symbol, listener: RuntimeListener): object {
    get(this).addListener(event, listener);
    return this;
  };
  /**
   * Node.js alias for {@link off}.
   * @param event Event name or symbol.
   * @param listener Listener to remove.
   */
  const removeListener = function (this: object, event: string | symbol, listener: RuntimeListener): object {
    get(this).removeListener(event, listener);
    return this;
  };
  /**
   * Removes all listeners, or only listeners registered for one event.
   * @param event Optional event name or symbol to limit removal.
   */
  const removeAllListeners = function (this: object, event?: string | symbol): object {
    get(this).removeAllListeners(event);
    return this;
  };
  /**
   * Returns the number of listeners registered for an event.
   * @param event Event name or symbol.
   * @param listener Optional listener whose registrations should be counted.
   */
  const listenerCount = function (this: object, event: string | symbol, listener?: RuntimeListener): number {
    return get(this).listenerCount(event, listener);
  };
  /**
   * Returns the listeners registered for an event.
   * @param event Event name or symbol.
   */
  const listeners = function (this: object, event: string | symbol): Function[] {
    return get(this).listeners(event);
  };
  /**
   * Returns the raw listeners, including one-time listener wrappers.
   * @param event Event name or symbol.
   */
  const rawListeners = function (this: object, event: string | symbol): Function[] {
    return get(this).rawListeners(event);
  };
  /**
   * Emits an event with the supplied arguments.
   * @param event Event name or symbol.
   * @param args Arguments passed to each listener.
   * @returns `true` if the event had at least one listener.
   */
  const emit = function (this: object, event: string | symbol, ...args: any[]): boolean {
    return (get(this) as EventEmitter).emit(event, ...args);
  };
  /** Returns event names that currently have registered listeners. */
  const eventNames = function (this: object): Array<string | symbol> {
    return get(this).eventNames();
  };

  /** Event methods installed on the target prototype. */
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

/**
 * Emits one event payload on the emitter associated with an object.
 * @param target Object whose listeners should receive the event.
 * @param event Event name or symbol.
 * @param payload Single payload supplied to registered listeners.
 */
export function emitEvent(target: object, event: string | symbol, payload: unknown): boolean {
  return eventEmitterFor(target).emit(event, payload);
}

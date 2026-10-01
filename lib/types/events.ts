import { EventEmitter } from 'node:events';

export type EventListener<TPayload> = (payload: TPayload) => void;

/** EventEmitter methods with payloads inferred from a public event map. */
export class TypedEventEmitter<TEventMap extends object> extends EventEmitter {
  on<K extends keyof TEventMap>(event: K, listener: EventListener<TEventMap[K]>): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  once<K extends keyof TEventMap>(event: K, listener: EventListener<TEventMap[K]>): this;
  override once(event: string | symbol, listener: (...args: any[]) => void): this;
  override once(event: string | symbol, listener: (...args: any[]) => void): this {
    super.once(event, listener);
    return this;
  }

  off<K extends keyof TEventMap>(event: K, listener: EventListener<TEventMap[K]>): this;
  override off(event: string | symbol, listener: (...args: any[]) => void): this;
  override off(event: string | symbol, listener: (...args: any[]) => void): this {
    super.off(event, listener);
    return this;
  }

  addListener<K extends keyof TEventMap>(event: K, listener: EventListener<TEventMap[K]>): this;
  override addListener(event: string | symbol, listener: (...args: any[]) => void): this;
  override addListener(event: string | symbol, listener: (...args: any[]) => void): this {
    super.addListener(event, listener);
    return this;
  }

  removeListener<K extends keyof TEventMap>(event: K, listener: EventListener<TEventMap[K]>): this;
  override removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  override removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
    super.removeListener(event, listener);
    return this;
  }

  override removeAllListeners(event?: string | symbol): this {
    super.removeAllListeners(event);
    return this;
  }

  listenerCount<K extends keyof TEventMap>(event: K, listener?: EventListener<TEventMap[K]>): number;
  override listenerCount(event: string | symbol, listener?: (...args: any[]) => void): number;
  override listenerCount(event: string | symbol, listener?: (...args: any[]) => void): number {
    return super.listenerCount(event, listener);
  }

  listeners<K extends keyof TEventMap>(event: K): Array<(...args: any[]) => void>;
  override listeners(event: string | symbol): Array<(...args: any[]) => void>;
  override listeners(event: string | symbol): Array<(...args: any[]) => void> {
    return super.listeners(event);
  }

  rawListeners<K extends keyof TEventMap>(event: K): Array<(...args: any[]) => void>;
  override rawListeners(event: string | symbol): Array<(...args: any[]) => void>;
  override rawListeners(event: string | symbol): Array<(...args: any[]) => void> {
    return super.rawListeners(event);
  }

  emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): boolean;
  override emit(event: string | symbol, ...args: any[]): boolean;
  override emit(event: string | symbol, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }
}

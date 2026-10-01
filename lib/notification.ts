import { TypedEventEmitter } from './types/events';
import type { NativeNotificationAction, NativeNotificationOptions, NotificationEventPayload } from '../js-bindings';
import { nativeBinding } from './internal/native-binding';

export type NotificationPermission = 'granted';
export type NotificationDirection = 'auto' | 'ltr' | 'rtl';
export type NotificationEventName = 'click' | 'close' | 'error' | 'show';

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationOptions {
  body?: string;
  icon?: string;
  image?: string | Buffer;
  badge?: string;
  tag?: string;
  data?: unknown;
  dir?: NotificationDirection;
  lang?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  persistent?: boolean;
  actions?: NotificationAction[];
  silent?: boolean;
  timestamp?: number;
  vibrate?: number | number[];
}

export interface NotificationEvent {
  type: NotificationEventName;
  target: Notification;
  action?: string;
  error?: Error;
}

export interface NotificationEventMap {
  click: NotificationEvent;
  close: NotificationEvent;
  error: NotificationEvent;
  show: NotificationEvent;
}

interface NormalizedNotificationOptions {
  body: string;
  icon: string;
  image: string | Buffer;
  badge: string;
  tag: string;
  data: unknown;
  dir: NotificationDirection;
  lang: string;
  renotify: boolean;
  requireInteraction: boolean;
  persistent: boolean;
  actions: Array<{ action: string; title: string; icon: string }>;
  silent: boolean;
  timestamp: number;
  vibrate: number | number[];
}

export class Notification extends TypedEventEmitter<NotificationEventMap> {
  readonly #native: InstanceType<typeof nativeBinding.NativeNotification>;
  readonly #handlers = new Map<NotificationEventName, (event: NotificationEvent) => void>();
  readonly #options: NormalizedNotificationOptions;
  readonly #title: string;

  constructor(title: string, options: NotificationOptions = {}) {
    super();

    if (options.image !== undefined && typeof options.image !== 'string' && !Buffer.isBuffer(options.image)) {
      throw new TypeError('Notification image must be a file path string or Buffer');
    }
    if (options.actions !== undefined && !Array.isArray(options.actions)) {
      throw new TypeError('Notification actions must be an array');
    }

    const persistent = options.persistent ?? false;
    const actions = (options.actions ?? []).map((action) => ({
      action: String(action.action),
      title: String(action.title),
      icon: action.icon === undefined ? '' : String(action.icon),
    }));
    if (actions.length > 0 && !persistent) {
      throw new TypeError('Notification actions require persistent: true');
    }

    this.#title = String(title);
    this.#options = {
      body: options.body ?? '',
      icon: options.icon ?? '',
      image: options.image ?? '',
      badge: options.badge ?? '',
      tag: options.tag ?? '',
      data: options.data,
      dir: options.dir ?? 'auto',
      lang: options.lang ?? '',
      renotify: options.renotify ?? false,
      requireInteraction: options.requireInteraction ?? false,
      persistent,
      actions,
      silent: options.silent ?? false,
      timestamp: options.timestamp ?? Date.now(),
      vibrate: options.vibrate ?? [],
    };

    const nativeOptions: NativeNotificationOptions = {
      title: this.#title,
      body: this.#options.body || undefined,
      icon: this.#options.icon || undefined,
      imagePath: typeof this.#options.image === 'string' ? this.#options.image || undefined : undefined,
      imageData: Buffer.isBuffer(this.#options.image) ? this.#options.image : undefined,
      requireInteraction: this.#options.requireInteraction,
      persistent: this.#options.persistent,
      actions: this.#options.actions.map((action): NativeNotificationAction => ({
        action: action.action,
        title: action.title,
        icon: action.icon || undefined,
      })),
    };

    this.#native = new nativeBinding.NativeNotification(
      nativeOptions,
      (error: Error | null, payload: NotificationEventPayload) => {
        if (error) {
          this.#dispatch({ event: 'error', error: error.message });
        } else {
          this.#dispatch(payload);
        }
      },
    );
  }

  static get permission(): NotificationPermission {
    return 'granted';
  }

  static requestPermission(): Promise<NotificationPermission> {
    return Promise.resolve('granted');
  }

  #dispatch(payload: NotificationEventPayload): void {
    const type = payload.event as NotificationEventName;
    const event: NotificationEvent = {
      type,
      target: this,
      action: payload.action,
      error: payload.error === undefined ? undefined : new Error(payload.error),
    };
    this.emit(type, event);
    this.#handlers.get(type)?.call(this, event);
  }

  close(): void {
    this.#native.close();
  }

  get title(): string {
    return this.#title;
  }

  get body(): string {
    return this.#options.body;
  }

  get icon(): string {
    return this.#options.icon;
  }

  get image(): string | Buffer {
    return this.#options.image;
  }

  get badge(): string {
    return this.#options.badge;
  }

  get tag(): string {
    return this.#options.tag;
  }

  get data(): unknown {
    return this.#options.data;
  }

  get dir(): NotificationDirection {
    return this.#options.dir;
  }

  get lang(): string {
    return this.#options.lang;
  }

  get renotify(): boolean {
    return this.#options.renotify;
  }

  get requireInteraction(): boolean {
    return this.#options.requireInteraction;
  }

  get persistent(): boolean {
    return this.#options.persistent;
  }

  get actions(): NotificationAction[] {
    return this.#options.actions;
  }

  get silent(): boolean {
    return this.#options.silent;
  }

  get timestamp(): number {
    return this.#options.timestamp;
  }

  get vibrate(): number | number[] {
    return this.#options.vibrate;
  }

  get onclick(): ((event: NotificationEvent) => void) | null {
    return this.#handlers.get('click') ?? null;
  }

  set onclick(listener: ((event: NotificationEvent) => void) | null) {
    this.#setHandler('click', listener);
  }

  get onclose(): ((event: NotificationEvent) => void) | null {
    return this.#handlers.get('close') ?? null;
  }

  set onclose(listener: ((event: NotificationEvent) => void) | null) {
    this.#setHandler('close', listener);
  }

  get onerror(): ((event: NotificationEvent) => void) | null {
    return this.#handlers.get('error') ?? null;
  }

  set onerror(listener: ((event: NotificationEvent) => void) | null) {
    this.#setHandler('error', listener);
  }

  get onshow(): ((event: NotificationEvent) => void) | null {
    return this.#handlers.get('show') ?? null;
  }

  set onshow(listener: ((event: NotificationEvent) => void) | null) {
    this.#setHandler('show', listener);
  }

  #setHandler(type: NotificationEventName, listener: ((event: NotificationEvent) => void) | null): void {
    if (listener == null) {
      this.#handlers.delete(type);
      return;
    }
    if (typeof listener !== 'function') {
      throw new TypeError('on' + type + ' must be a function or null');
    }
    this.#handlers.set(type, listener);
  }
}

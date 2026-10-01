import { EventEmitter } from 'node:events';
import type { NodeEventMap } from './internal/events/event-emitter';
import type { NativeNotificationAction, NativeNotificationOptions, NotificationEventPayload } from '../js-bindings';
import { NativeNotification } from '../js-bindings';

/** Permission state returned by this native notification implementation. */
export type NotificationPermission = 'granted';
/** Text direction used to lay out notification content. */
export type NotificationDirection = 'auto' | 'ltr' | 'rtl';
/** Event names emitted by {@link Notification}. */
export type NotificationEventName = 'click' | 'close' | 'error' | 'show';

/** An action button shown by a persistent notification. */
export interface NotificationAction {
  /** Identifier delivered in the notification's click event. */
  action: string;
  /** User-facing label for the action button. */
  title: string;
  /** Optional icon path for the action button. */
  icon?: string;
}

/** Options used to create a native desktop notification. */
export interface NotificationOptions {
  /** Text displayed beneath the notification title. */
  body?: string;
  /** Path to the notification icon. */
  icon?: string;
  /** Image path or encoded image bytes displayed with the notification. */
  image?: string | Buffer;
  /** Badge image path retained on the instance; not currently used by the native backend. */
  badge?: string;
  /** Tag retained on the instance; the current native backend does not group notifications by tag. */
  tag?: string;
  /** Application-defined value retained on the notification object for later access. */
  data?: unknown;
  /** Text direction retained on the instance; native notification rendering does not currently apply it. */
  dir?: NotificationDirection;
  /** Language tag retained on the instance; native notification rendering does not currently apply it. */
  lang?: string;
  /** Renotify setting retained on the instance; the current native backend does not apply it. */
  renotify?: boolean;
  /** Requests that the notification remain visible until the user acts. */
  requireInteraction?: boolean;
  /** Keeps the notification active so it can provide action buttons. */
  persistent?: boolean;
  /** Action buttons; requires `persistent: true`. */
  actions?: NotificationAction[];
  /** Silent setting retained on the instance; the current native backend does not apply it. */
  silent?: boolean;
  /** Timestamp retained on the instance in milliseconds since the Unix epoch. */
  timestamp?: number;
  /** Vibration pattern retained on the instance; the current native backend does not apply it. */
  vibrate?: number | number[];
}

/** Event emitted by a {@link Notification}. */
export interface NotificationEvent {
  /** Name of the notification event. */
  type: NotificationEventName;
  /** Notification object that emitted the event. */
  target: Notification;
  /** Action identifier for an action-button click. */
  action?: string;
  /** Error reported while displaying the notification. */
  error?: Error;
}

/** Maps notification event names to the shared notification event payload. */
export interface NotificationEventMap {
  /** Emitted when the notification or one of its actions is clicked. */
  click: NotificationEvent;
  /** Emitted when the notification is closed. */
  close: NotificationEvent;
  /** Emitted when displaying the notification fails. */
  error: NotificationEvent;
  /** Emitted when the notification becomes visible. */
  show: NotificationEvent;
}

/** Fully populated options passed to the native notification binding. */
interface NormalizedNotificationOptions {
  /** Notification body text. */
  body: string;
  /** Notification icon path. */
  icon: string;
  /** Image path or bytes. */
  image: string | Buffer;
  /** Badge image path. */
  badge: string;
  /** Notification grouping identifier. */
  tag: string;
  /** Application-defined notification data. */
  data: unknown;
  /** Text direction. */
  dir: NotificationDirection;
  /** Language tag. */
  lang: string;
  /** Whether same-tag notifications may alert again. */
  renotify: boolean;
  /** Whether to request persistent display. */
  requireInteraction: boolean;
  /** Whether action buttons are enabled. */
  persistent: boolean;
  /** Normalized action-button definitions. */
  actions: Array<{ action: string; title: string; icon: string }>;
  /** Whether alerting behavior is suppressed. */
  silent: boolean;
  /** Notification timestamp in milliseconds since the Unix epoch. */
  timestamp: number;
  /** Vibration pattern. */
  vibrate: number | number[];
}

/** A native desktop notification with Node.js event-emitter support. */
export class Notification extends EventEmitter<NodeEventMap<NotificationEventMap>> {
  /** Native notification handle used to display and close the notification. */
  readonly #native: NativeNotification;
  /** DOM-style event-property listeners registered on this notification. */
  readonly #handlers = new Map<NotificationEventName, (event: NotificationEvent) => void>();
  /** Complete normalized option values exposed by the instance getters. */
  readonly #options: NormalizedNotificationOptions;
  /** Title supplied when the notification was created. */
  readonly #title: string;

  /**
   * Creates and displays a native notification.
   * @param title Text shown as the notification title.
   * @param options Optional notification content and behavior settings.
   */
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

    this.#native = new NativeNotification(nativeOptions, (error: Error | null, payload: NotificationEventPayload) => {
      if (error) {
        this.#dispatch({ event: 'error', error: error.message });
      } else {
        this.#dispatch(payload);
      }
    });
  }

  /** Permission reported by the native notification implementation. */
  static get permission(): NotificationPermission {
    return 'granted';
  }

  /** Resolves immediately with the permission currently reported by the native implementation. */
  static requestPermission(): Promise<NotificationPermission> {
    return Promise.resolve('granted');
  }

  /**
   * Dispatches a native notification event through both event-listener APIs.
   * @param payload Event payload received from the native notification.
   */
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

  /** Closes the native notification. */
  close(): void {
    this.#native.close();
  }

  /** Notification title supplied to the constructor. */
  get title(): string {
    return this.#title;
  }

  /** Body text supplied at construction, or an empty string. */
  get body(): string {
    return this.#options.body;
  }

  /** Icon path supplied at construction, or an empty string. */
  get icon(): string {
    return this.#options.icon;
  }

  /** Image path or bytes supplied at construction, or an empty string. */
  get image(): string | Buffer {
    return this.#options.image;
  }

  /** Badge image path supplied at construction, or an empty string; not currently used by the native backend. */
  get badge(): string {
    return this.#options.badge;
  }

  /** Tag supplied at construction, or an empty string; the native backend does not group by tag. */
  get tag(): string {
    return this.#options.tag;
  }

  /** Application-defined data supplied at construction. */
  get data(): unknown {
    return this.#options.data;
  }

  /** Text direction supplied at construction; defaults to `auto` and is not applied by the native renderer. */
  get dir(): NotificationDirection {
    return this.#options.dir;
  }

  /** Language tag supplied at construction, or an empty string; not applied by the native renderer. */
  get lang(): string {
    return this.#options.lang;
  }

  /** Renotify value supplied at construction; retained on the instance but not applied natively. */
  get renotify(): boolean {
    return this.#options.renotify;
  }

  /** Whether the notification requests persistent visibility. */
  get requireInteraction(): boolean {
    return this.#options.requireInteraction;
  }

  /** Whether this notification supports action buttons. */
  get persistent(): boolean {
    return this.#options.persistent;
  }

  /** Action buttons supplied at construction. */
  get actions(): NotificationAction[] {
    return this.#options.actions;
  }

  /** Silent value supplied at construction; retained on the instance but not applied natively. */
  get silent(): boolean {
    return this.#options.silent;
  }

  /** Timestamp supplied at construction, or the creation time; retained on the instance. */
  get timestamp(): number {
    return this.#options.timestamp;
  }

  /** Vibration pattern supplied at construction, or an empty pattern; not applied by the native backend. */
  get vibrate(): number | number[] {
    return this.#options.vibrate;
  }

  /** Click event-property listener, or `null` when none is registered. */
  get onclick(): ((event: NotificationEvent) => void) | null {
    return this.#handlers.get('click') ?? null;
  }

  /** Sets the click event-property listener; assigning `null` clears it. */
  set onclick(listener: ((event: NotificationEvent) => void) | null) {
    this.#setHandler('click', listener);
  }

  /** Close event-property listener, or `null` when none is registered. */
  get onclose(): ((event: NotificationEvent) => void) | null {
    return this.#handlers.get('close') ?? null;
  }

  /** Sets the close event-property listener; assigning `null` clears it. */
  set onclose(listener: ((event: NotificationEvent) => void) | null) {
    this.#setHandler('close', listener);
  }

  /** Error event-property listener, or `null` when none is registered. */
  get onerror(): ((event: NotificationEvent) => void) | null {
    return this.#handlers.get('error') ?? null;
  }

  /** Sets the error event-property listener; assigning `null` clears it. */
  set onerror(listener: ((event: NotificationEvent) => void) | null) {
    this.#setHandler('error', listener);
  }

  /** Show event-property listener, or `null` when none is registered. */
  get onshow(): ((event: NotificationEvent) => void) | null {
    return this.#handlers.get('show') ?? null;
  }

  /** Sets the show event-property listener; assigning `null` clears it. */
  set onshow(listener: ((event: NotificationEvent) => void) | null) {
    this.#setHandler('show', listener);
  }

  /**
   * Replaces or removes the stored listener for one notification event type.
   * @param type Notification event name to update.
   * @param listener Listener to store, or `null` to remove the current listener.
   */
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

import type {
  ApplicationEvent,
  IpcMessage,
  NativeNotificationOptions,
  NotificationEventPayload,
  ProtocolRequest,
  TrayEventPayload,
  WebviewEventPayload,
  WindowEventPayload,
} from '../../js-bindings';
import * as binding from './bindings';
import type { Application, BrowserWindow, TrayIcon, Webview } from './bindings';
import type { FakeState, NativeCall } from './bindings';

const notificationOwners = new WeakMap<object, object>();
const claimedNotifications = new WeakSet<object>();

interface NotificationView {
  title: string;
  body: string;
  icon: string;
  image: string | Buffer;
  requireInteraction: boolean;
  persistent: boolean;
  actions: Array<{ action: string; title: string; icon: string }>;
}

type Handle<T extends object, Methods extends object> = {
  instance: T;
  calls: NativeCall[];
  constructorArgs: unknown[];
  readonly disposed: boolean;
  readonly closed: boolean;
} & Methods;

function handle<T extends object, Methods extends object>(
  kind: FakeState['kind'],
  instance: T,
  methods: Methods,
): Handle<T, Methods> {
  const state = binding.__stateFor(instance, kind);
  const base = Object.defineProperties(
    { instance, calls: state.calls, constructorArgs: state.constructorArgs },
    {
      disposed: { enumerable: true, get: () => state.disposed },
      closed: { enumerable: true, get: () => state.closed },
    },
  );
  return Object.assign(base, methods) as Handle<T, Methods>;
}

function eventPayload<T extends { event: string }>(event: string | T, fields: Record<string, unknown>): T {
  return (typeof event === 'string' ? { ...fields, event } : event) as T;
}

const native = {
  application(application: Application) {
    return handle('application', application, {
      emit(event: string | ApplicationEvent, fields: Record<string, unknown> = {}): void {
        const state = binding.__stateFor(application, 'application');
        if (!state.callback) throw new Error('Application has no registered native event callback');
        const payload = eventPayload<ApplicationEvent>(event, fields);
        if (payload.event === 'ready') state.ready = true;
        state.callback(payload);
      },
      setPumpResult(result: boolean): void {
        if (typeof result !== 'boolean') throw new TypeError('setPumpResult requires a boolean');
        binding.__stateFor(application, 'application').pumpResult = result;
      },
      setReady(ready = true): void {
        binding.__stateFor(application, 'application').ready = ready;
      },
      get exited(): boolean {
        return binding.__stateFor(application, 'application').exited;
      },
    });
  },

  window(window: BrowserWindow) {
    return handle('window', window, {
      emit(event: string | WindowEventPayload, fields: Record<string, unknown> = {}): boolean {
        const state = binding.__stateFor(window, 'window');
        if (state.disposed) return false;
        if (!state.windowCallback) throw new Error('BrowserWindow has no registered native event callback');
        state.windowCallback(eventPayload<WindowEventPayload>(event, fields));
        return true;
      },
      requestProtocol(name: string, request: ProtocolRequest): boolean {
        const state = binding.__stateFor(window, 'window');
        if (state.disposed) return false;
        const callback = state.protocols.get(name);
        if (!callback) throw new Error(`No fake protocol handler registered for ${name}`);
        callback(request);
        return true;
      },
      setPreventCloseResult(result: boolean): void {
        if (typeof result !== 'boolean') throw new TypeError('setPreventCloseResult requires a boolean');
        binding.__stateFor(window, 'window').preventCloseResult = result;
      },
      webview(index = 0): Webview {
        const webview = binding.__stateFor(window, 'window').webviews[index];
        if (!webview) throw new RangeError(`No webview at index ${index}`);
        return webview;
      },
      navigate(view: Webview, url: string): boolean {
        const callback = binding.__stateFor(view, 'webview').navigationCallback;
        return callback ? callback(url) : true;
      },
      requestNewWindow(view: Webview, payload: WebviewEventPayload): boolean {
        const callback = binding.__stateFor(view, 'webview').newWindowCallback;
        return callback ? callback(payload) : true;
      },
      get completedProtocols(): FakeState['completedProtocols'] {
        return binding.__stateFor(window, 'window').completedProtocols;
      },
      get protocols(): FakeState['protocols'] {
        return binding.__stateFor(window, 'window').protocols;
      },
      get webviews(): Webview[] {
        return binding.__stateFor(window, 'window').webviews;
      },
    });
  },

  webview(webview: Webview) {
    return handle('webview', webview, {
      emit(event: string | WebviewEventPayload, fields: Record<string, unknown> = {}): boolean {
        const state = binding.__stateFor(webview, 'webview');
        if (state.disposed) return false;
        if (!state.webviewCallback) throw new Error('Webview has no native event callback');
        state.webviewCallback(null, eventPayload<WebviewEventPayload>(event, fields));
        return true;
      },
      emitError(error: Error): boolean {
        const state = binding.__stateFor(webview, 'webview');
        if (state.disposed) return false;
        if (!state.webviewCallback) throw new Error('Webview has no native event callback');
        state.webviewCallback(error, undefined);
        return true;
      },
      postIpc(message: unknown): boolean {
        const state = binding.__stateFor(webview, 'webview');
        if (state.disposed) return false;
        if (!state.callback) throw new Error('Webview has no registered native IPC handler');
        const body =
          typeof message === 'string'
            ? Buffer.from(message)
            : Buffer.isBuffer(message)
              ? message
              : typeof message === 'object' && message !== null && Buffer.isBuffer((message as { body?: unknown }).body)
                ? null
                : Buffer.from(String(message));
        const ipcMessage: IpcMessage | unknown = body === null ? message : { body };
        state.callback(ipcMessage);
        return true;
      },
      callExposed(call: Record<string, unknown>): boolean {
        const payload = Buffer.from(JSON.stringify({ __e: true, ...call }));
        const state = binding.__stateFor(webview, 'webview');
        if (state.disposed) return false;
        if (!state.callback) throw new Error('Webview has no registered native IPC handler');
        state.callback({ body: payload });
        return true;
      },
      get exposed(): FakeState['exposed'] {
        return binding.__stateFor(webview, 'webview').exposed;
      },
      get scripts(): string[] {
        return binding.__stateFor(webview, 'webview').scripts;
      },
      get ipcHandler(): ((...args: any[]) => void) | null {
        return binding.__stateFor(webview, 'webview').callback;
      },
      get createArgs(): unknown[] | undefined {
        return binding.__stateFor(webview, 'webview').createArgs;
      },
    });
  },

  tray(tray: TrayIcon) {
    return handle('tray', tray, {
      emit(event: string | TrayEventPayload, fields: Record<string, unknown> = {}): boolean {
        const state = binding.__stateFor(tray, 'tray');
        if (state.disposed) return false;
        if (!state.trayCallback) throw new Error('TrayIcon has no registered native event callback');
        state.trayCallback(eventPayload<TrayEventPayload>(event, fields));
        return true;
      },
      get createdWith(): unknown {
        return binding.__stateFor(tray, 'tray').createdWith;
      },
    });
  },

  notification(notification: NotificationView) {
    let instance = notificationOwners.get(notification);
    if (!instance) {
      try {
        binding.__stateFor(notification, 'notification');
        instance = notification;
      } catch {
        instance = binding.__allNotifications.find((candidate) => {
          const state = binding.__stateFor(candidate, 'notification');
          const options = state.options;
          if (!options || claimedNotifications.has(candidate)) return false;
          const imagePath = typeof notification.image === 'string' ? notification.image || undefined : undefined;
          const imageData = Buffer.isBuffer(notification.image) ? notification.image : undefined;
          const actions = notification.actions.map(({ action, title, icon }) => ({
            action,
            title,
            icon: icon || undefined,
          }));
          return (
            options.title === notification.title &&
            (options.body ?? '') === notification.body &&
            (options.icon ?? '') === notification.icon &&
            options.imagePath === imagePath &&
            options.imageData === imageData &&
            options.requireInteraction === notification.requireInteraction &&
            options.persistent === notification.persistent &&
            JSON.stringify(options.actions) === JSON.stringify(actions)
          );
        });
        if (instance) {
          notificationOwners.set(notification, instance);
          claimedNotifications.add(instance);
        }
      }
    }
    if (!instance) throw new Error('No fake native notification matches this Notification instance');
    const nativeNotification = instance;
    return handle('notification', nativeNotification, {
      emit(event: string | NotificationEventPayload, fields: Record<string, unknown> = {}): void {
        const state = binding.__stateFor(nativeNotification, 'notification');
        const callback = state.callback;
        if (!callback) throw new Error('NativeNotification has no event callback');
        callback(null, eventPayload<NotificationEventPayload>(event, fields));
      },
      show(): void {
        this.emit('show');
      },
      fail(error: Error): void {
        const callback = binding.__stateFor(nativeNotification, 'notification').callback;
        if (!callback) throw new Error('NativeNotification has no event callback');
        callback(error, undefined);
      },
      get options(): NativeNotificationOptions | undefined {
        return binding.__stateFor(nativeNotification, 'notification').options;
      },
      get instance(): object {
        return nativeNotification;
      },
    });
  },
};

export { native, binding };

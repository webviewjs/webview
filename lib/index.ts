import './augmentations';
import './install';

export { Application, BrowserWindow, NativeNotification, TrayIcon, WebContext, Webview } from '../js-bindings';
export {
  NativeNotification as JsNotification,
  TrayIcon as JsTrayIcon,
  WebContext as JsWebContext,
  Webview as JsWebview,
} from '../js-bindings';

export {
  Notification,
  type NotificationAction,
  type NotificationDirection,
  type NotificationEvent,
  type NotificationEventMap,
  type NotificationEventName,
  type NotificationOptions,
  type NotificationPermission,
} from './notification';
export { SerializationError } from './errors/serialization-error';

export {
  ControlFlow,
  CursorType,
  FullscreenType,
  IosValidOrientations,
  ProgressBarState,
  Theme,
  WebviewApplicationEvent,
  WebviewEventType,
  WindowCommand,
  WindowEventType,
  VERSION,
  applyUriWorkAround,
  getWebviewVersion,
  isWorkAroundUri,
  originalUriPrefix,
  revertUriWorkAround,
  workAroundUriPrefix,
} from '../js-bindings';

export type {
  AndroidContentRect,
  ApplicationEvent,
  ApplicationOptions,
  ApplicationRunOptions,
  BrowserWindowOptions,
  CustomMenuEvent,
  CustomProtocolRequest,
  CustomProtocolResponse,
  Dimensions,
  ExposeCallData,
  FileDialogOptions,
  FileFilter,
  HeaderData,
  IpcMessage,
  JsProgressBar,
  MenuItemOptions,
  MenuOptions,
  Monitor,
  NativeNotificationAction,
  NativeNotificationOptions,
  NotificationEventPayload,
  Position,
  ProtocolRequest,
  TrayEventPayload,
  TrayIconImage,
  TrayIconOptions,
  TrayRect,
  VideoMode,
  WebContextOptions,
  WebviewBounds,
  WebviewCookie,
  WebviewEventPayload,
  WebviewNewWindowFeatures,
  WebviewWindowPosition,
  WebviewWindowSize,
  WindowEventPayload,
} from '../js-bindings';

export type { ApplicationEventMap, ApplicationWhenReadyOptions } from './types/application';
export type {
  BrowserWindowCloseEvent,
  BrowserWindowEventMap,
  BrowserWindowProtocolHandler,
  PublicNewWindowEvent,
  WindowBaseEvent,
  WindowFileEvent,
  WindowImeEvent,
  WindowKeyEvent,
  WindowMouseEvent,
  WindowMoveEvent,
  WindowResizeEvent,
  WindowScaleEvent,
  WindowScrollEvent,
  WindowThemeEvent,
  WindowTouchEvent,
} from './types/browser-window';
export type { EventListener, TypedEventEmitter } from './types/events';
export type {
  ExposedTarget,
  JsonValue,
  WebviewDownloadEvent,
  WebviewDownloadStartedEvent,
  WebviewEventMap,
  WebviewNavigationEvent,
  WebviewNewWindowEvent,
  WebviewOptions,
  WebviewPageLoadEvent,
  WebviewTitleChangedEvent,
} from './types/webview';
export type { TrayEventMap } from './types/tray-icon';

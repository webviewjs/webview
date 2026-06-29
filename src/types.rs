use napi::bindgen_prelude::{BigInt, Buffer};
use napi_derive::napi;

#[napi]
pub enum WindowCommand {
  Close,
  Show,
  Hide,
}

#[napi]
pub enum X11WindowType {
  Desktop,
  Dock,
  Toolbar,
  Menu,
  Utility,
  Splash,
  Dialog,
  DropdownMenu,
  PopupMenu,
  Tooltip,
  Notification,
  Combo,
  Dnd,
  Normal,
}

#[napi]
pub enum IosValidOrientations {
  LandscapeAndPortrait,
  Landscape,
  Portrait,
}

#[napi(object)]
pub struct TrayIconImage {
  pub data: Buffer,
  pub width: Option<u32>,
  pub height: Option<u32>,
}

#[napi(object)]
pub struct TrayIconOptions {
  pub id: Option<String>,
  pub icon: Option<TrayIconImage>,
  pub tooltip: Option<String>,
  pub title: Option<String>,
  pub menu: Option<MenuOptions>,
  pub icon_is_template: Option<bool>,
  pub menu_on_left_click: Option<bool>,
  pub menu_on_right_click: Option<bool>,
}

#[napi(object)]
pub struct TrayRect {
  pub x: f64,
  pub y: f64,
  pub width: u32,
  pub height: u32,
}

#[napi(object)]
pub struct TrayEventPayload {
  pub event: String,
  pub id: String,
  pub x: f64,
  pub y: f64,
  pub rect: TrayRect,
  pub button: Option<String>,
  pub button_state: Option<String>,
}

#[napi(object)]
pub struct AndroidContentRect {
  pub left: i32,
  pub top: i32,
  pub right: i32,
  pub bottom: i32,
}

#[napi]
pub enum WebviewApplicationEvent {
  WindowCloseRequested,
  ApplicationCloseRequested,
  CustomMenuClick,
  Ready,
}

#[napi]
pub enum WindowEventType {
  Moved,
  Resized,
  CloseRequested,
  Focused,
  Blurred,
  MouseEnter,
  MouseLeave,
  MouseMove,
  MouseDown,
  MouseUp,
  Scroll,
  KeyDown,
  KeyUp,
  FileDrop,
  FileHover,
  FileHoverCancelled,
  ScaleFactorChanged,
  ThemeChanged,
  Ime,
  Touch,
}

#[napi(object)]
pub struct WindowEventPayload {
  pub event: WindowEventType,
  /// Physical x position (cursor or window).
  pub x: Option<f64>,
  /// Physical y position (cursor or window).
  pub y: Option<f64>,
  /// Physical width (resize event).
  pub width: Option<u32>,
  /// Physical height (resize event).
  pub height: Option<u32>,
  /// Mouse button index: 0=left, 1=middle, 2=right.
  pub button: Option<u32>,
  /// Horizontal scroll delta (pixels).
  pub delta_x: Option<f64>,
  /// Vertical scroll delta (pixels).
  pub delta_y: Option<f64>,
  /// Logical key name (DOM KeyboardEvent.key, e.g. "a", "Enter", "ArrowLeft").
  pub key: Option<String>,
  /// Physical key code (DOM KeyboardEvent.code, e.g. "KeyA", "ArrowLeft").
  pub code: Option<String>,
  /// Modifier bitmask: 1=Shift, 2=Ctrl, 4=Alt, 8=Meta/Super/Command.
  pub modifiers: Option<u32>,
  /// Whether this key event is a repeat from holding the key down.
  pub is_repeat: Option<bool>,
  /// File paths for FileDrop / FileHover events.
  pub files: Option<Vec<String>>,
  /// DPI scale factor for ScaleFactorChanged events.
  pub scale_factor: Option<f64>,
  /// Text for Ime events (preedit string or committed text);
  /// "light" or "dark" for ThemeChanged events.
  pub text: Option<String>,
  /// Touch point identifier (cast from u64) for Touch events.
  pub touch_id: Option<f64>,
  /// Phase string: "started"/"moved"/"ended"/"cancelled" for Touch;
  /// "enabled"/"preedit"/"commit"/"disabled" for Ime events.
  pub phase: Option<String>,
}

#[napi(object)]
pub struct CustomMenuEvent {
  pub id: String,
  pub window_id: u32,
}

#[napi(object)]
#[derive(Clone)]
pub struct MenuItemOptions {
  pub id: Option<String>,
  pub label: Option<String>,
  pub enabled: Option<bool>,
  pub accelerator: Option<String>,
  pub submenu: Option<MenuOptions>,
  pub role: Option<String>,
}

#[napi(object)]
#[derive(Clone)]
pub struct MenuOptions {
  pub items: Vec<MenuItemOptions>,
}

#[napi(object)]
pub struct HeaderData {
  pub key: String,
  pub value: Option<String>,
}

#[napi(object)]
pub struct IpcMessage {
  pub body: Buffer,
  pub method: String,
  pub headers: Vec<HeaderData>,
  pub uri: String,
}

/// Kept for backward compat; no longer used internally.
#[napi(js_name = "ControlFlow")]
pub enum JsControlFlow {
  Poll,
  Wait,
  WaitUntil,
  Exit,
  ExitWithCode,
}

#[napi(object)]
pub struct ApplicationOptions {
  pub control_flow: Option<JsControlFlow>,
  pub wait_time: Option<i32>,
  pub exit_code: Option<i32>,
}

#[napi(object)]
pub struct ApplicationEvent {
  pub event: WebviewApplicationEvent,
  pub custom_menu_event: Option<CustomMenuEvent>,
}

#[napi(object)]
pub struct ApplicationRunOptions {
  /** The interval in milliseconds to pump events. Defaults to 16 (60 FPS). */
  pub interval: Option<u32>,
  /** Whether to keep the event loop alive. Defaults to true. */
  pub ref_: Option<bool>,
}

// ── browser_window types ──────────────────────────────────────────────────────

#[napi]
pub enum FullscreenType {
  Exclusive,
  Borderless,
}

#[napi(object)]
pub struct Dimensions {
  pub width: u32,
  pub height: u32,
}

#[napi(object)]
pub struct Position {
  pub x: i32,
  pub y: i32,
}

#[napi(object, js_name = "VideoMode")]
pub struct JsVideoMode {
  pub size: Dimensions,
  pub bit_depth: u16,
  pub refresh_rate: u16,
}

#[napi(object)]
pub struct Monitor {
  pub name: Option<String>,
  pub scale_factor: f64,
  pub size: Dimensions,
  pub position: Position,
  pub video_modes: Vec<JsVideoMode>,
}

#[napi(js_name = "ProgressBarState")]
pub enum JsProgressBarState {
  None,
  Normal,
  Indeterminate,
  Paused,
  Error,
}

#[napi(object)]
pub struct JsProgressBar {
  pub state: Option<JsProgressBarState>,
  pub progress: Option<u32>,
}

/// Cursor shape passed to [`BrowserWindow::set_cursor`].
#[napi]
pub enum CursorType {
  Default,
  Crosshair,
  Hand,
  Arrow,
  Move,
  Text,
  Wait,
  Help,
  Progress,
  NotAllowed,
  ContextMenu,
  Cell,
  VerticalText,
  Alias,
  Copy,
  NoDrop,
  Grab,
  Grabbing,
  ZoomIn,
  ZoomOut,
  ResizeEast,
  ResizeNorth,
  ResizeNorthEast,
  ResizeNorthWest,
  ResizeSouth,
  ResizeSouthEast,
  ResizeSouthWest,
  ResizeWest,
  ResizeEastWest,
  ResizeNorthSouth,
  ResizeNorthEastSouthWest,
  ResizeNorthWestSouthEast,
  ResizeColumn,
  ResizeRow,
  AllScroll,
}

#[napi(object)]
pub struct BrowserWindowOptions {
  pub menu: Option<MenuOptions>,
  pub show_menu: Option<bool>,
  pub resizable: Option<bool>,
  pub title: Option<String>,
  pub logical: Option<bool>,
  pub width: Option<f64>,
  pub height: Option<f64>,
  pub x: Option<f64>,
  pub y: Option<f64>,
  pub content_protection: Option<bool>,
  pub always_on_top: Option<bool>,
  pub always_on_bottom: Option<bool>,
  pub visible: Option<bool>,
  pub decorations: Option<bool>,
  pub visible_on_all_workspaces: Option<bool>,
  pub maximized: Option<bool>,
  pub maximizable: Option<bool>,
  pub minimizable: Option<bool>,
  pub focused: Option<bool>,
  pub transparent: Option<bool>,
  pub fullscreen: Option<FullscreenType>,
  pub windows_owner_window: Option<BigInt>,
  pub windows_taskbar_icon: Option<TrayIconImage>,
  pub windows_no_redirection_bitmap: Option<bool>,
  pub windows_drag_and_drop: Option<bool>,
  pub windows_skip_taskbar: Option<bool>,
  pub windows_class_name: Option<String>,
  pub windows_undecorated_shadow: Option<bool>,
  pub macos_movable_by_window_background: Option<bool>,
  pub macos_titlebar_transparent: Option<bool>,
  pub macos_title_hidden: Option<bool>,
  pub macos_titlebar_hidden: Option<bool>,
  pub macos_titlebar_buttons_hidden: Option<bool>,
  pub macos_fullsize_content_view: Option<bool>,
  pub macos_disallow_hidpi: Option<bool>,
  pub macos_has_shadow: Option<bool>,
  pub macos_tabbing_identifier: Option<String>,
  pub x11_visual_id: Option<u32>,
  pub x11_screen: Option<i32>,
  pub x11_general_name: Option<String>,
  pub x11_instance_name: Option<String>,
  pub x11_override_redirect: Option<bool>,
  pub x11_window_types: Option<Vec<X11WindowType>>,
  pub x11_base_width: Option<f64>,
  pub x11_base_height: Option<f64>,
  pub wayland_app_id: Option<String>,
  pub wayland_instance: Option<String>,
  pub ios_scale_factor: Option<f64>,
  pub ios_valid_orientations: Option<IosValidOrientations>,
  pub ios_prefers_home_indicator_hidden: Option<bool>,
  pub ios_deferred_system_gesture_edges: Option<u8>,
  pub ios_prefers_status_bar_hidden: Option<bool>,
}

#[napi(object)]
pub struct FileDialogOptions {
  pub multiple: Option<bool>,
  pub title: Option<String>,
  pub default_path: Option<String>,
  pub filters: Option<Vec<FileFilter>>,
}

#[napi(object)]
pub struct FileFilter {
  pub name: String,
  pub extensions: Vec<String>,
}

// ── webview types ─────────────────────────────────────────────────────────────

#[napi]
pub enum Theme {
  Light,
  Dark,
  System,
}

/// Incoming request delivered to a custom-protocol handler.
#[napi(object)]
pub struct CustomProtocolRequest {
  pub url: String,
  pub method: String,
  pub headers: Vec<HeaderData>,
  pub body: Option<Buffer>,
}

/// Response returned by a custom-protocol handler.
#[napi(object)]
pub struct CustomProtocolResponse {
  /// HTTP status code.  Defaults to 200.
  pub status_code: Option<u16>,
  /// Extra response headers (e.g. `[{ key: "Cache-Control", value: "no-store" }]`).
  pub headers: Option<Vec<HeaderData>>,
  /// Response body bytes.
  pub body: Buffer,
  /// MIME type (e.g. `"text/html"`, `"application/javascript"`).
  pub mime_type: Option<String>,
}

/// Data sent to the expose handler when the page calls a proxied function.
#[napi(object)]
pub struct ExposeCallData {
  pub ns: String,
  pub method: String,
  pub id: f64,
  pub args_json: String,
}

#[napi(object)]
pub struct WebviewCookie {
  pub name: String,
  pub value: String,
  pub domain: Option<String>,
  pub path: Option<String>,
  pub http_only: Option<bool>,
  pub secure: Option<bool>,
  /// `"strict"`, `"lax"`, or `"none"`.
  pub same_site: Option<String>,
}

#[napi(object)]
pub struct WebviewBounds {
  pub x: f64,
  pub y: f64,
  pub width: f64,
  pub height: f64,
}

/// Event types fired by a Webview and surfaced as EventEmitter events in JS.
#[napi]
#[derive(Default)]
pub enum WebviewEventType {
  #[default]
  PageLoadStarted,
  PageLoadFinished,
  TitleChanged,
  DownloadStarted,
  DownloadCompleted,
  NavigationStarted,
  /// Fired when a page attempts to open a new browser window
  /// (`window.open`, `target="_blank"`, etc.).
  NewWindowRequested,
}

/// Payload delivered to the webview event dispatch callback.
#[napi(object)]
#[derive(Default)]
pub struct WebviewEventPayload {
  pub event: WebviewEventType,
  /// URL associated with the event (navigation, page load, download).
  pub url: Option<String>,
  /// Document title for `TitleChanged` events.
  pub title: Option<String>,
  /// Download success flag for `DownloadCompleted` events.
  pub success: Option<bool>,
}

#[napi(object)]
pub struct WebviewOptions {
  pub url: Option<String>,
  pub html: Option<String>,
  pub width: Option<f64>,
  pub height: Option<f64>,
  pub x: Option<f64>,
  pub y: Option<f64>,
  pub enable_devtools: Option<bool>,
  pub incognito: Option<bool>,
  pub user_agent: Option<String>,
  pub child: Option<bool>,
  pub preload: Option<String>,
  pub transparent: Option<bool>,
  pub theme: Option<Theme>,
  pub hotkeys_zoom: Option<bool>,
  pub clipboard: Option<bool>,
  pub autoplay: Option<bool>,
  pub back_forward_navigation_gestures: Option<bool>,
  /// Custom name for the IPC global injected by wry (default: `"ipc"`).
  pub ipc_name: Option<String>,
}

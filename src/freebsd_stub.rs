/// FreeBSD x64 stub — compiles to a valid N-API addon but every API call
/// throws immediately with a clear "unsupported platform" message.
///
/// This exists solely so package managers that resolve `x86_64-unknown-freebsd`
/// get a loadable `.node` file.  No GUI functionality is provided.
use napi::bindgen_prelude::*;
use napi::Result;
use napi_derive::napi;

const UNSUPPORTED: &str = "Unsupported platform: FreeBSD x64 is not currently supported by WebViewJS.";

fn unsupported<T>() -> Result<T> {
  Err(napi::Error::new(napi::Status::GenericFailure, UNSUPPORTED))
}

// ── Enums (value-only, no constructor needed) ─────────────────────────────────

#[napi]
pub enum WindowCommand {
  Close,
  Show,
  Hide,
}

#[napi]
pub enum WebviewApplicationEvent {
  WindowCloseRequested,
  ApplicationCloseRequested,
  CustomMenuClick,
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
}

#[napi(js_name = "ControlFlow")]
pub enum JsControlFlow {
  Poll,
  Wait,
  WaitUntil,
  Exit,
  ExitWithCode,
}

#[napi]
pub enum FullscreenType {
  Exclusive,
  Borderless,
}

#[napi(js_name = "ProgressBarState")]
pub enum JsProgressBarState {
  None,
  Normal,
  Indeterminate,
  Paused,
  Error,
}

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

#[napi]
pub enum Theme {
  Light,
  Dark,
  System,
}

// ── Plain data objects ─────────────────────────────────────────────────────────

#[napi(object)]
pub struct WindowEventPayload {
  pub event: WindowEventType,
  pub x: Option<f64>,
  pub y: Option<f64>,
  pub width: Option<u32>,
  pub height: Option<u32>,
  pub button: Option<u32>,
  pub delta_x: Option<f64>,
  pub delta_y: Option<f64>,
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
  pub interval: Option<u32>,
  pub ref_: Option<bool>,
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

#[napi(object)]
pub struct JsProgressBar {
  pub state: Option<JsProgressBarState>,
  pub progress: Option<u32>,
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
}

#[napi(object)]
pub struct FileFilter {
  pub name: String,
  pub extensions: Vec<String>,
}

#[napi(object)]
pub struct FileDialogOptions {
  pub multiple: Option<bool>,
  pub title: Option<String>,
  pub default_path: Option<String>,
  pub filters: Option<Vec<FileFilter>>,
}

#[napi(object)]
pub struct CustomProtocolRequest {
  pub url: String,
  pub method: String,
  pub headers: Vec<HeaderData>,
  pub body: Option<Buffer>,
}

#[napi(object)]
pub struct CustomProtocolResponse {
  pub status_code: Option<u16>,
  pub headers: Option<Vec<HeaderData>>,
  pub body: Buffer,
  pub mime_type: Option<String>,
}

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
  pub same_site: Option<String>,
}

#[napi(object)]
pub struct WebviewBounds {
  pub x: f64,
  pub y: f64,
  pub width: f64,
  pub height: f64,
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
  pub ipc_name: Option<String>,
}

// ── Free functions ─────────────────────────────────────────────────────────────

#[napi]
pub fn get_webview_version() -> Result<String> {
  unsupported()
}

// ── Application ───────────────────────────────────────────────────────────────

#[napi]
pub struct Application;

#[napi]
impl Application {
  #[napi(constructor)]
  pub fn new(_env: Env, _options: Option<ApplicationOptions>) -> Result<Self> {
    unsupported()
  }

  #[napi]
  pub fn on_event(&mut self, _handler: Option<FunctionRef<ApplicationEvent, ()>>) -> Result<()> {
    unsupported()
  }

  #[napi]
  pub fn bind(&mut self, _handler: Option<FunctionRef<ApplicationEvent, ()>>) -> Result<()> {
    unsupported()
  }

  #[napi]
  pub fn exit(&mut self) -> Result<()> {
    unsupported()
  }

  #[napi]
  pub fn create_browser_window(&mut self, _options: Option<BrowserWindowOptions>) -> Result<BrowserWindow> {
    unsupported()
  }

  #[napi]
  pub fn create_child_browser_window(&mut self, _options: Option<BrowserWindowOptions>) -> Result<BrowserWindow> {
    unsupported()
  }

  #[napi]
  pub fn set_menu(&mut self, _menu_options: Option<MenuOptions>) -> Result<()> {
    unsupported()
  }

  #[napi]
  pub fn pump_events(&mut self) -> Result<bool> {
    unsupported()
  }

  #[napi]
  pub fn run(&mut self, _options: Option<ApplicationRunOptions>) -> Result<()> {
    unsupported()
  }
}

// ── BrowserWindow ─────────────────────────────────────────────────────────────

#[napi]
pub struct BrowserWindow;

#[napi]
impl BrowserWindow {
  #[napi]
  pub fn create_webview(&mut self, _env: Env, _options: Option<WebviewOptions>) -> Result<JsWebview> {
    unsupported()
  }

  #[napi(js_name = "_registerProtocol")]
  pub fn register_protocol_raw(&mut self, _name: String, _handler: FunctionRef<String, ()>) -> Result<()> {
    unsupported()
  }

  #[napi(js_name = "_completeProtocol")]
  pub fn complete_protocol(&self, _id: f64, _response: CustomProtocolResponse) -> Result<()> {
    unsupported()
  }

  #[napi(js_name = "_onWindowEvent")]
  pub fn on_window_event(&self, _handler: Option<FunctionRef<WindowEventPayload, ()>>) -> Result<()> {
    unsupported()
  }

  #[napi(getter)]
  pub fn is_child(&self) -> Result<bool> { unsupported() }

  #[napi] pub fn id(&self) -> Result<u32> { unsupported() }
  #[napi] pub fn is_focused(&self) -> Result<bool> { unsupported() }
  #[napi] pub fn is_visible(&self) -> Result<bool> { unsupported() }
  #[napi] pub fn is_decorated(&self) -> Result<bool> { unsupported() }
  #[napi] pub fn is_closable(&self) -> Result<bool> { unsupported() }
  #[napi] pub fn is_maximizable(&self) -> Result<bool> { unsupported() }
  #[napi] pub fn is_minimizable(&self) -> Result<bool> { unsupported() }
  #[napi] pub fn is_maximized(&self) -> Result<bool> { unsupported() }
  #[napi] pub fn is_minimized(&self) -> Result<bool> { unsupported() }
  #[napi] pub fn is_resizable(&self) -> Result<bool> { unsupported() }

  #[napi] pub fn set_title(&self, _title: String) -> Result<()> { unsupported() }
  #[napi(getter)] pub fn get_title(&self) -> Result<String> { unsupported() }
  #[napi] pub fn set_visible(&self, _visible: bool) -> Result<()> { unsupported() }
  #[napi] pub fn show(&self) -> Result<()> { unsupported() }
  #[napi] pub fn hide(&self) -> Result<()> { unsupported() }
  #[napi] pub fn minimize(&self) -> Result<()> { unsupported() }
  #[napi] pub fn maximize(&self) -> Result<()> { unsupported() }
  #[napi] pub fn unmaximize(&self) -> Result<()> { unsupported() }
  #[napi] pub fn focus(&self) -> Result<()> { unsupported() }
  #[napi] pub fn request_redraw(&self) -> Result<()> { unsupported() }
  #[napi] pub fn set_resizable(&self, _resizable: bool) -> Result<()> { unsupported() }
  #[napi] pub fn set_minimizable(&self, _minimizable: bool) -> Result<()> { unsupported() }
  #[napi] pub fn set_maximizable(&self, _maximizable: bool) -> Result<()> { unsupported() }
  #[napi] pub fn set_closable(&self, _closable: bool) -> Result<()> { unsupported() }
  #[napi] pub fn set_always_on_top(&self, _always: bool) -> Result<()> { unsupported() }
  #[napi] pub fn set_content_protection(&self, _enabled: bool) -> Result<()> { unsupported() }
  #[napi] pub fn set_visible_on_all_workspaces(&self, _visible: bool) -> Result<()> { unsupported() }
  #[napi] pub fn set_decorations(&self, _decorated: bool) -> Result<()> { unsupported() }
  #[napi] pub fn set_skip_taskbar(&self, _skip: bool) -> Result<()> { unsupported() }
  #[napi] pub fn set_fullscreen(&self, _type_: Option<FullscreenType>) -> Result<()> { unsupported() }
  #[napi] pub fn set_cursor(&self, _cursor: CursorType) -> Result<()> { unsupported() }
  #[napi] pub fn set_cursor_visible(&self, _visible: bool) -> Result<()> { unsupported() }
  #[napi] pub fn set_cursor_position(&self, _x: f64, _y: f64) -> Result<()> { unsupported() }
  #[napi] pub fn set_ignore_cursor_events(&self, _ignore: bool) -> Result<()> { unsupported() }
  #[napi] pub fn get_size(&self) -> Result<Dimensions> { unsupported() }
  #[napi] pub fn get_outer_size(&self) -> Result<Dimensions> { unsupported() }
  #[napi] pub fn set_size(&self, _width: f64, _height: f64) -> Result<()> { unsupported() }
  #[napi] pub fn set_min_size(&self, _w: Option<f64>, _h: Option<f64>) -> Result<()> { unsupported() }
  #[napi] pub fn set_max_size(&self, _w: Option<f64>, _h: Option<f64>) -> Result<()> { unsupported() }
  #[napi] pub fn get_position(&self) -> Result<Option<Position>> { unsupported() }
  #[napi] pub fn set_position(&self, _x: f64, _y: f64) -> Result<()> { unsupported() }
  #[napi] pub fn center(&self) -> Result<()> { unsupported() }
  #[napi] pub fn scale_factor(&self) -> Result<f64> { unsupported() }
  #[napi] pub fn set_window_icon(&self, _rgba: Buffer, _width: u32, _height: u32) -> Result<()> { unsupported() }
  #[napi] pub fn set_progress_bar(&self, _progress: JsProgressBar) -> Result<()> { unsupported() }
  #[napi] pub fn has_menu(&self) -> Result<bool> { unsupported() }
  #[napi] pub fn set_menu(&mut self, _options: Option<MenuOptions>) -> Result<()> { unsupported() }
  #[napi] pub fn current_monitor(&self) -> Result<Option<Monitor>> { unsupported() }
  #[napi] pub fn primary_monitor(&self) -> Result<Option<Monitor>> { unsupported() }
  #[napi] pub fn available_monitors(&self) -> Result<Vec<Monitor>> { unsupported() }
  #[napi] pub fn open_file_dialog(&self, _options: Option<FileDialogOptions>) -> Result<Vec<String>> { unsupported() }
  #[napi(getter)] pub fn get_theme(&self) -> Result<Theme> { unsupported() }
  #[napi] pub fn set_theme(&self, _theme: Option<Theme>) -> Result<()> { unsupported() }
  #[napi] pub fn set_window_level(&self, _level: u32) -> Result<()> { unsupported() }
}

// ── Webview ───────────────────────────────────────────────────────────────────

#[napi(js_name = "Webview")]
pub struct JsWebview;

#[napi]
impl JsWebview {
  #[napi] pub fn on_ipc_message(&mut self, _handler: Option<FunctionRef<IpcMessage, ()>>) -> Result<()> { unsupported() }
  #[napi(js_name = "_exposeInternal")] pub fn expose_internal(&self, _ns: String, _statics_json: String, _fns: Vec<String>, _handler: FunctionRef<ExposeCallData, ()>) -> Result<()> { unsupported() }
  #[napi] pub fn print(&self) -> Result<()> { unsupported() }
  #[napi] pub fn zoom(&self, _scale_factor: f64) -> Result<()> { unsupported() }
  #[napi] pub fn set_webview_visibility(&self, _visible: bool) -> Result<()> { unsupported() }
  #[napi] pub fn is_devtools_open(&self) -> Result<bool> { unsupported() }
  #[napi] pub fn open_devtools(&self) -> Result<()> { unsupported() }
  #[napi] pub fn close_devtools(&self) -> Result<()> { unsupported() }
  #[napi] pub fn load_url(&self, _url: String) -> Result<()> { unsupported() }
  #[napi] pub fn load_html(&self, _html: String) -> Result<()> { unsupported() }
  #[napi] pub fn evaluate_script(&self, _js: String) -> Result<()> { unsupported() }
  #[napi] pub fn evaluate_script_with_callback(&self, _js: String, _cb: FunctionRef<Option<String>, ()>) -> Result<()> { unsupported() }
  #[napi] pub fn reload(&self) -> Result<()> { unsupported() }
  #[napi] pub fn url(&self) -> Result<Option<String>> { unsupported() }
  #[napi] pub fn load_url_with_headers(&self, _url: String, _headers: Vec<HeaderData>) -> Result<()> { unsupported() }
  #[napi] pub fn get_cookies(&self, _url: Option<String>) -> Result<Vec<WebviewCookie>> { unsupported() }
  #[napi] pub fn set_cookie(&self, _cookie: WebviewCookie) -> Result<()> { unsupported() }
  #[napi] pub fn delete_cookie(&self, _name: String, _url: Option<String>, _domain: Option<String>) -> Result<()> { unsupported() }
  #[napi] pub fn clear_all_browsing_data(&self) -> Result<()> { unsupported() }
  #[napi] pub fn set_background_color(&self, _r: u8, _g: u8, _b: u8, _a: u8) -> Result<()> { unsupported() }
  #[napi] pub fn get_bounds(&self) -> Result<Option<WebviewBounds>> { unsupported() }
  #[napi] pub fn set_bounds(&self, _bounds: WebviewBounds) -> Result<()> { unsupported() }
  #[napi] pub fn focus(&self) -> Result<()> { unsupported() }
  #[napi] pub fn focus_parent(&self) -> Result<()> { unsupported() }
}

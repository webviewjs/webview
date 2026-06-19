use napi::{Either, Env, Result};
use napi_derive::*;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::rc::Rc;
use std::cell::RefCell;
use std::sync::{Arc, Mutex};
use winit::{
  dpi::{LogicalPosition, LogicalSize, PhysicalPosition, PhysicalSize},
  event_loop::EventLoop,
  window::{CursorIcon, Fullscreen, Icon, Window, WindowBuilder, WindowButtons, WindowId, WindowLevel},
};
use rfd::FileDialog;
#[cfg(not(target_os = "android"))]
use muda::Menu;

use crate::webview::{JsWebview, Theme, WebviewOptions};
use crate::MenuOptions;
#[cfg(not(target_os = "android"))]
use crate::menu::{create_menu_from_options, init_menu_for_window};

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

impl Default for BrowserWindowOptions {
  fn default() -> Self {
    Self {
      menu: None,
      show_menu: Some(true),
      resizable: Some(true),
      title: Some("WebviewJS".to_owned()),
      width: Some(800.0),
      height: Some(600.0),
      x: Some(0.0),
      y: Some(0.0),
      content_protection: Some(false),
      always_on_top: Some(false),
      always_on_bottom: Some(false),
      visible: Some(true),
      decorations: Some(true),
      visible_on_all_workspaces: Some(false),
      maximized: Some(false),
      maximizable: Some(true),
      minimizable: Some(true),
      focused: Some(true),
      transparent: Some(false),
      fullscreen: None,
    }
  }
}

#[napi]
pub struct BrowserWindow {
  is_child_window: bool,
  pub(crate) window: Arc<Window>,
  window_id: u32,
  #[cfg(not(target_os = "android"))]
  window_menu: Option<Menu>,
  /// Shared with AppState so resize events can trigger WebView2 resize.
  /// wry's own WM_SIZE subclass is bypassed by winit, so we do it manually.
  webviews: Rc<RefCell<Vec<Rc<wry::WebView>>>>,
}

#[napi]
impl BrowserWindow {
  pub fn new(
    event_loop: &EventLoop<()>,
    options: Option<BrowserWindowOptions>,
    child: bool,
    #[cfg(not(target_os = "android"))] global_menu: Arc<Mutex<Option<Menu>>>,
    #[cfg(target_os = "android")] _global_menu: Arc<Mutex<Option<()>>>,
  ) -> Result<Self> {
    let options = options.unwrap_or_default();

    let mut builder = WindowBuilder::new();

    if let Some(resizable) = options.resizable {
      builder = builder.with_resizable(resizable);
    }

    if let Some(width) = options.width {
      builder = builder.with_inner_size(PhysicalSize::new(width, options.height.unwrap_or(600.0)));
    }

    if let Some(x) = options.x {
      builder = builder.with_position(LogicalPosition::new(x, options.y.unwrap_or(0.0)));
    }

    if let Some(visible) = options.visible {
      builder = builder.with_visible(visible);
    }

    if let Some(decorations) = options.decorations {
      builder = builder.with_decorations(decorations);
    }

    if let Some(transparent) = options.transparent {
      builder = builder.with_transparent(transparent);
    }

    if let Some(maximized) = options.maximized {
      builder = builder.with_maximized(maximized);
    }

    if let Some(focused) = options.focused {
      builder = builder.with_active(focused);
    }

    if let Some(content_protection) = options.content_protection {
      builder = builder.with_content_protected(content_protection);
    }

    // Window level: always_on_top takes priority over always_on_bottom
    let level = match (options.always_on_top, options.always_on_bottom) {
      (Some(true), _) => Some(WindowLevel::AlwaysOnTop),
      (_, Some(true)) => Some(WindowLevel::AlwaysOnBottom),
      _ => None,
    };
    if let Some(level) = level {
      builder = builder.with_window_level(level);
    }

    // Minimizable / maximizable via enabled buttons
    {
      let mut buttons = WindowButtons::all();
      if options.maximizable == Some(false) {
        buttons.remove(WindowButtons::MAXIMIZE);
      }
      if options.minimizable == Some(false) {
        buttons.remove(WindowButtons::MINIMIZE);
      }
      builder = builder.with_enabled_buttons(buttons);
    }

    // visible_on_all_workspaces – macOS only
    #[cfg(target_os = "macos")]
    if options.visible_on_all_workspaces == Some(true) {
      use winit::platform::macos::WindowBuilderExtMacOS;
      builder = builder.with_visible_on_all_spaces(true);
    }

    if let Some(fullscreen) = options.fullscreen {
      let fs = match fullscreen {
        FullscreenType::Borderless => Some(Fullscreen::Borderless(None)),
        FullscreenType::Exclusive => Some(Fullscreen::Borderless(None)), // best-effort
      };
      builder = builder.with_fullscreen(fs);
    }

    if let Some(title) = options.title {
      builder = builder.with_title(&title);
    }

    let window = builder.build(&**event_loop).map_err(|e| {
      napi::Error::new(napi::Status::GenericFailure, format!("Failed to create window: {}", e))
    })?;

    let mut hasher = DefaultHasher::new();
    window.id().hash(&mut hasher);
    let window_id = hasher.finish() as u32;

    // Menu init
    #[cfg(not(target_os = "android"))]
    let window_menu = if let Some(menu_options) = options.menu {
      let menu = create_menu_from_options(menu_options)?;
      init_menu_for_window(&menu, &window)?;
      Some(menu)
    } else if options.show_menu.unwrap_or(false) {
      if let Ok(global_menu) = global_menu.lock() {
        if let Some(menu) = global_menu.as_ref() {
          init_menu_for_window(menu, &window)?;
        }
      }
      None
    } else {
      None
    };

    Ok(Self {
      window: Arc::new(window),
      is_child_window: child,
      window_id,
      #[cfg(not(target_os = "android"))]
      window_menu,
      webviews: Rc::new(RefCell::new(Vec::new())),
    })
  }

  /// Return a clone of the shared webview list. AppState holds this Rc so it
  /// can resize all webviews when a Resized event arrives for this window.
  pub(crate) fn webviews_shared(&self) -> Rc<RefCell<Vec<Rc<wry::WebView>>>> {
    Rc::clone(&self.webviews)
  }

  #[napi]
  pub fn create_webview(&mut self, env: Env, options: Option<WebviewOptions>) -> Result<JsWebview> {
    let webview = JsWebview::create(&env, &*self.window, options.unwrap_or_default())?;
    // Keep an Rc clone so the WebView survives JS GC of the returned handle,
    // and so AppState can resize it on WM_SIZE.
    self.webviews.borrow_mut().push(Rc::clone(&webview.webview_inner));
    Ok(webview)
  }

  #[napi(getter)]
  pub fn is_child(&self) -> bool {
    self.is_child_window
  }

  #[napi]
  pub fn is_focused(&self) -> bool {
    self.window.has_focus()
  }

  #[napi]
  pub fn is_visible(&self) -> bool {
    self.window.is_visible().unwrap_or(false)
  }

  #[napi]
  pub fn is_decorated(&self) -> bool {
    self.window.is_decorated()
  }

  #[napi]
  pub fn is_closable(&self) -> bool {
    self.window.enabled_buttons().contains(WindowButtons::CLOSE)
  }

  #[napi]
  pub fn is_maximizable(&self) -> bool {
    self.window.enabled_buttons().contains(WindowButtons::MAXIMIZE)
  }

  #[napi]
  pub fn is_minimizable(&self) -> bool {
    self.window.enabled_buttons().contains(WindowButtons::MINIMIZE)
  }

  #[napi]
  pub fn is_maximized(&self) -> bool {
    self.window.is_maximized()
  }

  #[napi]
  pub fn is_minimized(&self) -> bool {
    self.window.is_minimized().unwrap_or(false)
  }

  #[napi]
  pub fn is_resizable(&self) -> bool {
    self.window.is_resizable()
  }

  #[napi]
  pub fn set_title(&self, title: String) {
    self.window.set_title(&title);
  }

  #[napi(getter)]
  pub fn get_title(&self) -> String {
    self.window.title()
  }

  #[napi]
  pub fn set_closable(&self, closable: bool) {
    let mut buttons = self.window.enabled_buttons();
    if closable {
      buttons.insert(WindowButtons::CLOSE);
    } else {
      buttons.remove(WindowButtons::CLOSE);
    }
    self.window.set_enabled_buttons(buttons);
  }

  #[napi]
  pub fn set_maximizable(&self, maximizable: bool) {
    let mut buttons = self.window.enabled_buttons();
    if maximizable {
      buttons.insert(WindowButtons::MAXIMIZE);
    } else {
      buttons.remove(WindowButtons::MAXIMIZE);
    }
    self.window.set_enabled_buttons(buttons);
  }

  #[napi]
  pub fn set_minimizable(&self, minimizable: bool) {
    let mut buttons = self.window.enabled_buttons();
    if minimizable {
      buttons.insert(WindowButtons::MINIMIZE);
    } else {
      buttons.remove(WindowButtons::MINIMIZE);
    }
    self.window.set_enabled_buttons(buttons);
  }

  #[napi]
  pub fn set_resizable(&self, resizable: bool) {
    self.window.set_resizable(resizable);
  }

  #[napi]
  pub fn set_size(&self, width: u32, height: u32) {
    let _ = self.window.request_inner_size(LogicalSize::new(width, height));
  }

  #[napi]
  pub fn open_file_dialog(&self, options: Option<FileDialogOptions>) -> Result<Vec<String>> {
    let mut dialog = FileDialog::new();

    if let Some(opts) = options.as_ref() {
      if let Some(title) = &opts.title {
        dialog = dialog.set_title(title);
      }
      if let Some(path) = &opts.default_path {
        dialog = dialog.set_directory(path);
      }
      if let Some(filters) = &opts.filters {
        for filter in filters {
          dialog = dialog.add_filter(&filter.name, &filter.extensions);
        }
      }
    }

    dialog = dialog.add_filter("All Files", &["*"]);

    let files = if options.as_ref().and_then(|o| o.multiple).unwrap_or(false) {
      dialog.pick_files()
    } else {
      dialog.pick_file().map(|f| vec![f])
    };

    Ok(
      files
        .unwrap_or_default()
        .into_iter()
        .map(|f| f.to_string_lossy().to_string())
        .collect(),
    )
  }

  #[napi]
  pub fn id(&self) -> u32 {
    self.window_id
  }

  #[napi]
  pub fn has_menu(&self) -> bool {
    #[cfg(not(target_os = "android"))]
    { self.window_menu.is_some() }
    #[cfg(target_os = "android")]
    { false }
  }

  /// Returns the underlying winit WindowId (for internal tracking).
  pub fn winit_window_id(&self) -> WindowId {
    self.window.id()
  }

  #[napi(getter)]
  pub fn get_theme(&self) -> Theme {
    match self.window.theme() {
      Some(winit::window::Theme::Light) => Theme::Light,
      Some(winit::window::Theme::Dark) => Theme::Dark,
      _ => Theme::System,
    }
  }

  #[napi]
  pub fn set_theme(&self, theme: Theme) {
    let t = match theme {
      Theme::Light => Some(winit::window::Theme::Light),
      Theme::Dark => Some(winit::window::Theme::Dark),
      _ => None,
    };
    self.window.set_theme(t);
  }

  #[napi]
  #[allow(unused_variables)]
  pub fn set_window_icon(
    &self,
    icon: Either<Vec<u8>, String>,
    width: u32,
    height: u32,
  ) -> Result<()> {
    let rgba = match icon {
      Either::A(bytes) => bytes,
      Either::B(_path) => {
        return Err(napi::Error::new(
          napi::Status::InvalidArg,
          "Path-based icons are not supported; provide RGBA bytes instead",
        ));
      }
    };

    let ico = Icon::from_rgba(rgba, width, height).map_err(|e| {
      napi::Error::new(napi::Status::GenericFailure, format!("Failed to create icon: {}", e))
    })?;

    self.window.set_window_icon(Some(ico));
    Ok(())
  }

  #[napi]
  pub fn remove_window_icon(&self) {
    self.window.set_window_icon(None);
  }

  #[napi]
  pub fn set_visible(&self, visible: bool) {
    self.window.set_visible(visible);
  }

  /// No-op: winit does not expose a progress bar API.
  #[napi]
  pub fn set_progress_bar(&self, _state: JsProgressBar) {}

  #[napi]
  pub fn set_maximized(&self, value: bool) {
    self.window.set_maximized(value);
  }

  #[napi]
  pub fn set_minimized(&self, value: bool) {
    self.window.set_minimized(value);
  }

  #[napi]
  pub fn focus(&self) {
    self.window.focus_window();
  }

  #[napi]
  pub fn get_available_monitors(&self) -> Vec<Monitor> {
    self.window.available_monitors().map(monitor_to_js).collect()
  }

  #[napi]
  pub fn get_current_monitor(&self) -> Option<Monitor> {
    self.window.current_monitor().map(monitor_to_js)
  }

  #[napi]
  pub fn get_primary_monitor(&self) -> Option<Monitor> {
    self.window.primary_monitor().map(monitor_to_js)
  }

  /// Not available in winit; always returns `None`.
  #[napi]
  pub fn get_monitor_from_point(&self, _x: f64, _y: f64) -> Option<Monitor> {
    None
  }

  #[napi]
  pub fn set_content_protection(&self, enabled: bool) {
    self.window.set_content_protected(enabled);
  }

  #[napi]
  pub fn set_always_on_top(&self, enabled: bool) {
    self.window.set_window_level(if enabled {
      WindowLevel::AlwaysOnTop
    } else {
      WindowLevel::Normal
    });
  }

  #[napi]
  pub fn set_always_on_bottom(&self, enabled: bool) {
    self.window.set_window_level(if enabled {
      WindowLevel::AlwaysOnBottom
    } else {
      WindowLevel::Normal
    });
  }

  #[napi]
  pub fn set_decorations(&self, enabled: bool) {
    self.window.set_decorations(enabled);
  }

  #[napi(getter)]
  pub fn get_fullscreen(&self) -> Option<FullscreenType> {
    match self.window.fullscreen() {
      None => None,
      Some(Fullscreen::Borderless(_)) => Some(FullscreenType::Borderless),
      Some(Fullscreen::Exclusive(_)) => Some(FullscreenType::Exclusive),
    }
  }

  #[napi]
  pub fn set_fullscreen(&self, fullscreen_type: Option<FullscreenType>) {
    let fs = match fullscreen_type {
      Some(FullscreenType::Exclusive) => {
        // grab first available video mode for the current monitor
        self
          .window
          .current_monitor()
          .and_then(|m| m.video_modes().next())
          .map(Fullscreen::Exclusive)
      }
      Some(FullscreenType::Borderless) => Some(Fullscreen::Borderless(None)),
      None => None,
    };
    self.window.set_fullscreen(fs);
  }

  #[napi]
  pub fn close(&self) {
    self.window.set_visible(false);
  }

  #[napi]
  pub fn hide(&self) {
    self.window.set_visible(false);
  }

  #[napi]
  pub fn show(&self) {
    self.window.set_visible(true);
  }

  // ── Position ────────────────────────────────────────────────────────────────

  /// Returns the window's outer top-left position in physical pixels, or
  /// `null` if the platform does not expose it.
  #[napi]
  pub fn get_position(&self) -> Option<Position> {
    self.window.outer_position().ok().map(|p| Position { x: p.x, y: p.y })
  }

  /// Move the window so its outer top-left corner is at (`x`, `y`) in
  /// physical pixels.
  #[napi]
  pub fn set_position(&self, x: i32, y: i32) {
    self.window.set_outer_position(PhysicalPosition::new(x, y));
  }

  /// Center the window on its current monitor.  Does nothing if the current
  /// monitor cannot be determined.
  #[napi]
  pub fn center(&self) {
    if let Some(monitor) = self.window.current_monitor() {
      let mpos = monitor.position();
      let msize = monitor.size();
      let wsize = self.window.outer_size();
      let x = mpos.x + (msize.width as i32 - wsize.width as i32) / 2;
      let y = mpos.y + (msize.height as i32 - wsize.height as i32) / 2;
      self.window.set_outer_position(PhysicalPosition::new(x, y));
    }
  }

  // ── Size queries & constraints ───────────────────────────────────────────────

  /// Inner (content-area) size in physical pixels.
  #[napi]
  pub fn get_size(&self) -> Dimensions {
    let s = self.window.inner_size();
    Dimensions { width: s.width, height: s.height }
  }

  /// Outer (including decorations) size in physical pixels.
  #[napi]
  pub fn get_outer_size(&self) -> Dimensions {
    let s = self.window.outer_size();
    Dimensions { width: s.width, height: s.height }
  }

  /// Set minimum inner size.  Pass `null` / `undefined` for both to remove the
  /// constraint.
  #[napi]
  pub fn set_min_size(&self, width: Option<f64>, height: Option<f64>) {
    let size: Option<winit::dpi::Size> = match (width, height) {
      (Some(w), Some(h)) => Some(LogicalSize::new(w, h).into()),
      _ => None,
    };
    self.window.set_min_inner_size(size);
  }

  /// Set maximum inner size.  Pass `null` / `undefined` for both to remove the
  /// constraint.
  #[napi]
  pub fn set_max_size(&self, width: Option<f64>, height: Option<f64>) {
    let size: Option<winit::dpi::Size> = match (width, height) {
      (Some(w), Some(h)) => Some(LogicalSize::new(w, h).into()),
      _ => None,
    };
    self.window.set_max_inner_size(size);
  }

  // ── DPI ─────────────────────────────────────────────────────────────────────

  /// Device-pixel ratio for the monitor the window is currently on.
  #[napi]
  pub fn scale_factor(&self) -> f64 {
    self.window.scale_factor()
  }

  // ── Cursor ──────────────────────────────────────────────────────────────────

  #[napi]
  pub fn set_cursor(&self, cursor: CursorType) {
    self.window.set_cursor_icon(cursor.into());
  }

  #[napi]
  pub fn set_cursor_visible(&self, visible: bool) {
    self.window.set_cursor_visible(visible);
  }

  /// Move the OS cursor to (`x`, `y`) in logical pixels relative to the
  /// window's inner top-left corner.
  #[napi]
  pub fn set_cursor_position(&self, x: f64, y: f64) -> Result<()> {
    self.window
      .set_cursor_position(LogicalPosition::new(x, y))
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  /// When `true` the window ignores mouse input (click-through). Supported on
  /// Windows and macOS; a no-op on other platforms.
  #[napi]
  pub fn set_ignore_cursor_events(&self, ignore: bool) -> Result<()> {
    self.window
      .set_cursor_hittest(!ignore)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  // ── Taskbar ─────────────────────────────────────────────────────────────────

  /// Hide/show the window in the system taskbar. Supported on Windows only;
  /// a no-op on other platforms.
  #[napi]
  pub fn set_skip_taskbar(&self, skip: bool) {
    #[cfg(target_os = "windows")]
    {
      use winit::platform::windows::WindowExtWindows;
      self.window.set_skip_taskbar(skip);
    }
    #[cfg(not(target_os = "windows"))]
    let _ = skip;
  }

  // ── Misc ─────────────────────────────────────────────────────────────────────

  #[napi]
  pub fn request_redraw(&self) {
    self.window.request_redraw();
  }
}

// ── CursorType → CursorIcon ──────────────────────────────────────────────────

impl From<CursorType> for CursorIcon {
  fn from(c: CursorType) -> Self {
    match c {
      CursorType::Default => CursorIcon::Default,
      CursorType::Crosshair => CursorIcon::Crosshair,
      CursorType::Hand => CursorIcon::Pointer,
      CursorType::Arrow => CursorIcon::Default,
      CursorType::Move => CursorIcon::Move,
      CursorType::Text => CursorIcon::Text,
      CursorType::Wait => CursorIcon::Wait,
      CursorType::Help => CursorIcon::Help,
      CursorType::Progress => CursorIcon::Progress,
      CursorType::NotAllowed => CursorIcon::NotAllowed,
      CursorType::ContextMenu => CursorIcon::ContextMenu,
      CursorType::Cell => CursorIcon::Cell,
      CursorType::VerticalText => CursorIcon::VerticalText,
      CursorType::Alias => CursorIcon::Alias,
      CursorType::Copy => CursorIcon::Copy,
      CursorType::NoDrop => CursorIcon::NoDrop,
      CursorType::Grab => CursorIcon::Grab,
      CursorType::Grabbing => CursorIcon::Grabbing,
      CursorType::ZoomIn => CursorIcon::ZoomIn,
      CursorType::ZoomOut => CursorIcon::ZoomOut,
      CursorType::ResizeEast => CursorIcon::EResize,
      CursorType::ResizeNorth => CursorIcon::NResize,
      CursorType::ResizeNorthEast => CursorIcon::NeResize,
      CursorType::ResizeNorthWest => CursorIcon::NwResize,
      CursorType::ResizeSouth => CursorIcon::SResize,
      CursorType::ResizeSouthEast => CursorIcon::SeResize,
      CursorType::ResizeSouthWest => CursorIcon::SwResize,
      CursorType::ResizeWest => CursorIcon::WResize,
      CursorType::ResizeEastWest => CursorIcon::EwResize,
      CursorType::ResizeNorthSouth => CursorIcon::NsResize,
      CursorType::ResizeNorthEastSouthWest => CursorIcon::NeswResize,
      CursorType::ResizeNorthWestSouthEast => CursorIcon::NwseResize,
      CursorType::ResizeColumn => CursorIcon::ColResize,
      CursorType::ResizeRow => CursorIcon::RowResize,
      CursorType::AllScroll => CursorIcon::AllScroll,
    }
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

fn monitor_to_js(m: winit::monitor::MonitorHandle) -> Monitor {
  Monitor {
    name: m.name(),
    scale_factor: m.scale_factor(),
    size: Dimensions { width: m.size().width, height: m.size().height },
    position: Position { x: m.position().x, y: m.position().y },
    video_modes: m
      .video_modes()
      .map(|v| JsVideoMode {
        size: Dimensions { width: v.size().width, height: v.size().height },
        bit_depth: v.bit_depth(),
        refresh_rate: (v.refresh_rate_millihertz() / 1000) as u16,
      })
      .collect(),
  }
}


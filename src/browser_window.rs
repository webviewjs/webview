use crate::types::*;
use dpi::Size;
use image::GenericImageView;
#[cfg(not(target_os = "android"))]
use muda::Menu;
use napi::Either;
use napi::{bindgen_prelude::FunctionRef, Env, Result};
use napi_derive::*;
#[cfg(not(target_os = "android"))]
use rfd::FileDialog;
use std::cell::RefCell;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::rc::Rc;
use std::sync::Arc;
use winit::{
  dpi::{LogicalPosition, LogicalSize, PhysicalPosition, PhysicalSize},
  event_loop::EventLoop,
  window::{
    CursorIcon, Fullscreen, Icon, Window, WindowAttributes, WindowButtons, WindowId, WindowLevel,
  },
};

#[cfg(not(target_os = "android"))]
use crate::menu::{create_menu_from_options, init_menu_for_window};
use crate::webview::{JsWebview, ProtocolCounterRef, ProtocolHandlerRef, ProtocolPendingMap};

impl Default for BrowserWindowOptions {
  fn default() -> Self {
    Self {
      menu: None,
      show_menu: Some(true),
      resizable: Some(true),
      title: Some("WebviewJS".to_owned()),
      logical: Some(false),
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
  /// Per-window event handler shared with AppState for dispatching window events.
  event_handler: Rc<RefCell<Option<FunctionRef<WindowEventPayload, ()>>>>,
  /// Async protocol handlers: (scheme, js_handler_ref, responders, next_id).
  /// The closure is NOT required to be Send (wry guarantees main-thread call),
  /// so we use Rc<RefCell<>> instead of Arc<Mutex<>>.
  pending_protocols: Vec<PendingProtocol>,
  protocol_next_id: ProtocolCounterRef,
}

type PendingProtocol = (
  String,
  ProtocolHandlerRef,
  ProtocolPendingMap,
  ProtocolCounterRef,
);

#[napi]
impl BrowserWindow {
  pub fn new(
    event_loop: &EventLoop<()>,
    options: Option<BrowserWindowOptions>,
    child: bool,
    #[cfg(not(target_os = "android"))] global_menu: Rc<RefCell<Option<Menu>>>,
    #[cfg(target_os = "android")] _global_menu: Rc<RefCell<Option<()>>>,
  ) -> Result<Self> {
    let options = options.unwrap_or_default();

    let mut attrs = WindowAttributes::default();

    if let Some(resizable) = options.resizable {
      attrs = attrs.with_resizable(resizable);
    }

    if let Some(width) = options.width {
      if let Some(logical) = options.logical {
        if logical {
          attrs = attrs.with_inner_size(LogicalSize::new(width, options.height.unwrap()));
        } else {
          attrs = attrs.with_inner_size(PhysicalSize::new(width, options.height.unwrap()));
        }
      } else {
        attrs = attrs.with_inner_size(PhysicalSize::new(width, options.height.unwrap()));
      }
    }

    if let Some(x) = options.x {
      if let Some(logical) = options.logical {
        if logical {
          attrs = attrs.with_position(LogicalPosition::new(x, options.y.unwrap()));
        } else {
          attrs = attrs.with_position(PhysicalPosition::new(x, options.y.unwrap()));
        }
      } else {
        attrs = attrs.with_position(PhysicalPosition::new(x, options.y.unwrap()));
      }
    }

    if let Some(visible) = options.visible {
      attrs = attrs.with_visible(visible);
    }

    if let Some(decorations) = options.decorations {
      attrs = attrs.with_decorations(decorations);
    }

    if let Some(transparent) = options.transparent {
      attrs = attrs.with_transparent(transparent);
    }

    if let Some(maximized) = options.maximized {
      attrs = attrs.with_maximized(maximized);
    }

    if let Some(focused) = options.focused {
      attrs = attrs.with_active(focused);
    }

    if let Some(content_protection) = options.content_protection {
      attrs = attrs.with_content_protected(content_protection);
    }

    // Window level: always_on_top takes priority over always_on_bottom
    let level = match (options.always_on_top, options.always_on_bottom) {
      (Some(true), _) => Some(WindowLevel::AlwaysOnTop),
      (_, Some(true)) => Some(WindowLevel::AlwaysOnBottom),
      _ => None,
    };
    if let Some(level) = level {
      attrs = attrs.with_window_level(level);
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
      attrs = attrs.with_enabled_buttons(buttons);
    }

    #[cfg(target_os = "macos")]
    if options.visible_on_all_workspaces == Some(true) {
      attrs = attrs.with_visible(true);
    }

    if let Some(fullscreen) = options.fullscreen {
      let fs = match fullscreen {
        FullscreenType::Borderless => Some(Fullscreen::Borderless(None)),
        FullscreenType::Exclusive => Some(Fullscreen::Borderless(None)), // best-effort
      };
      attrs = attrs.with_fullscreen(fs);
    }

    if let Some(title) = options.title {
      attrs = attrs.with_title(&title);
    }

    #[allow(deprecated)]
    let window = event_loop.create_window(attrs).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create window: {}", e),
      )
    })?;

    // On Windows, WebView2 is a child HWND that consumes all mouse events, so
    // winit's CursorMoved/MouseInput never fire for the border strip.  Install a
    // WM_NCHITTEST subclass on the parent HWND instead — Windows routes that
    // message to the topmost window before child dispatch, giving us native
    // cursor and drag-resize without any JS involvement.
    #[cfg(target_os = "windows")]
    if options.decorations == Some(false) && options.resizable != Some(false) {
      crate::win32_resize::install_resize_border(&window);
    }

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
      if let Some(menu) = global_menu.borrow().as_ref() {
        init_menu_for_window(menu, &window)?;
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
      event_handler: Rc::new(RefCell::new(None)),
      pending_protocols: Vec::new(), // populated by _registerProtocol
      protocol_next_id: Rc::new(RefCell::new(0)),
    })
  }

  /// Return a clone of the shared webview list. AppState holds this Rc so it
  /// can resize all webviews when a Resized event arrives for this window.
  pub(crate) fn webviews_shared(&self) -> Rc<RefCell<Vec<Rc<wry::WebView>>>> {
    Rc::clone(&self.webviews)
  }

  /// Low-level protocol registration used by the JS `registerProtocol` wrapper.
  /// `handler` is called with a single JSON string argument:
  /// `{ id, url, method, headers, body }` where `body` is a number[] or null.
  /// Call `_completeProtocol(id, response)` when the response is ready.
  #[napi(js_name = "_registerProtocol")]
  pub fn register_protocol_raw(&mut self, name: String, handler: FunctionRef<String, ()>) {
    self.pending_protocols.push((
      name,
      Rc::new(RefCell::new(Some(handler))),
      Rc::new(RefCell::new(std::collections::HashMap::new())),
      Rc::clone(&self.protocol_next_id),
    ));
  }

  /// Complete a pending async protocol request previously started by the
  /// `_registerProtocol` handler.  `id` matches the value in the JSON payload.
  #[napi(js_name = "_completeProtocol")]
  pub fn complete_protocol(&self, id: f64, response: CustomProtocolResponse) -> Result<()> {
    let id = id as u64;
    // Find the right responder map across all registered protocols
    for (_, _, responders, _) in &self.pending_protocols {
      let mut map = responders.borrow_mut();
      if let Some(responder) = map.remove(&id) {
        let http = build_wry_response(response)?;
        responder.respond(http);
        return Ok(());
      }
    }
    Ok(()) // id already completed or unknown — silently ignore
  }

  #[napi]
  pub fn create_webview(&mut self, env: Env, options: Option<WebviewOptions>) -> Result<JsWebview> {
    let webview = JsWebview::create(
      &env,
      &self.window, // Arc<Window> — create() now takes &Arc<Window>
      options.unwrap_or_default(),
      &self.pending_protocols,
    )?;
    // Keep an Rc clone so the WebView survives JS GC of the returned handle,
    // and so AppState can resize it on WM_SIZE.
    self
      .webviews
      .borrow_mut()
      .push(Rc::clone(&webview.webview_inner));
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
    self
      .window
      .enabled_buttons()
      .contains(WindowButtons::MAXIMIZE)
  }

  #[napi]
  pub fn is_minimizable(&self) -> bool {
    self
      .window
      .enabled_buttons()
      .contains(WindowButtons::MINIMIZE)
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
  /// Sets the window inner size (width and height).
  pub fn set_size(&self, width: u32, height: u32, logical: Option<bool>) -> Option<Dimensions> {
    let size = if let Some(logical) = logical {
      if logical {
        self
          .window
          .request_inner_size(LogicalSize::new(width as f64, height as f64))
      } else {
        self
          .window
          .request_inner_size(PhysicalSize::new(width, height))
      }
    } else {
      self
        .window
        .request_inner_size(PhysicalSize::new(width, height))
    };

    size.map(|s| Dimensions {
      width: s.width,
      height: s.height,
    })
  }

  #[napi]
  /// Sets the min window inner size (width and height).
  pub fn set_min_size(&self, width: u32, height: u32, logical: Option<bool>) {
    if width == 0 && height == 0 {
      self.window.set_min_inner_size(None::<Size>);
      return;
    }

    if let Some(logical) = logical {
      if logical {
        self
          .window
          .set_min_inner_size(Some(LogicalSize::new(width, height)));
      } else {
        self
          .window
          .set_min_inner_size(Some(PhysicalSize::new(width, height)));
      }
    } else {
      self
        .window
        .set_min_inner_size(Some(PhysicalSize::new(width, height)));
    }
  }

  #[napi]
  /// Gets the window inner size.
  pub fn get_inner_size(&self, logical: Option<bool>) -> Dimensions {
    let size = self.window.inner_size();
    if let Some(logical) = logical {
      if logical {
        let logical_size = size.to_logical::<f64>(self.window.scale_factor());
        return Dimensions {
          width: logical_size.width as u32,
          height: logical_size.height as u32,
        };
      }
    }
    Dimensions {
      width: size.width,
      height: size.height,
    }
  }

  #[napi]
  /// Sets the max window inner size (width and height).
  pub fn set_max_size(&self, width: u32, height: u32, logical: Option<bool>) {
    if width == 0 && height == 0 {
      self.window.set_max_inner_size(None::<Size>);
      return;
    }

    if let Some(logical) = logical {
      if logical {
        self
          .window
          .set_max_inner_size(Some(LogicalSize::new(width, height)));
      } else {
        self
          .window
          .set_max_inner_size(Some(PhysicalSize::new(width, height)));
      }
    } else {
      self
        .window
        .set_max_inner_size(Some(PhysicalSize::new(width, height)));
    }
  }

  #[napi]
  /// Gets the window outer size.
  pub fn get_outer_size(&self, logical: Option<bool>) -> Dimensions {
    let size = self.window.outer_size();
    if let Some(logical) = logical {
      if logical {
        let logical_size = size.to_logical::<f64>(self.window.scale_factor());
        return Dimensions {
          width: logical_size.width as u32,
          height: logical_size.height as u32,
        };
      }
    }
    Dimensions {
      width: size.width,
      height: size.height,
    }
  }

  #[napi]
  /// Opens a file select dialog
  pub fn open_file_dialog(&self, options: Option<FileDialogOptions>) -> Result<Vec<String>> {
    #[cfg(not(target_os = "android"))]
    {
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

      return Ok(
        files
          .unwrap_or_default()
          .into_iter()
          .map(|f| f.to_string_lossy().to_string())
          .collect(),
      );
    }
    #[cfg(target_os = "android")]
    {
      let _ = options;
      Ok(vec![])
    }
  }

  #[napi]
  pub fn id(&self) -> u32 {
    self.window_id
  }

  #[napi]
  pub fn has_menu(&self) -> bool {
    #[cfg(not(target_os = "android"))]
    {
      self.window_menu.is_some()
    }
    #[cfg(target_os = "android")]
    {
      false
    }
  }

  /// Returns the underlying winit WindowId (for internal tracking).
  pub fn winit_window_id(&self) -> WindowId {
    self.window.id()
  }

  /// Returns a clone of the shared event handler cell.  AppState holds this
  /// Rc so it can dispatch window events to the registered JS callback.
  pub(crate) fn event_handler_shared(
    &self,
  ) -> Rc<RefCell<Option<FunctionRef<WindowEventPayload, ()>>>> {
    Rc::clone(&self.event_handler)
  }

  /// Register a raw callback to receive window events.  Used internally by the
  /// JS EventEmitter wrapper; prefer `window.on(event, handler)` in user code.
  #[napi(js_name = "_onWindowEvent")]
  pub fn on_window_event(&self, handler: Option<FunctionRef<WindowEventPayload, ()>>) {
    *self.event_handler.borrow_mut() = handler;
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
  /// Set the window icon.
  /// - Passing raw RGBA bytes requires `width` and `height` (or just `width` to assume square).
  /// - Passing an encoded image buffer (PNG, ICO, JPEG, etc.) will auto-detect dimensions.
  pub fn set_window_icon(
    &self,
    icon: Either<&[u8], Vec<u8>>,
    width: Option<u32>,
    height: Option<u32>,
  ) -> Result<()> {
    let icon_bytes: &[u8] = match &icon {
      Either::A(bytes) => bytes,
      Either::B(bytes) => bytes.as_slice(),
    };

    let (rgba, width, height) = match (width, height) {
      (Some(w), Some(h)) => (icon_bytes.to_vec(), w, h),
      (Some(w), None) => (icon_bytes.to_vec(), w, w), // assume square if only width provided
      (None, None) => {
        let img = image::load_from_memory(icon_bytes).map_err(|e| {
          napi::Error::new(
            napi::Status::GenericFailure,
            format!("Failed to decode icon: {}", e),
          )
        })?;
        let (w, h) = img.dimensions();
        (img.to_rgba8().into_raw(), w, h)
      }
      _ => {
        return Err(napi::Error::new(
          napi::Status::InvalidArg,
          "Either width and height must be provided together, or at least width only, or neither"
            .to_string(),
        ))
      }
    };

    let ico = Icon::from_rgba(rgba, width, height).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create icon: {}", e),
      )
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
    self
      .window
      .available_monitors()
      .map(monitor_to_js)
      .collect()
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

  #[napi]
  /// Move the window so its outer top-left corner is at (`x`, `y`) in
  /// physical pixels.
  pub fn set_position(&self, x: i32, y: i32, logical: Option<bool>) {
    if let Some(logical) = logical {
      if logical {
        self.window.set_outer_position(LogicalPosition::new(x, y));
      } else {
        self.window.set_outer_position(PhysicalPosition::new(x, y));
      }
    } else {
      self.window.set_outer_position(PhysicalPosition::new(x, y));
    }
  }

  #[napi]
  /// Gets the window position.
  pub fn get_position(&self, logical: Option<bool>) -> Position {
    let position = self
      .window
      .outer_position()
      .unwrap_or(PhysicalPosition::new(0, 0));
    if let Some(logical) = logical {
      if logical {
        let logical_position = position.to_logical::<f64>(self.window.scale_factor());
        return Position {
          x: logical_position.x as i32,
          y: logical_position.y as i32,
        };
      }
    }
    Position {
      x: position.x,
      y: position.y,
    }
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

  // ── DPI ─────────────────────────────────────────────────────────────────────

  /// Device-pixel ratio for the monitor the window is currently on.
  #[napi]
  pub fn scale_factor(&self) -> f64 {
    self.window.scale_factor()
  }

  // ── Cursor ──────────────────────────────────────────────────────────────────

  #[napi]
  pub fn set_cursor(&self, cursor: CursorType) {
    #[allow(deprecated)]
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
    self
      .window
      .set_cursor_position(LogicalPosition::new(x, y))
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  /// When `true` the window ignores mouse input (click-through). Supported on
  /// Windows and macOS; a no-op on other platforms.
  #[napi]
  pub fn set_ignore_cursor_events(&self, ignore: bool) -> Result<()> {
    self
      .window
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

pub(crate) fn build_wry_response(
  resp: CustomProtocolResponse,
) -> Result<wry::http::Response<std::borrow::Cow<'static, [u8]>>> {
  use std::borrow::Cow;

  let status = resp.status_code.unwrap_or(200);
  let mime = resp
    .mime_type
    .unwrap_or_else(|| "application/octet-stream".to_string());
  let body_vec: Vec<u8> = resp.body.to_vec();

  let mut builder = wry::http::Response::builder()
    .status(status)
    .header("Content-Type", mime);

  if let Some(extra) = resp.headers {
    for h in extra {
      if let Some(v) = h.value {
        builder = builder.header(&h.key, v);
      }
    }
  }

  builder.body(Cow::Owned(body_vec)).map_err(|e| {
    napi::Error::new(
      napi::Status::GenericFailure,
      format!("Protocol response build error: {}", e),
    )
  })
}

pub(crate) fn next_protocol_id(counter: &ProtocolCounterRef) -> u64 {
  let mut value = counter.borrow_mut();
  let id = *value;
  *value += 1;
  id
}

fn monitor_to_js(m: winit::monitor::MonitorHandle) -> Monitor {
  Monitor {
    name: m.name(),
    scale_factor: m.scale_factor(),
    size: Dimensions {
      width: m.size().width,
      height: m.size().height,
    },
    position: Position {
      x: m.position().x,
      y: m.position().y,
    },
    video_modes: m
      .video_modes()
      .map(|v| JsVideoMode {
        size: Dimensions {
          width: v.size().width,
          height: v.size().height,
        },
        bit_depth: v.bit_depth(),
        refresh_rate: (v.refresh_rate_millihertz() / 1000) as u16,
      })
      .collect(),
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn protocol_ids_are_unique_when_protocols_share_a_counter() {
    let counter = Rc::new(RefCell::new(0));
    let first_protocol_counter = Rc::clone(&counter);
    let second_protocol_counter = Rc::clone(&counter);

    assert_eq!(next_protocol_id(&first_protocol_counter), 0);
    assert_eq!(next_protocol_id(&second_protocol_counter), 1);
  }
}

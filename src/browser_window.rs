use crate::types::*;
use dpi::Size;
use image::GenericImageView;
#[cfg(not(target_os = "android"))]
use muda::Menu;
use napi::Either;
use napi::{bindgen_prelude::FunctionRef, threadsafe_function::ThreadsafeFunction, Env, Result};
use napi_derive::*;
#[cfg(not(target_os = "android"))]
use rfd::FileDialog;
use std::cell::{Cell, RefCell};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::rc::Rc;
use std::sync::Arc;
use tao::{
  dpi::{LogicalPosition, LogicalSize, PhysicalPosition, PhysicalSize},
  event_loop::EventLoop,
  window::{CursorIcon, Fullscreen, Icon, Window, WindowBuilder, WindowId},
};

#[cfg(target_os = "windows")]
use tao::platform::windows::WindowExtWindows;

#[cfg(not(target_os = "android"))]
use crate::menu::{create_menu_from_options, init_menu_for_window};
use crate::webview::{
  JsWebview, ProtocolCounterRef, ProtocolHandlerRef, ProtocolPendingMap, WebviewBoolHandlerRef,
  WebviewEventHandlerRef, WebviewResource,
};

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn decode_icon(
  bytes: &[u8],
  width: Option<u32>,
  height: Option<u32>,
) -> Result<(Vec<u8>, u32, u32)> {
  match (width, height) {
    (Some(w), Some(h)) => Ok((bytes.to_vec(), w, h)),
    (Some(w), None) => Ok((bytes.to_vec(), w, w)),
    (None, None) => {
      let image = image::load_from_memory(bytes).map_err(|e| {
        napi::Error::new(
          napi::Status::GenericFailure,
          format!("Failed to decode icon: {}", e),
        )
      })?;
      let (width, height) = image.dimensions();
      Ok((image.to_rgba8().into_raw(), width, height))
    }
    _ => Err(napi::Error::new(
      napi::Status::InvalidArg,
      "height requires width",
    )),
  }
}

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
      windows_owner_window: None,
      windows_taskbar_icon: None,
      windows_no_redirection_bitmap: None,
      windows_drag_and_drop: None,
      windows_skip_taskbar: None,
      windows_class_name: None,
      windows_undecorated_shadow: None,
      macos_movable_by_window_background: None,
      macos_titlebar_transparent: None,
      macos_title_hidden: None,
      macos_titlebar_hidden: None,
      macos_titlebar_buttons_hidden: None,
      macos_fullsize_content_view: None,
      macos_disallow_hidpi: None,
      macos_has_shadow: None,
      macos_tabbing_identifier: None,
      ios_scale_factor: None,
      ios_valid_orientations: None,
      ios_prefers_home_indicator_hidden: None,
      ios_deferred_system_gesture_edges: None,
      ios_prefers_status_bar_hidden: None,
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
  webviews: Rc<RefCell<Vec<WebviewResource>>>,
  event_handler: Rc<RefCell<Option<FunctionRef<WindowEventPayload, ()>>>>,
  pending_protocols: Vec<PendingProtocol>,
  protocol_next_id: ProtocolCounterRef,
  pending_webview_event_handler: WebviewEventHandlerRef,
  pending_nav_handler: WebviewBoolHandlerRef,
  disposed: Rc<Cell<bool>>,
  webview_lifecycles: Rc<RefCell<Vec<Rc<Cell<bool>>>>>,
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

    let mut builder = WindowBuilder::new();

    if let Some(resizable) = options.resizable {
      builder = builder.with_resizable(resizable);
    }

    if let Some(width) = options.width {
      if options.logical == Some(true) {
        builder = builder.with_inner_size(LogicalSize::new(width, options.height.unwrap()));
      } else {
        builder = builder.with_inner_size(PhysicalSize::new(width, options.height.unwrap()));
      }
    }

    if let Some(x) = options.x {
      if options.logical == Some(true) {
        builder = builder.with_position(LogicalPosition::new(x, options.y.unwrap()));
      } else {
        builder = builder.with_position(PhysicalPosition::new(x, options.y.unwrap()));
      }
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
      builder = builder.with_focused(focused);
    }

    if let Some(content_protection) = options.content_protection {
      builder = builder.with_content_protection(content_protection);
    }

    if options.always_on_top == Some(true) {
      builder = builder.with_always_on_top(true);
    } else if options.always_on_bottom == Some(true) {
      builder = builder.with_always_on_bottom(true);
    }

    if options.maximizable == Some(false) {
      builder = builder.with_maximizable(false);
    }
    if options.minimizable == Some(false) {
      builder = builder.with_minimizable(false);
    }

    #[cfg(target_os = "macos")]
    if options.visible_on_all_workspaces == Some(true) {
      builder = builder.with_visible_on_all_workspaces(true);
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

    #[cfg(target_os = "windows")]
    {
      use tao::platform::windows::WindowBuilderExtWindows;
      if let Some(value) = options.windows_owner_window {
        let (negative, value, lossless) = value.get_u64();
        if negative || !lossless {
          return Err(napi::Error::new(
            napi::Status::InvalidArg,
            "windowsOwnerWindow must be a non-negative 64-bit bigint",
          ));
        }
        builder = builder.with_owner_window(value as isize);
      }
      if let Some(image) = options.windows_taskbar_icon {
        let (rgba, width, height) = decode_icon(image.data.as_ref(), image.width, image.height)?;
        let icon = Icon::from_rgba(rgba, width, height)
          .map_err(|e| napi::Error::new(napi::Status::InvalidArg, e.to_string()))?;
        builder = builder.with_taskbar_icon(Some(icon));
      }
      if let Some(value) = options.windows_no_redirection_bitmap {
        builder = builder.with_no_redirection_bitmap(value);
      }
      if let Some(value) = options.windows_drag_and_drop {
        builder = builder.with_drag_and_drop(value);
      }
      if let Some(value) = options.windows_skip_taskbar {
        builder = builder.with_skip_taskbar(value);
      }
      if let Some(value) = options.windows_class_name {
        builder = builder.with_window_classname(value);
      }
      if let Some(value) = options.windows_undecorated_shadow {
        builder = builder.with_undecorated_shadow(value);
      }
    }

    #[cfg(target_os = "macos")]
    {
      use tao::platform::macos::WindowBuilderExtMacOS;
      if let Some(value) = options.macos_movable_by_window_background {
        builder = builder.with_movable_by_window_background(value);
      }
      if let Some(value) = options.macos_titlebar_transparent {
        builder = builder.with_titlebar_transparent(value);
      }
      if let Some(value) = options.macos_title_hidden {
        builder = builder.with_title_hidden(value);
      }
      if let Some(value) = options.macos_titlebar_hidden {
        builder = builder.with_titlebar_hidden(value);
      }
      if let Some(value) = options.macos_titlebar_buttons_hidden {
        builder = builder.with_titlebar_buttons_hidden(value);
      }
      if let Some(value) = options.macos_fullsize_content_view {
        builder = builder.with_fullsize_content_view(value);
      }
      if let Some(value) = options.macos_disallow_hidpi {
        builder = builder.with_disallow_hidpi(value);
      }
      if let Some(value) = options.macos_has_shadow {
        builder = builder.with_has_shadow(value);
      }
      if let Some(value) = options.macos_tabbing_identifier.as_deref() {
        builder = builder.with_tabbing_identifier(value);
      }
    }

    #[cfg(target_os = "ios")]
    {
      use tao::platform::ios::{ScreenEdge, ValidOrientations, WindowBuilderExtIOS};

      if let Some(value) = options.ios_scale_factor {
        builder = builder.with_scale_factor(value);
      }
      if let Some(value) = options.ios_valid_orientations {
        let orientations = match value {
          IosValidOrientations::LandscapeAndPortrait => ValidOrientations::LandscapeAndPortrait,
          IosValidOrientations::Landscape => ValidOrientations::Landscape,
          IosValidOrientations::Portrait => ValidOrientations::Portrait,
        };
        builder = builder.with_valid_orientations(orientations);
      }
      if let Some(value) = options.ios_prefers_home_indicator_hidden {
        builder = builder.with_prefers_home_indicator_hidden(value);
      }
      if let Some(value) = options.ios_deferred_system_gesture_edges {
        builder = builder.with_preferred_screen_edges_deferring_system_gestures(
          ScreenEdge::from_bits_truncate(value),
        );
      }
      if let Some(value) = options.ios_prefers_status_bar_hidden {
        builder = builder.with_prefers_status_bar_hidden(value);
      }
    }

    let window = builder.build(event_loop).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create window: {}", e),
      )
    })?;

    let mut hasher = DefaultHasher::new();
    window.id().hash(&mut hasher);
    let window_id = hasher.finish() as u32;

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
      pending_protocols: Vec::new(),
      protocol_next_id: Rc::new(RefCell::new(0)),
      pending_webview_event_handler: Rc::new(RefCell::new(None)),
      pending_nav_handler: Rc::new(RefCell::new(None)),
      disposed: Rc::new(Cell::new(false)),
      webview_lifecycles: Rc::new(RefCell::new(Vec::new())),
    })
  }

  pub(crate) fn webviews_shared(&self) -> Rc<RefCell<Vec<WebviewResource>>> {
    Rc::clone(&self.webviews)
  }

  pub(crate) fn lifecycle_shared(&self) -> Rc<Cell<bool>> {
    Rc::clone(&self.disposed)
  }

  pub(crate) fn webview_lifecycles_shared(&self) -> Rc<RefCell<Vec<Rc<Cell<bool>>>>> {
    Rc::clone(&self.webview_lifecycles)
  }

  #[napi(js_name = "_registerProtocol")]
  pub fn register_protocol_raw(&mut self, name: String, handler: FunctionRef<String, ()>) {
    self.pending_protocols.push((
      name,
      Rc::new(RefCell::new(Some(handler))),
      Rc::new(RefCell::new(std::collections::HashMap::new())),
      Rc::clone(&self.protocol_next_id),
    ));
  }

  #[napi(js_name = "_completeProtocol")]
  pub fn complete_protocol(&self, id: f64, response: CustomProtocolResponse) -> Result<()> {
    let id = id as u64;
    for (_, _, responders, _) in &self.pending_protocols {
      let mut map = responders.borrow_mut();
      if let Some(responder) = map.remove(&id) {
        let http = build_wry_response(response)?;
        responder.respond(http);
        return Ok(());
      }
    }
    Ok(())
  }

  #[napi]
  pub fn create_webview(
    &mut self,
    env: Env,
    options: Option<WebviewOptions>,
    web_context: Option<&mut crate::web_context::JsWebContext>,
  ) -> Result<JsWebview> {
    if self.disposed.get() {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "BrowserWindow has been disposed",
      ));
    }
    let event_handler = Rc::new(RefCell::new(
      self.pending_webview_event_handler.borrow_mut().take(),
    ));
    let nav_handler = Rc::new(RefCell::new(self.pending_nav_handler.borrow_mut().take()));
    let webview = JsWebview::create(
      &env,
      &self.window,
      options.unwrap_or_default(),
      web_context,
      &self.pending_protocols,
      event_handler,
      nav_handler,
    )?;
    self
      .webviews
      .borrow_mut()
      .push(Rc::clone(&webview.webview_inner));
    self
      .webview_lifecycles
      .borrow_mut()
      .push(webview.lifecycle_shared());
    Ok(webview)
  }

  #[napi(js_name = "_setPendingWebviewEventCallback")]
  pub fn set_pending_webview_event_callback(
    &mut self,
    handler: ThreadsafeFunction<WebviewEventPayload>,
  ) {
    *self.pending_webview_event_handler.borrow_mut() = Some(Arc::new(handler));
  }

  #[napi(js_name = "_setPendingWebviewNavigationHandler")]
  pub fn set_pending_webview_navigation_handler(&mut self, handler: FunctionRef<String, bool>) {
    *self.pending_nav_handler.borrow_mut() = Some(handler);
  }

  #[napi(js_name = "_clearPendingWebviewHandlers")]
  pub fn clear_pending_webview_handlers(&mut self) {
    *self.pending_webview_event_handler.borrow_mut() = None;
    *self.pending_nav_handler.borrow_mut() = None;
  }

  #[napi(getter)]
  pub fn is_child(&self) -> bool {
    self.is_child_window
  }

  #[napi]
  pub fn get_native_handle(&self) -> u64 {
    #[cfg(target_os = "windows")]
    {
      self.window.hwnd() as u64
    }
    #[cfg(target_os = "macos")]
    {
      use tao::platform::macos::WindowExtMacOS;
      return self.window.ns_view() as u64;
    }
    #[cfg(target_os = "linux")]
    {
      use tao::rwh_06::{HasWindowHandle, RawWindowHandle};
      if let Ok(handle) = self.window.window_handle() {
        return match handle.as_raw() {
          RawWindowHandle::Xlib(handle) => handle.window as u64,
          RawWindowHandle::Wayland(handle) => handle.surface.as_ptr() as u64,
          _ => 0,
        };
      }
      return 0;
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    0
  }

  #[napi]
  pub fn is_focused(&self) -> bool {
    self.window.is_focused()
  }

  #[napi]
  pub fn is_visible(&self) -> bool {
    self.window.is_visible()
  }

  #[napi]
  pub fn is_decorated(&self) -> bool {
    self.window.is_decorated()
  }

  #[napi]
  pub fn is_closable(&self) -> bool {
    self.window.is_closable()
  }

  #[napi]
  pub fn is_maximizable(&self) -> bool {
    self.window.is_maximizable()
  }

  #[napi]
  pub fn is_minimizable(&self) -> bool {
    self.window.is_minimizable()
  }

  #[napi]
  pub fn is_maximized(&self) -> bool {
    self.window.is_maximized()
  }

  #[napi]
  pub fn is_minimized(&self) -> bool {
    self.window.is_minimized()
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
    self.window.set_closable(closable);
  }

  #[napi]
  pub fn set_maximizable(&self, maximizable: bool) {
    self.window.set_maximizable(maximizable);
  }

  #[napi]
  pub fn set_minimizable(&self, minimizable: bool) {
    self.window.set_minimizable(minimizable);
  }

  #[napi]
  pub fn set_resizable(&self, resizable: bool) {
    self.window.set_resizable(resizable);
  }

  #[napi]
  pub fn set_size(&self, width: u32, height: u32, logical: Option<bool>) -> Option<Dimensions> {
    if logical == Some(true) {
      self
        .window
        .set_inner_size(LogicalSize::new(width as f64, height as f64));
    } else {
      self.window.set_inner_size(PhysicalSize::new(width, height));
    }
    // tao's set_inner_size is void — return None to indicate async application
    None
  }

  #[napi]
  pub fn set_min_size(&self, width: u32, height: u32, logical: Option<bool>) {
    if width == 0 && height == 0 {
      self.window.set_min_inner_size(None::<Size>);
      return;
    }
    if logical == Some(true) {
      self
        .window
        .set_min_inner_size(Some(LogicalSize::new(width, height)));
    } else {
      self
        .window
        .set_min_inner_size(Some(PhysicalSize::new(width, height)));
    }
  }

  #[napi]
  pub fn get_inner_size(&self, logical: Option<bool>) -> Dimensions {
    let size = self.window.inner_size();
    if logical == Some(true) {
      let logical_size = size.to_logical::<f64>(self.window.scale_factor());
      return Dimensions {
        width: logical_size.width as u32,
        height: logical_size.height as u32,
      };
    }
    Dimensions {
      width: size.width,
      height: size.height,
    }
  }

  #[napi]
  pub fn set_max_size(&self, width: u32, height: u32, logical: Option<bool>) {
    if width == 0 && height == 0 {
      self.window.set_max_inner_size(None::<Size>);
      return;
    }
    if logical == Some(true) {
      self
        .window
        .set_max_inner_size(Some(LogicalSize::new(width, height)));
    } else {
      self
        .window
        .set_max_inner_size(Some(PhysicalSize::new(width, height)));
    }
  }

  #[napi]
  pub fn get_outer_size(&self, logical: Option<bool>) -> Dimensions {
    let size = self.window.outer_size();
    if logical == Some(true) {
      let logical_size = size.to_logical::<f64>(self.window.scale_factor());
      return Dimensions {
        width: logical_size.width as u32,
        height: logical_size.height as u32,
      };
    }
    Dimensions {
      width: size.width,
      height: size.height,
    }
  }

  #[napi]
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
      Ok(
        files
          .unwrap_or_default()
          .into_iter()
          .map(|f| f.to_string_lossy().to_string())
          .collect(),
      )
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

  /// Returns the underlying tao WindowId (for internal tracking).
  pub fn tao_window_id(&self) -> WindowId {
    self.window.id()
  }

  pub(crate) fn event_handler_shared(
    &self,
  ) -> Rc<RefCell<Option<FunctionRef<WindowEventPayload, ()>>>> {
    Rc::clone(&self.event_handler)
  }

  #[napi]
  pub fn dispose(&mut self) {
    if self.disposed.replace(true) {
      return;
    }
    self.window.set_visible(false);
    for resource in self.webviews.borrow().iter() {
      if let Some(webview) = resource.borrow_mut().take() {
        let _ = webview.set_visible(false);
      }
    }
    self.webviews.borrow_mut().clear();
    for lifecycle in self.webview_lifecycles.borrow().iter() {
      lifecycle.set(true);
    }
    self.webview_lifecycles.borrow_mut().clear();
    self.event_handler.borrow_mut().take();
    self.pending_webview_event_handler.borrow_mut().take();
    self.pending_nav_handler.borrow_mut().take();
    for (_, handler, responders, _) in &self.pending_protocols {
      handler.borrow_mut().take();
      responders.borrow_mut().clear();
    }
    self.pending_protocols.clear();
    #[cfg(not(target_os = "android"))]
    self.window_menu.take();
  }

  #[napi]
  pub fn is_disposed(&self) -> bool {
    self.disposed.get()
  }

  #[napi(js_name = "_onWindowEvent")]
  pub fn on_window_event(&self, handler: Option<FunctionRef<WindowEventPayload, ()>>) {
    *self.event_handler.borrow_mut() = handler;
  }

  #[napi(getter)]
  pub fn get_theme(&self) -> Theme {
    match self.window.theme() {
      tao::window::Theme::Light => Theme::Light,
      tao::window::Theme::Dark => Theme::Dark,
      _ => Theme::System,
    }
  }

  #[napi]
  pub fn set_theme(&self, theme: Theme) {
    let t = match theme {
      Theme::Light => Some(tao::window::Theme::Light),
      Theme::Dark => Some(tao::window::Theme::Dark),
      _ => None,
    };
    self.window.set_theme(t);
  }

  #[napi]
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
      (Some(w), None) => (icon_bytes.to_vec(), w, w),
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
          "Either width and height must be provided together, or at least width only, or neither",
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
  pub fn set_enable(&self, enabled: bool) {
    #[cfg(target_os = "windows")]
    self.window.set_enable(enabled);
    #[cfg(not(target_os = "windows"))]
    let _ = enabled;
  }

  #[napi]
  pub fn set_taskbar_icon(
    &self,
    icon: Either<&[u8], Vec<u8>>,
    width: Option<u32>,
    height: Option<u32>,
  ) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
      let icon_bytes = match &icon {
        Either::A(bytes) => *bytes,
        Either::B(bytes) => bytes.as_slice(),
      };
      let (rgba, width, height) = decode_icon(icon_bytes, width, height)?;
      let icon = Icon::from_rgba(rgba, width, height)
        .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))?;
      self.window.set_taskbar_icon(Some(icon));
    }
    #[cfg(not(target_os = "windows"))]
    let _ = (icon, width, height);
    Ok(())
  }

  #[napi]
  pub fn remove_taskbar_icon(&self) {
    #[cfg(target_os = "windows")]
    self.window.set_taskbar_icon(None);
  }

  #[napi]
  pub fn set_undecorated_shadow(&self, shadow: bool) {
    #[cfg(target_os = "windows")]
    self.window.set_undecorated_shadow(shadow);
    #[cfg(not(target_os = "windows"))]
    let _ = shadow;
  }

  #[napi]
  pub fn get_native_handle_any_thread(&self) -> u64 {
    #[cfg(target_os = "windows")]
    {
      self.window.hwnd() as u64
    }
    #[cfg(not(target_os = "windows"))]
    0
  }

  #[napi]
  pub fn simple_fullscreen(&self) -> bool {
    #[cfg(target_os = "macos")]
    {
      use tao::platform::macos::WindowExtMacOS;
      return self.window.simple_fullscreen();
    }
    #[cfg(not(target_os = "macos"))]
    false
  }

  #[napi]
  pub fn set_simple_fullscreen(&self, fullscreen: bool) -> bool {
    #[cfg(target_os = "macos")]
    {
      use tao::platform::macos::WindowExtMacOS;
      return self.window.set_simple_fullscreen(fullscreen);
    }
    #[cfg(not(target_os = "macos"))]
    {
      let _ = fullscreen;
      false
    }
  }

  #[napi]
  pub fn has_shadow(&self) -> bool {
    #[cfg(target_os = "macos")]
    {
      use tao::platform::macos::WindowExtMacOS;
      return self.window.has_shadow();
    }
    #[cfg(not(target_os = "macos"))]
    false
  }

  #[napi]
  pub fn set_has_shadow(&self, value: bool) {
    #[cfg(target_os = "macos")]
    {
      use tao::platform::macos::WindowExtMacOS;
      self.window.set_has_shadow(value);
    }
    #[cfg(not(target_os = "macos"))]
    let _ = value;
  }

  #[napi]
  pub fn set_tabbing_identifier(&self, identifier: String) {
    #[cfg(target_os = "macos")]
    {
      use tao::platform::macos::WindowExtMacOS;
      self.window.set_tabbing_identifier(&identifier);
    }
    #[cfg(not(target_os = "macos"))]
    let _ = identifier;
  }

  #[napi]
  pub fn tabbing_identifier(&self) -> String {
    #[cfg(target_os = "macos")]
    {
      use tao::platform::macos::WindowExtMacOS;
      return self.window.tabbing_identifier();
    }
    #[cfg(not(target_os = "macos"))]
    String::new()
  }

  #[napi]
  pub fn is_document_edited(&self) -> bool {
    #[cfg(target_os = "macos")]
    {
      use tao::platform::macos::WindowExtMacOS;
      return self.window.is_document_edited();
    }
    #[cfg(not(target_os = "macos"))]
    false
  }

  #[napi]
  pub fn set_document_edited(&self, edited: bool) {
    #[cfg(target_os = "macos")]
    {
      use tao::platform::macos::WindowExtMacOS;
      self.window.set_is_document_edited(edited);
    }
    #[cfg(not(target_os = "macos"))]
    let _ = edited;
  }

  #[napi]
  pub fn get_wayland_surface(&self) -> u64 {
    #[cfg(target_os = "linux")]
    {
      use tao::rwh_06::{HasWindowHandle, RawWindowHandle};
      return self
        .window
        .window_handle()
        .ok()
        .and_then(|handle| match handle.as_raw() {
          RawWindowHandle::Wayland(handle) => Some(handle.surface.as_ptr() as u64),
          _ => None,
        })
        .unwrap_or(0);
    }
    #[cfg(not(target_os = "linux"))]
    0
  }

  #[napi]
  pub fn set_ios_scale_factor(&self, value: f64) {
    #[cfg(target_os = "ios")]
    {
      use tao::platform::ios::WindowExtIOS;
      self.window.set_scale_factor(value);
    }
    #[cfg(not(target_os = "ios"))]
    let _ = value;
  }

  #[napi]
  pub fn set_valid_orientations(&self, value: IosValidOrientations) {
    #[cfg(target_os = "ios")]
    {
      use tao::platform::ios::{ValidOrientations, WindowExtIOS};
      let value = match value {
        IosValidOrientations::LandscapeAndPortrait => ValidOrientations::LandscapeAndPortrait,
        IosValidOrientations::Landscape => ValidOrientations::Landscape,
        IosValidOrientations::Portrait => ValidOrientations::Portrait,
      };
      self.window.set_valid_orientations(value);
    }
    #[cfg(not(target_os = "ios"))]
    let _ = value;
  }

  #[napi]
  pub fn set_prefers_home_indicator_hidden(&self, value: bool) {
    #[cfg(target_os = "ios")]
    {
      use tao::platform::ios::WindowExtIOS;
      self.window.set_prefers_home_indicator_hidden(value);
    }
    #[cfg(not(target_os = "ios"))]
    let _ = value;
  }

  #[napi]
  pub fn set_preferred_screen_edges_deferring_system_gestures(&self, edges: u8) {
    #[cfg(target_os = "ios")]
    {
      use tao::platform::ios::{ScreenEdge, WindowExtIOS};
      self
        .window
        .set_preferred_screen_edges_deferring_system_gestures(ScreenEdge::from_bits_truncate(
          edges,
        ));
    }
    #[cfg(not(target_os = "ios"))]
    let _ = edges;
  }

  #[napi]
  pub fn set_prefers_status_bar_hidden(&self, value: bool) {
    #[cfg(target_os = "ios")]
    {
      use tao::platform::ios::WindowExtIOS;
      self.window.set_prefers_status_bar_hidden(value);
    }
    #[cfg(not(target_os = "ios"))]
    let _ = value;
  }

  #[napi]
  pub fn android_content_rect(&self) -> AndroidContentRect {
    #[cfg(target_os = "android")]
    {
      use tao::platform::android::WindowExtAndroid;
      let rect = self.window.content_rect();
      return AndroidContentRect {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      };
    }
    #[cfg(not(target_os = "android"))]
    AndroidContentRect {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    }
  }

  #[napi]
  pub fn android_config(&self) -> String {
    #[cfg(target_os = "android")]
    {
      use tao::platform::android::WindowExtAndroid;
      return format!("{:?}", self.window.config());
    }
    #[cfg(not(target_os = "android"))]
    String::new()
  }

  #[napi]
  pub fn set_visible(&self, visible: bool) {
    self.window.set_visible(visible);
  }

  #[napi]
  pub fn set_progress_bar(&self, state: JsProgressBar) {
    use tao::window::{ProgressBarState, ProgressState};

    let progress = state.progress.map(u64::from);
    let progress_state = state.state.map(|state| match state {
      JsProgressBarState::None => ProgressState::None,
      JsProgressBarState::Normal => ProgressState::Normal,
      JsProgressBarState::Indeterminate => ProgressState::Indeterminate,
      JsProgressBarState::Paused => ProgressState::Paused,
      JsProgressBarState::Error => ProgressState::Error,
    });
    self.window.set_progress_bar(ProgressBarState {
      state: progress_state,
      progress,
      desktop_filename: None,
    });
  }

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
    self.window.set_focus();
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

  #[napi]
  pub fn get_monitor_from_point(&self, x: f64, y: f64) -> Option<Monitor> {
    self.window.monitor_from_point(x, y).map(monitor_to_js)
  }

  #[napi]
  pub fn set_content_protection(&self, enabled: bool) {
    self.window.set_content_protection(enabled);
  }

  #[napi]
  pub fn set_always_on_top(&self, enabled: bool) {
    self.window.set_always_on_top(enabled);
  }

  #[napi]
  pub fn set_always_on_bottom(&self, enabled: bool) {
    self.window.set_always_on_bottom(enabled);
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
      _ => None,
    }
  }

  #[napi]
  pub fn set_fullscreen(&self, fullscreen_type: Option<FullscreenType>) {
    let fs = match fullscreen_type {
      Some(FullscreenType::Exclusive) => self
        .window
        .current_monitor()
        .and_then(|m| m.video_modes().next())
        .map(Fullscreen::Exclusive),
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

  #[napi]
  pub fn set_position(&self, x: i32, y: i32, logical: Option<bool>) {
    if logical == Some(true) {
      self.window.set_outer_position(LogicalPosition::new(x, y));
    } else {
      self.window.set_outer_position(PhysicalPosition::new(x, y));
    }
  }

  #[napi]
  pub fn get_position(&self, logical: Option<bool>) -> Position {
    let position = self
      .window
      .outer_position()
      .unwrap_or(PhysicalPosition::new(0, 0));
    if logical == Some(true) {
      let logical_position = position.to_logical::<f64>(self.window.scale_factor());
      return Position {
        x: logical_position.x as i32,
        y: logical_position.y as i32,
      };
    }
    Position {
      x: position.x,
      y: position.y,
    }
  }

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

  #[napi(getter)]
  pub fn width(&self) -> u32 {
    self.window.inner_size().width
  }

  #[napi(getter)]
  pub fn height(&self) -> u32 {
    self.window.inner_size().height
  }

  #[napi(getter)]
  pub fn x(&self) -> i32 {
    self
      .window
      .outer_position()
      .unwrap_or(PhysicalPosition::new(0, 0))
      .x
  }

  #[napi(getter)]
  pub fn y(&self) -> i32 {
    self
      .window
      .outer_position()
      .unwrap_or(PhysicalPosition::new(0, 0))
      .y
  }

  #[napi]
  pub fn scale_factor(&self) -> f64 {
    self.window.scale_factor()
  }

  #[napi]
  pub fn set_cursor(&self, cursor: CursorType) {
    self.window.set_cursor_icon(cursor.into());
  }

  #[napi]
  pub fn set_cursor_visible(&self, visible: bool) {
    self.window.set_cursor_visible(visible);
  }

  #[napi]
  pub fn set_cursor_position(&self, x: f64, y: f64) -> Result<()> {
    self
      .window
      .set_cursor_position(LogicalPosition::new(x, y))
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  #[napi]
  pub fn set_ignore_cursor_events(&self, ignore: bool) -> Result<()> {
    self
      .window
      .set_ignore_cursor_events(ignore)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  #[napi]
  pub fn set_skip_taskbar(&self, skip: bool) {
    #[cfg(target_os = "windows")]
    {
      use tao::platform::windows::WindowExtWindows;
      let _ = self.window.set_skip_taskbar(skip);
    }
    #[cfg(target_os = "linux")]
    {
      use tao::platform::unix::WindowExtUnix;
      let _ = self.window.set_skip_taskbar(skip);
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    let _ = skip;
  }

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
      CursorType::Hand => CursorIcon::Hand,
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

fn monitor_to_js(m: tao::monitor::MonitorHandle) -> Monitor {
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
        refresh_rate: v.refresh_rate(),
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

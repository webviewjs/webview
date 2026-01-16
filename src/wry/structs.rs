//! Wry structs
//!
//! This module contains all structs from the wry crate.

use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use std::sync::{Arc, Mutex};

use crate::tao::structs::EventLoop;
use crate::wry::enums::WryTheme;
use crate::wry::types::Result;
#[cfg(any(
  target_os = "linux",
  target_os = "dragonfly",
  target_os = "freebsd",
  target_os = "netbsd",
  target_os = "openbsd"
))]
use tao::platform::unix::WindowExtUnix;
#[cfg(any(
  target_os = "linux",
  target_os = "dragonfly",
  target_os = "freebsd",
  target_os = "netbsd",
  target_os = "openbsd"
))]
use wry::WebViewBuilderExtUnix;

/// An initialization script to be run when creating a webview.
#[napi(object)]
pub struct InitializationScript {
  /// The JavaScript code to run.
  pub js: String,
  /// Whether to run the script only once.
  pub once: bool,
}

/// Features to configure a new window.
#[napi(object)]
pub struct NewWindowFeatures {
  /// Whether the new window should have a menubar.
  pub menubar: bool,
  /// Whether the new window should be visible.
  pub visible: bool,
  /// The width of the new window.
  pub width: u32,
  /// The height of the new window.
  pub height: u32,
  /// The X coordinate of the new window.
  pub x: i32,
  /// The Y coordinate of the new window.
  pub y: i32,
  /// Whether the new window should be maximized.
  pub maximized: bool,
  /// Whether the new window should be focused.
  pub focused: bool,
  /// Whether the new window should have decorations.
  pub decorations: bool,
  /// Whether the new window should always be on top.
  pub always_on_top: bool,
  /// Whether the new window should be transparent.
  pub transparent: bool,
}

/// The opener of a new window.
#[napi(object)]
pub struct NewWindowOpener {
  /// The label of the opener webview.
  pub label: String,
  /// The native ID of the opener webview.
  pub native_id: u32,
}

/// A proxy endpoint for web content.
#[napi(object)]
pub struct ProxyEndpoint {
  /// The host of the proxy.
  pub host: String,
  /// The port of the proxy.
  pub port: u16,
}

/// A rectangle area.
#[napi(object)]
pub struct Rect {
  /// The X coordinate of the top-left corner.
  pub x: i32,
  /// The Y coordinate of the top-left corner.
  pub y: i32,
  /// The width of the rectangle.
  pub width: u32,
  /// The height of the rectangle.
  pub height: u32,
}

/// A responder for a request.
#[napi(object)]
pub struct RequestAsyncResponder {
  /// The URI of the request.
  pub uri: String,
  /// The HTTP method of the request.
  pub method: String,
  /// The body of the request.
  pub body: Buffer,
}

/// The web context for a webview.
#[napi]
pub struct WebContext {
  #[allow(clippy::arc_with_non_send_sync)]
  inner: Arc<Mutex<wry::WebContext>>,
}

#[napi]
impl WebContext {
  /// Creates a new web context with the given data directory.
  #[napi(constructor)]
  pub fn new(data_directory: Option<String>) -> Result<Self> {
    let context = if let Some(dir) = data_directory {
      wry::WebContext::new(Some(dir.into()))
    } else {
      wry::WebContext::new(None)
    };
    Ok(Self {
      #[allow(clippy::arc_with_non_send_sync)]
      inner: Arc::new(Mutex::new(context)),
    })
  }

  /// Gets the data directory for this web context.
  #[napi]
  pub fn data_directory(&self) -> Result<Option<String>> {
    Ok(
      self
        .inner
        .lock()
        .unwrap()
        .data_directory()
        .map(|p| p.to_string_lossy().to_string()),
    )
  }
}

/// Attributes for creating a webview.
#[napi(object)]
pub struct WebViewAttributes {
  /// The URL to load.
  pub url: Option<String>,
  /// The HTML content to load.
  pub html: Option<String>,
  /// The width of the webview.
  pub width: u32,
  /// The height of the webview.
  pub height: u32,
  /// The X coordinate of the webview.
  pub x: i32,
  /// The Y coordinate of the webview.
  pub y: i32,
  /// Whether the webview is resizable.
  pub resizable: bool,
  /// The title of the webview.
  pub title: Option<String>,
  /// Whether the webview has a menubar.
  pub menubar: bool,
  /// Whether the webview is maximized.
  pub maximized: bool,
  /// Whether the webview is minimized.
  pub minimized: bool,
  /// Whether the webview is visible.
  pub visible: bool,
  /// Whether the webview has decorations.
  pub decorations: bool,
  /// Whether the webview is always on top.
  pub always_on_top: bool,
  /// Whether the webview is transparent.
  pub transparent: bool,
  /// Whether the webview has focus.
  pub focused: bool,
  /// The icon of the webview.
  pub icon: Option<Buffer>,
  /// The theme of the webview.
  pub theme: Option<WryTheme>,
  /// The user agent of the webview.
  pub user_agent: Option<String>,
  /// Initialization scripts to run.
  pub initialization_scripts: Vec<InitializationScript>,
  /// Whether to enable drag drop.
  pub drag_drop: bool,
  /// The background color of the webview.
  pub background_color: Option<Buffer>,
  /// Whether to enable devtools.
  pub devtools: bool,
  /// Whether to enable incognito mode.
  pub incognito: bool,
  /// Whether to enable zoom hotkeys.
  pub hotkeys_zoom: bool,
  /// Whether to enable clipboard access.
  pub clipboard: bool,
  /// Whether to enable autoplay.
  pub autoplay: bool,
  /// Whether to enable back/forward navigation gestures.
  pub back_forward_navigation_gestures: bool,
}

pub type IpcHandler = ThreadsafeFunction<String>;

/// Builder for creating webviews.
#[napi]
pub struct WebViewBuilder {
  attributes: WebViewAttributes,
  ipc_handler: Option<IpcHandler>,
  ipc_handlers: Vec<IpcHandler>,
  #[allow(dead_code)]
  inner: Option<wry::WebViewBuilder<'static>>,
}

#[napi]
impl WebViewBuilder {
  /// Creates a new webview builder.
  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Ok(Self {
      attributes: WebViewAttributes {
        url: None,
        html: None,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        resizable: true,
        title: None,
        menubar: true,
        maximized: false,
        minimized: false,
        visible: true,
        decorations: true,
        always_on_top: false,
        transparent: false,
        focused: true,
        icon: None,
        theme: None,
        user_agent: None,
        initialization_scripts: Vec::new(),
        drag_drop: true,
        background_color: None,
        devtools: true,
        incognito: false,
        hotkeys_zoom: true,
        clipboard: true,
        autoplay: true,
        back_forward_navigation_gestures: false,
      },
      ipc_handler: None,
      ipc_handlers: Vec::new(),
      inner: None,
    })
  }

  /// Sets the URL to load.
  #[napi]
  pub fn with_url(&mut self, url: String) -> Result<&Self> {
    self.attributes.url = Some(url);
    Ok(self)
  }

  /// Sets the HTML content to load.
  #[napi]
  pub fn with_html(&mut self, html: String) -> Result<&Self> {
    self.attributes.html = Some(html);
    Ok(self)
  }

  /// Sets the width of the webview.
  #[napi]
  pub fn with_width(&mut self, width: u32) -> Result<&Self> {
    self.attributes.width = width;
    Ok(self)
  }

  /// Sets the height of the webview.
  #[napi]
  pub fn with_height(&mut self, height: u32) -> Result<&Self> {
    self.attributes.height = height;
    Ok(self)
  }

  /// Sets the X coordinate of the webview.
  #[napi]
  pub fn with_x(&mut self, x: i32) -> Result<&Self> {
    self.attributes.x = x;
    Ok(self)
  }

  /// Sets the Y coordinate of the webview.
  #[napi]
  pub fn with_y(&mut self, y: i32) -> Result<&Self> {
    self.attributes.y = y;
    Ok(self)
  }

  /// Sets whether the webview is resizable.
  #[napi]
  pub fn with_resizable(&mut self, resizable: bool) -> Result<&Self> {
    self.attributes.resizable = resizable;
    Ok(self)
  }

  /// Sets the title of the webview.
  #[napi]
  pub fn with_title(&mut self, title: String) -> Result<&Self> {
    self.attributes.title = Some(title);
    Ok(self)
  }

  /// Sets whether the webview has a menubar.
  #[napi]
  pub fn with_menubar(&mut self, menubar: bool) -> Result<&Self> {
    self.attributes.menubar = menubar;
    Ok(self)
  }

  /// Sets whether the webview is maximized.
  #[napi]
  pub fn with_maximized(&mut self, maximized: bool) -> Result<&Self> {
    self.attributes.maximized = maximized;
    Ok(self)
  }

  /// Sets whether the webview is minimized.
  #[napi]
  pub fn with_minimized(&mut self, minimized: bool) -> Result<&Self> {
    self.attributes.minimized = minimized;
    Ok(self)
  }

  /// Sets whether the webview is visible.
  #[napi]
  pub fn with_visible(&mut self, visible: bool) -> Result<&Self> {
    self.attributes.visible = visible;
    Ok(self)
  }

  /// Sets whether the webview has decorations.
  #[napi]
  pub fn with_decorated(&mut self, decorations: bool) -> Result<&Self> {
    self.attributes.decorations = decorations;
    Ok(self)
  }

  /// Sets whether the webview is always on top.
  #[napi]
  pub fn with_always_on_top(&mut self, always_on_top: bool) -> Result<&Self> {
    self.attributes.always_on_top = always_on_top;
    Ok(self)
  }

  /// Sets whether the webview is transparent.
  #[napi]
  pub fn with_transparent(&mut self, transparent: bool) -> Result<&Self> {
    self.attributes.transparent = transparent;
    Ok(self)
  }

  /// Sets whether the webview has focus.
  #[napi]
  pub fn with_focused(&mut self, focused: bool) -> Result<&Self> {
    self.attributes.focused = focused;
    Ok(self)
  }

  /// Sets the icon of the webview.
  #[napi]
  pub fn with_icon(&mut self, icon: Buffer) -> Result<&Self> {
    self.attributes.icon = Some(icon);
    Ok(self)
  }

  /// Sets the theme of the webview.
  #[napi]
  pub fn with_theme(&mut self, theme: WryTheme) -> Result<&Self> {
    self.attributes.theme = Some(theme);
    Ok(self)
  }

  /// Sets the user agent of the webview.
  #[napi]
  pub fn with_user_agent(&mut self, user_agent: String) -> Result<&Self> {
    self.attributes.user_agent = Some(user_agent);
    Ok(self)
  }

  /// Adds an initialization script to run when creating the webview.
  #[napi]
  pub fn with_initialization_script(&mut self, script: InitializationScript) -> Result<&Self> {
    self.attributes.initialization_scripts.push(script);
    Ok(self)
  }

  /// Sets whether to enable drag drop.
  #[napi]
  pub fn with_drag_drop(&mut self, drag_drop: bool) -> Result<&Self> {
    self.attributes.drag_drop = drag_drop;
    Ok(self)
  }

  /// Sets the background color of the webview.
  #[napi]
  pub fn with_background_color(&mut self, color: Buffer) -> Result<&Self> {
    self.attributes.background_color = Some(color);
    Ok(self)
  }

  /// Sets whether to enable devtools.
  #[napi]
  pub fn with_devtools(&mut self, devtools: bool) -> Result<&Self> {
    self.attributes.devtools = devtools;
    Ok(self)
  }

  /// Sets whether to enable incognito mode.
  #[napi]
  pub fn with_incognito(&mut self, incognito: bool) -> Result<&Self> {
    self.attributes.incognito = incognito;
    Ok(self)
  }

  /// Sets whether to enable zoom hotkeys.
  #[napi]
  pub fn with_hotkeys_zoom(&mut self, hotkeys_zoom: bool) -> Result<&Self> {
    self.attributes.hotkeys_zoom = hotkeys_zoom;
    Ok(self)
  }

  /// Sets whether to enable clipboard access.
  #[napi]
  pub fn with_clipboard(&mut self, clipboard: bool) -> Result<&Self> {
    self.attributes.clipboard = clipboard;
    Ok(self)
  }

  /// Sets whether to enable autoplay.
  #[napi]
  pub fn with_autoplay(&mut self, autoplay: bool) -> Result<&Self> {
    self.attributes.autoplay = autoplay;
    Ok(self)
  }

  /// Sets whether to enable back/forward navigation gestures.
  #[napi]
  pub fn with_back_forward_navigation_gestures(
    &mut self,
    back_forward_navigation_gestures: bool,
  ) -> Result<&Self> {
    self.attributes.back_forward_navigation_gestures = back_forward_navigation_gestures;
    Ok(self)
  }

  /// Sets the IPC handler for the webview.
  #[napi(ts_args_type = "callback: (error: Error | null, message: string) => void")]
  pub fn with_ipc_handler(&mut self, callback: IpcHandler) -> Result<&Self> {
    self.ipc_handler = Some(callback);
    Ok(self)
  }

  /// Adds multiple IPC handlers for the webview.
  #[napi]
  pub fn with_ipc_handlers(&mut self, handlers: Vec<IpcHandler>) -> Result<&Self> {
    self.ipc_handlers.extend(handlers);
    Ok(self)
  }

  /// Builds the webview on an existing window.
  #[napi]
  pub fn build_on_window(
    &mut self,
    window: &crate::tao::structs::Window,
    label: String,
    ipc_listeners_override: Option<Arc<Mutex<Vec<IpcHandler>>>>,
  ) -> Result<WebView> {
    let window_lock = window.inner.as_ref().ok_or_else(|| {
      napi::Error::new(
        napi::Status::GenericFailure,
        "Window not initialized".to_string(),
      )
    })?;
    let window_inner = window_lock.lock().unwrap();

    let mut webview_builder = wry::WebViewBuilder::new();

    webview_builder = webview_builder.with_transparent(self.attributes.transparent);

    if let Some(bg_color) = &self.attributes.background_color {
      if bg_color.len() >= 4 {
        webview_builder = webview_builder.with_background_color((
          bg_color[0],
          bg_color[1],
          bg_color[2],
          bg_color[3],
        ));
      }
    } else if self.attributes.transparent {
      // Explicitly transparent background if transparent is requested and no color provided
      webview_builder = webview_builder.with_background_color((0, 0, 0, 0));
    }

    // Set bounds if provided
    webview_builder = webview_builder.with_bounds(wry::Rect {
      position: tao::dpi::LogicalPosition::new(self.attributes.x as f64, self.attributes.y as f64)
        .into(),
      size: tao::dpi::LogicalSize::new(self.attributes.width as f64, self.attributes.height as f64)
        .into(),
    });

    // Set URL or HTML
    if let Some(url) = &self.attributes.url {
      webview_builder = webview_builder.with_url(url);
    } else if let Some(html) = &self.attributes.html {
      webview_builder = webview_builder.with_html(html);
    }

    webview_builder = webview_builder.with_devtools(self.attributes.devtools);

    // Set other attributes
    webview_builder = webview_builder.with_hotkeys_zoom(self.attributes.hotkeys_zoom);
    #[cfg(any(
      target_os = "windows",
      target_os = "macos",
      target_os = "ios",
      target_os = "android"
    ))]
    {
      webview_builder = webview_builder.with_incognito(self.attributes.incognito);
    }
    webview_builder = webview_builder.with_autoplay(self.attributes.autoplay);
    webview_builder = webview_builder.with_clipboard(self.attributes.clipboard);
    webview_builder = webview_builder
      .with_back_forward_navigation_gestures(self.attributes.back_forward_navigation_gestures);

    // Apply initialization scripts
    for script in &self.attributes.initialization_scripts {
      webview_builder = webview_builder.with_initialization_script(&script.js);
    }

    // Build the webview
    #[cfg(any(
      target_os = "linux",
      target_os = "dragonfly",
      target_os = "freebsd",
      target_os = "netbsd",
      target_os = "openbsd"
    ))]
    {
      extern "C" {
        fn gtk_bin_get_child(bin: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
        fn gtk_container_remove(container: *mut std::ffi::c_void, widget: *mut std::ffi::c_void);
        fn gtk_widget_show_all(widget: *mut std::ffi::c_void);
      }

      let window_ptr = window_inner.gtk_window();
      let window_ptr_raw = unsafe { *(window_ptr as *const _ as *const *mut std::ffi::c_void) };

      unsafe {
        let child = gtk_bin_get_child(window_ptr_raw);
        if !child.is_null() {
          gtk_container_remove(window_ptr_raw, child);
        }
      }

      // IPC Handler
      let (webview_builder_with_ipc, listeners) = setup_ipc_handler(
        self.ipc_handler.take(),
        self.ipc_handlers.drain(..).collect(),
        webview_builder,
        ipc_listeners_override,
      );
      let ipc_listeners = listeners;
      webview_builder = webview_builder_with_ipc;

      let webview = webview_builder.build_gtk(window_ptr).map_err(|e| {
        napi::Error::new(
          napi::Status::GenericFailure,
          format!("Failed to create webview: {}", e),
        )
      })?;

      unsafe {
        gtk_widget_show_all(window_ptr_raw);
      }

      #[allow(clippy::arc_with_non_send_sync)]
      let webview_inner = Arc::new(Mutex::new(webview));
      Ok(WebView {
        inner: Some(webview_inner),
        label,
        ipc_listeners,
      })
    }

    #[cfg(not(any(
      target_os = "linux",
      target_os = "dragonfly",
      target_os = "freebsd",
      target_os = "netbsd",
      target_os = "openbsd"
    )))]
    {
      // IPC Handler
      let (webview_builder_with_ipc, listeners) = setup_ipc_handler(
        self.ipc_handler.take(),
        self.ipc_handlers.drain(..).collect(),
        webview_builder,
        ipc_listeners_override,
      );
      let ipc_listeners = listeners;
      webview_builder = webview_builder_with_ipc;

      let webview = webview_builder.build(&*window_inner).map_err(|e| {
        napi::Error::new(
          napi::Status::GenericFailure,
          format!("Failed to create webview: {}", e),
        )
      })?;
      #[allow(clippy::arc_with_non_send_sync)]
      let webview_inner = Arc::new(Mutex::new(webview));
      Ok(WebView {
        inner: Some(webview_inner),
        label,
        ipc_listeners,
      })
    }
  }

  /// Builds the webview.
  #[napi]
  pub fn build(
    &mut self,
    event_loop: &EventLoop,
    label: String,
    ipc_listeners_override: Option<Arc<Mutex<Vec<IpcHandler>>>>,
  ) -> Result<WebView> {
    // Get the event loop reference
    let el = event_loop.inner.as_ref().ok_or_else(|| {
      napi::Error::new(
        napi::Status::GenericFailure,
        "Event loop already running or consumed".to_string(),
      )
    })?;
    let mut window_builder = tao::window::WindowBuilder::new()
      .with_title(self.attributes.title.as_deref().unwrap_or("WebView"))
      .with_inner_size(tao::dpi::LogicalSize::new(
        self.attributes.width,
        self.attributes.height,
      ))
      .with_resizable(self.attributes.resizable)
      .with_decorations(self.attributes.decorations)
      .with_always_on_top(self.attributes.always_on_top)
      .with_visible(self.attributes.visible)
      .with_transparent(self.attributes.transparent)
      .with_maximized(self.attributes.maximized)
      .with_focused(self.attributes.focused);

    // Set position if provided
    if self.attributes.x != 0 || self.attributes.y != 0 {
      window_builder = window_builder.with_position(tao::dpi::LogicalPosition::new(
        self.attributes.x,
        self.attributes.y,
      ));
    }

    // Build the window
    let window = window_builder.build(el).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create window: {}", e),
      )
    })?;

    // Create webview builder
    let mut webview_builder = wry::WebViewBuilder::new();

    // Set transparency and background color
    webview_builder = webview_builder.with_transparent(self.attributes.transparent);

    if let Some(bg_color) = &self.attributes.background_color {
      if bg_color.len() >= 4 {
        webview_builder = webview_builder.with_background_color((
          bg_color[0],
          bg_color[1],
          bg_color[2],
          bg_color[3],
        ));
      }
    } else if self.attributes.transparent {
      // Explicitly transparent background if transparent is requested and no color provided
      webview_builder = webview_builder.with_background_color((0, 0, 0, 0));
    }

    // Set bounds
    webview_builder = webview_builder.with_bounds(wry::Rect {
      position: tao::dpi::LogicalPosition::new(self.attributes.x as f64, self.attributes.y as f64)
        .into(),
      size: tao::dpi::LogicalSize::new(self.attributes.width as f64, self.attributes.height as f64)
        .into(),
    });

    // Set URL or HTML
    if let Some(url) = &self.attributes.url {
      webview_builder = webview_builder.with_url(url);
    } else if let Some(html) = &self.attributes.html {
      webview_builder = webview_builder.with_html(html);
    }

    webview_builder = webview_builder.with_devtools(self.attributes.devtools);

    // Set other attributes
    webview_builder = webview_builder.with_hotkeys_zoom(self.attributes.hotkeys_zoom);
    #[cfg(any(
      target_os = "windows",
      target_os = "macos",
      target_os = "ios",
      target_os = "android"
    ))]
    {
      webview_builder = webview_builder.with_incognito(self.attributes.incognito);
    }
    webview_builder = webview_builder.with_autoplay(self.attributes.autoplay);
    webview_builder = webview_builder.with_clipboard(self.attributes.clipboard);
    webview_builder = webview_builder
      .with_back_forward_navigation_gestures(self.attributes.back_forward_navigation_gestures);

    // Apply initialization scripts
    for script in &self.attributes.initialization_scripts {
      webview_builder = webview_builder.with_initialization_script(&script.js);
    }

    // Build the webview
    #[cfg(any(
      target_os = "linux",
      target_os = "dragonfly",
      target_os = "freebsd",
      target_os = "netbsd",
      target_os = "openbsd"
    ))]
    {
      extern "C" {
        fn gtk_bin_get_child(bin: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
        fn gtk_container_remove(container: *mut std::ffi::c_void, widget: *mut std::ffi::c_void);
        fn gtk_widget_show_all(widget: *mut std::ffi::c_void);
      }

      let window_ptr = window.gtk_window();
      let window_ptr_raw = unsafe { *(window_ptr as *const _ as *const *mut std::ffi::c_void) };

      unsafe {
        let child = gtk_bin_get_child(window_ptr_raw);
        if !child.is_null() {
          gtk_container_remove(window_ptr_raw, child);
        }
      }

      // IPC Handler
      let (webview_builder_with_ipc, listeners) = setup_ipc_handler(
        self.ipc_handler.take(),
        self.ipc_handlers.drain(..).collect(),
        webview_builder,
        ipc_listeners_override,
      );
      let ipc_listeners = listeners;
      webview_builder = webview_builder_with_ipc;

      let webview = webview_builder.build_gtk(window_ptr).map_err(|e| {
        napi::Error::new(
          napi::Status::GenericFailure,
          format!("Failed to create webview: {}", e),
        )
      })?;

      unsafe {
        gtk_widget_show_all(window_ptr_raw);
      }

      #[allow(clippy::arc_with_non_send_sync)]
      let webview_inner = Arc::new(Mutex::new(webview));
      Ok(WebView {
        inner: Some(webview_inner),
        label,
        ipc_listeners,
      })
    }

    #[cfg(not(any(
      target_os = "linux",
      target_os = "dragonfly",
      target_os = "freebsd",
      target_os = "netbsd",
      target_os = "openbsd"
    )))]
    {
      // IPC Handler
      let (webview_builder_with_ipc, listeners) = setup_ipc_handler(
        self.ipc_handler.take(),
        self.ipc_handlers.drain(..).collect(),
        webview_builder,
        ipc_listeners_override,
      );
      let ipc_listeners = listeners;
      webview_builder = webview_builder_with_ipc;

      let webview = webview_builder.build(&window).map_err(|e| {
        napi::Error::new(
          napi::Status::GenericFailure,
          format!("Failed to create webview: {}", e),
        )
      })?;
      #[allow(clippy::arc_with_non_send_sync)]
      let webview_inner = Arc::new(Mutex::new(webview));
      Ok(WebView {
        inner: Some(webview_inner),
        label,
        ipc_listeners,
      })
    }
  }
}

/// The main webview struct.
#[napi]
pub struct WebView {
  #[allow(clippy::arc_with_non_send_sync)]
  pub(crate) inner: Option<Arc<Mutex<wry::WebView>>>,
  label: String,
  pub(crate) ipc_listeners: Arc<Mutex<Vec<IpcHandler>>>,
}

#[napi]
impl WebView {
  /// Gets the native ID of the webview.
  #[napi(getter)]
  pub fn id(&self) -> Result<String> {
    Ok(self.label.clone())
  }

  /// Gets the label of the webview.
  #[napi(getter)]
  pub fn label(&self) -> Result<String> {
    Ok(self.label.clone())
  }

  /// Evaluates JavaScript code in the webview.
  #[napi]
  pub fn evaluate_script(&self, js: String) -> Result<()> {
    if let Some(inner) = &self.inner {
      let _ = inner.lock().unwrap().evaluate_script(&js);
    }
    Ok(())
  }

  /// Opens the developer tools.
  #[napi]
  pub fn open_devtools(&self) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().open_devtools();
    }
    Ok(())
  }

  /// Closes the developer tools.
  #[napi]
  pub fn close_devtools(&self) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().close_devtools();
    }
    Ok(())
  }

  /// Checks if the developer tools are open.
  #[napi]
  pub fn is_devtools_open(&self) -> Result<bool> {
    if let Some(inner) = &self.inner {
      Ok(inner.lock().unwrap().is_devtools_open())
    } else {
      Ok(false)
    }
  }

  /// Reloads the current page.
  #[napi]
  pub fn reload(&self) -> Result<()> {
    if let Some(inner) = &self.inner {
      let _ = inner.lock().unwrap().reload();
    }
    Ok(())
  }

  /// Prints the current page.
  #[napi]
  pub fn print(&self) -> Result<()> {
    if let Some(inner) = &self.inner {
      let _ = inner.lock().unwrap().print();
    }
    Ok(())
  }

  /// Loads a new URL in the webview.
  #[napi]
  pub fn load_url(&self, url: String) -> Result<()> {
    if let Some(inner) = &self.inner {
      let _ = inner.lock().unwrap().load_url(&url);
    }
    Ok(())
  }

  /// Loads HTML content in the webview.
  #[napi]
  pub fn load_html(&self, html: String) -> Result<()> {
    if let Some(inner) = &self.inner {
      let _ = inner.lock().unwrap().load_html(&html);
    }
    Ok(())
  }

  /// Registers a callback for IPC messages.
  #[napi(ts_args_type = "callback: (error: Error | null, message: string) => void")]
  pub fn on(&self, callback: IpcHandler) -> Result<()> {
    self.ipc_listeners.lock().unwrap().push(callback);
    Ok(())
  }

  /// Sends a message to the webview.
  /// This calls window.__webview_on_message__(message) in JavaScript.
  #[napi]
  pub fn send(&self, message: String) -> Result<()> {
    let js = format!(
      "if (window.__webview_on_message__) window.__webview_on_message__({})",
      serde_json::to_string(&message).map_err(|e| napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to serialize message: {}", e)
      ))?
    );
    self.evaluate_script(js)
  }
}

fn setup_ipc_handler(
  builder_ipc_handler: Option<IpcHandler>,
  additional_handlers: Vec<IpcHandler>,
  webview_builder: wry::WebViewBuilder<'static>,
  ipc_listeners_override: Option<Arc<Mutex<Vec<IpcHandler>>>>,
) -> (wry::WebViewBuilder<'static>, Arc<Mutex<Vec<IpcHandler>>>) {
  let ipc_listeners = ipc_listeners_override.unwrap_or_else(|| Arc::new(Mutex::new(Vec::new())));
  if let Some(ipc_handler) = builder_ipc_handler {
    ipc_listeners.lock().unwrap().push(ipc_handler);
  }
  for handler in additional_handlers {
    ipc_listeners.lock().unwrap().push(handler);
  }

  let listeners_clone = ipc_listeners.clone();
  let webview_builder = webview_builder.with_ipc_handler(move |req| {
    let msg = req.into_body();

    // Check if we have any listeners registered
    let listener_count = {
      let listeners = listeners_clone.lock().unwrap();
      listeners.len()
    };

    if listener_count == 0 {
      return;
    }

    // Call each listener with the message using Blocking mode for immediate execution
    let listeners = listeners_clone.lock().unwrap();
    for (idx, listener) in listeners.iter().enumerate() {
      let status = listener.call(Ok(msg.clone()), ThreadsafeFunctionCallMode::NonBlocking);
      println!("Listener #{} call returned status: {:?}", idx, status);
      //Ok(idx, status);
    }
  });

  (webview_builder, ipc_listeners)
}

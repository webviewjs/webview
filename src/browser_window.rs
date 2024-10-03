use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode},
  Either, Result,
};
use napi_derive::*;
use tao::{
  dpi::{LogicalPosition, LogicalSize, PhysicalSize},
  event_loop::EventLoop,
  window::{Fullscreen, Icon, ProgressBarState, Window, WindowBuilder},
};
use wry::{http::Request, Rect, WebView, WebViewBuilder};

// #[cfg(target_os = "windows")]
// use tao::platform::windows::IconExtWindows;

#[napi]
pub enum FullscreenType {
  /// Exclusive fullscreen.
  Exclusive,
  /// Borderless fullscreen.
  Borderless,
}

#[napi(object)]
pub struct Dimensions {
  /// The width of the size.
  pub width: u32,
  /// The height of the size.
  pub height: u32,
}

#[napi(object)]
pub struct Position {
  /// The x position.
  pub x: i32,
  /// The y position.
  pub y: i32,
}

#[napi(object, js_name = "VideoMode")]
pub struct JsVideoMode {
  /// The size of the video mode.
  pub size: Dimensions,
  /// The bit depth of the video mode.
  pub bit_depth: u16,
  /// The refresh rate of the video mode.
  pub refresh_rate: u16,
}

#[napi(object)]
pub struct Monitor {
  /// The name of the monitor.
  pub name: Option<String>,
  /// The scale factor of the monitor.
  pub scale_factor: f64,
  /// The size of the monitor.
  pub size: Dimensions,
  /// The position of the monitor.
  pub position: Position,
  /// The video modes of the monitor.
  pub video_modes: Vec<JsVideoMode>,
}

#[napi]
pub enum JsProgressBarState {
  None,
  Normal,
  /// Treated as normal in linux and macos
  Indeterminate,
  /// Treated as normal in linux
  Paused,
  /// Treated as normal in linux
  Error,
}

#[napi(object)]
pub struct JsProgressBar {
  /// The progress state.
  pub state: Option<JsProgressBarState>,
  /// The progress value.
  pub progress: Option<u32>,
}

#[napi(js_name = "Theme")]
/// Represents the theme of the window.
pub enum JsTheme {
  /// The light theme.
  Light,
  /// The dark theme.
  Dark,
  /// The system theme.
  System,
}

#[napi(object)]
pub struct BrowserWindowOptions {
  /// The URL to load.
  pub url: Option<String>,
  /// The HTML content to load.
  pub html: Option<String>,
  /// The width of the window.
  pub width: Option<f64>,
  /// The height of the window.
  pub height: Option<f64>,
  /// The x position of the window.
  pub x: Option<f64>,
  /// The y position of the window.
  pub y: Option<f64>,
  /// Whether to enable devtools. Default is `true`.
  pub enable_devtools: Option<bool>,
  /// Whether the window is resizable. Default is `true`.
  pub resizable: Option<bool>,
  /// Whether the window is incognito. Default is `false`.
  pub incognito: Option<bool>,
  /// Whether the window is transparent. Default is `false`.
  pub transparent: Option<bool>,
  /// The window title.
  pub title: Option<String>,
  /// The default user agent.
  pub user_agent: Option<String>,
  /// The default theme.
  pub theme: Option<JsTheme>,
  /// The preload script
  pub preload: Option<String>,
  /// Whether the window is zoomable via hotkeys or gestures.
  pub hotkeys_zoom: Option<bool>,
  /// Whether the clipboard access is enabled.
  pub clipboard: Option<bool>,
  /// Whether the autoplay policy is enabled.
  pub autoplay: Option<bool>,
  /// Indicates whether horizontal swipe gestures trigger backward and forward page navigation.
  pub back_forward_navigation_gestures: Option<bool>,
}

#[napi]
pub struct BrowserWindow {
  id: u32,
  window: Window,
  webview: WebView,
}

#[napi]
impl BrowserWindow {
  pub fn new(
    event_loop: &EventLoop<()>,
    options: Option<BrowserWindowOptions>,
    id: u32,
    child: bool,
    ipc_handler: impl Fn(Request<String>) + 'static,
  ) -> Result<Self> {
    let options = options.unwrap_or(BrowserWindowOptions {
      url: None,
      html: None,
      width: None,
      height: None,
      x: None,
      y: None,
      enable_devtools: None,
      resizable: None,
      incognito: None,
      transparent: None,
      title: Some("WebviewJS".to_string()),
      user_agent: None,
      theme: None,
      preload: None,
      autoplay: None,
      back_forward_navigation_gestures: None,
      clipboard: None,
      hotkeys_zoom: None,
    });

    let mut window = WindowBuilder::new().with_resizable(options.resizable.unwrap_or(true));

    if let Some(title) = options.title {
      window = window.with_title(&title);
    }

    let window = window.build(event_loop).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create window: {}", e),
      )
    })?;

    let mut webview = if child {
      WebViewBuilder::new_as_child(&window)
    } else {
      WebViewBuilder::new(&window)
    };

    webview = webview
      .with_devtools(options.enable_devtools.unwrap_or(true))
      .with_bounds(Rect {
        position: LogicalPosition::new(options.x.unwrap_or(0.0), options.y.unwrap_or(0.0)).into(),
        size: LogicalSize::new(
          options.width.unwrap_or(800.0),
          options.height.unwrap_or(600.0),
        )
        .into(),
      })
      .with_incognito(options.incognito.unwrap_or(false));

    if let Some(preload) = options.preload {
      webview = webview.with_initialization_script(&preload);
    }

    if let Some(transparent) = options.transparent {
      webview = webview.with_transparent(transparent);
    }

    if let Some(autoplay) = options.autoplay {
      webview = webview.with_autoplay(autoplay);
    }

    if let Some(clipboard) = options.clipboard {
      webview = webview.with_clipboard(clipboard);
    }

    if let Some(back_forward_navigation_gestures) = options.back_forward_navigation_gestures {
      webview = webview.with_back_forward_navigation_gestures(back_forward_navigation_gestures);
    }

    if let Some(hotkeys_zoom) = options.hotkeys_zoom {
      webview = webview.with_hotkeys_zoom(hotkeys_zoom);
    }

    #[cfg(target_os = "windows")]
    {
      use wry::WebViewBuilderExtWindows;

      if let Some(theme) = options.theme {
        let theme = match theme {
          JsTheme::Light => wry::Theme::Light,
          JsTheme::Dark => wry::Theme::Dark,
          _ => wry::Theme::Auto,
        };

        webview = webview.with_theme(theme)
      }
    }

    if let Some(user_agent) = options.user_agent {
      webview = webview.with_user_agent(&user_agent);
    }

    if let Some(html) = options.html {
      webview = webview.with_html(&html);
    }

    if let Some(url) = options.url {
      webview = webview.with_url(&url);
    }

    webview = webview.with_ipc_handler(ipc_handler);

    let webview = webview.build().map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create webview: {}", e),
      )
    })?;

    Ok(Self {
      window,
      webview,
      id,
    })
  }

  #[napi]
  /// The unique identifier of this window.
  pub fn id(&self) -> u32 {
    self.id
  }

  #[napi]
  /// Launch a print modal for this window's contents.
  pub fn print(&self) -> Result<()> {
    self.webview.print().map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to print: {}", e),
      )
    })
  }

  #[napi]
  /// Set webview zoom level.
  pub fn zoom(&self, scale_facotr: f64) -> Result<()> {
    self.webview.zoom(scale_facotr).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to zoom: {}", e),
      )
    })
  }

  #[napi]
  /// Hides or shows the webview.
  pub fn set_webview_visibility(&self, visible: bool) -> Result<()> {
    self.webview.set_visible(visible).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to set webview visibility: {}", e),
      )
    })
  }

  #[napi]
  /// Whether the devtools is opened.
  pub fn is_devtools_open(&self) -> bool {
    self.webview.is_devtools_open()
  }

  #[napi]
  /// Opens the devtools.
  pub fn open_devtools(&self) {
    self.webview.open_devtools();
  }

  #[napi]
  /// Closes the devtools.
  pub fn close_devtools(&self) {
    self.webview.close_devtools();
  }

  #[napi]
  /// Whether the window is focused.
  pub fn is_focused(&self) -> bool {
    self.window.is_focused()
  }

  #[napi]
  /// Whether the window is visible.
  pub fn is_visible(&self) -> bool {
    self.window.is_visible()
  }

  #[napi]
  /// Whether the window is decorated.
  pub fn is_decorated(&self) -> bool {
    self.window.is_decorated()
  }

  #[napi]
  /// Whether the window is closable.
  pub fn is_closable(&self) -> bool {
    self.window.is_closable()
  }

  #[napi]
  /// Whether the window is maximizable.
  pub fn is_maximizable(&self) -> bool {
    self.window.is_maximizable()
  }

  #[napi]
  /// Whether the window is minimizable.
  pub fn is_minimizable(&self) -> bool {
    self.window.is_minimizable()
  }

  #[napi]
  /// Whether the window is maximized.
  pub fn is_maximized(&self) -> bool {
    self.window.is_maximized()
  }

  #[napi]
  /// Whether the window is minimized.
  pub fn is_minimized(&self) -> bool {
    self.window.is_minimized()
  }

  #[napi]
  /// Whether the window is resizable.
  pub fn is_resizable(&self) -> bool {
    self.window.is_resizable()
  }

  #[napi]
  /// Loads the given URL.
  pub fn load_url(&self, url: String) -> Result<()> {
    self.webview.load_url(&url).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to load URL: {}", e),
      )
    })
  }

  #[napi]
  /// Loads the given HTML content.
  pub fn load_html(&self, html: String) -> Result<()> {
    self.webview.load_html(&html).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to load HTML: {}", e),
      )
    })
  }

  #[napi]
  /// Sets the window title.
  pub fn set_title(&self, title: String) {
    self.window.set_title(&title);
  }

  #[napi(getter)]
  /// Sets the window title.
  pub fn get_title(&self) -> String {
    self.window.title()
  }

  #[napi]
  /// Sets closable.
  pub fn set_closable(&self, closable: bool) {
    self.window.set_closable(closable);
  }

  #[napi]
  /// Sets maximizable.
  pub fn set_maximizable(&self, maximizable: bool) {
    self.window.set_maximizable(maximizable);
  }

  #[napi]
  /// Sets minimizable.
  pub fn set_minimizable(&self, minimizable: bool) {
    self.window.set_minimizable(minimizable);
  }

  #[napi]
  /// Sets resizable.
  pub fn set_resizable(&self, resizable: bool) {
    self.window.set_resizable(resizable);
  }

  #[napi(getter)]
  /// Gets the window theme.
  pub fn get_theme(&self) -> JsTheme {
    match self.window.theme() {
      tao::window::Theme::Light => JsTheme::Light,
      tao::window::Theme::Dark => JsTheme::Dark,
      _ => JsTheme::System,
    }
  }

  #[napi]
  /// Sets the window theme.
  pub fn set_theme(&self, theme: JsTheme) {
    let theme = match theme {
      JsTheme::Light => Some(tao::window::Theme::Light),
      JsTheme::Dark => Some(tao::window::Theme::Dark),
      _ => None,
    };

    self.window.set_theme(theme);
  }

  #[napi]
  /// Evaluates the given JavaScript code.
  pub fn evaluate_script(&self, js: String) -> Result<()> {
    self
      .webview
      .evaluate_script(&js)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("{}", e)))
  }

  #[napi]
  /// Evaluates the given JavaScript code with a callback.
  pub fn evaluate_script_with_callback(&self, js: String, callback: JsFunction) -> Result<()> {
    let tsfn: ThreadsafeFunction<String, ErrorStrategy::CalleeHandled> = callback
      .create_threadsafe_function(
        0,
        |ctx: napi::threadsafe_function::ThreadSafeCallContext<String>| {
          ctx
            .env
            .create_string(&ctx.value.to_string())
            .map(|v| vec![v])
        },
      )
      .map_err(|e| {
        napi::Error::new(
          napi::Status::GenericFailure,
          format!("Failed to create threadsafe function: {}", e),
        )
      })?;

    self
      .webview
      .evaluate_script_with_callback(&js, move |val| {
        tsfn.call(Ok(val), ThreadsafeFunctionCallMode::Blocking);
      })
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("{}", e)))
  }

  #[napi]
  /// Sets the window icon.
  pub fn set_window_icon(
    &self,
    icon: Either<Vec<u8>, String>,
    width: u32,
    height: u32,
  ) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
      use tao::platform::windows::IconExtWindows;

      let ico = match icon {
        Either::A(bytes) => Icon::from_rgba(bytes, width, height),
        Either::B(path) => Icon::from_path(&path, PhysicalSize::new(width, height).into()),
      };

      let parsed = ico.map_err(|e| {
        napi::Error::new(
          napi::Status::GenericFailure,
          format!("Failed to set window icon: {}", e),
        )
      })?;

      self.window.set_window_icon(Some(parsed));
    }

    Ok(())
  }

  #[napi]
  /// Removes the window icon.
  pub fn remove_window_icon(&self) {
    self.window.set_window_icon(None);
  }

  #[napi]
  /// Modifies the window's visibility.
  /// If `false`, this will hide all the window. If `true`, this will show the window.
  pub fn set_visible(&self, visible: bool) {
    self.window.set_visible(visible);
  }

  #[napi]
  /// Modifies the window's progress bar.
  pub fn set_progress_bar(&self, state: JsProgressBar) {
    let progress_state = match state.state {
      Some(JsProgressBarState::Normal) => Some(tao::window::ProgressState::Normal),
      Some(JsProgressBarState::Indeterminate) => Some(tao::window::ProgressState::Indeterminate),
      Some(JsProgressBarState::Paused) => Some(tao::window::ProgressState::Paused),
      Some(JsProgressBarState::Error) => Some(tao::window::ProgressState::Error),
      _ => None,
    };

    let progress_value = match state.progress {
      Some(value) => Some(value as u64),
      _ => None,
    };

    let progress = ProgressBarState {
      progress: progress_value,
      state: progress_state,
      desktop_filename: None,
    };

    self.window.set_progress_bar(progress);
  }

  #[napi]
  /// Maximizes the window.
  pub fn set_maximized(&self, value: bool) {
    self.window.set_maximized(value);
  }

  #[napi]
  /// Minimizes the window.
  pub fn set_minimized(&self, value: bool) {
    self.window.set_minimized(value);
  }

  #[napi]
  /// Bring the window to front and focus.
  pub fn focus(&self) {
    self.window.set_focus();
  }

  #[napi]
  /// Get available monitors.
  pub fn get_available_monitors(&self) -> Vec<Monitor> {
    self
      .window
      .available_monitors()
      .map(|m| Monitor {
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
      })
      .collect()
  }

  #[napi]
  /// Get the current monitor.
  pub fn get_current_monitor(&self) -> Option<Monitor> {
    match self.window.current_monitor() {
      Some(monitor) => Some(Monitor {
        name: monitor.name(),
        scale_factor: monitor.scale_factor(),
        size: Dimensions {
          width: monitor.size().width,
          height: monitor.size().height,
        },
        position: Position {
          x: monitor.position().x,
          y: monitor.position().y,
        },
        video_modes: monitor
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
      }),
      _ => None,
    }
  }

  #[napi]
  /// Get the primary monitor.
  pub fn get_primary_monitor(&self) -> Option<Monitor> {
    match self.window.primary_monitor() {
      Some(monitor) => Some(Monitor {
        name: monitor.name(),
        scale_factor: monitor.scale_factor(),
        size: Dimensions {
          width: monitor.size().width,
          height: monitor.size().height,
        },
        position: Position {
          x: monitor.position().x,
          y: monitor.position().y,
        },
        video_modes: monitor
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
      }),
      _ => None,
    }
  }

  #[napi]
  /// Get the monitor from the given point.
  pub fn get_monitor_from_point(&self, x: f64, y: f64) -> Option<Monitor> {
    match self.window.monitor_from_point(x, y) {
      Some(monitor) => Some(Monitor {
        name: monitor.name(),
        scale_factor: monitor.scale_factor(),
        size: Dimensions {
          width: monitor.size().width,
          height: monitor.size().height,
        },
        position: Position {
          x: monitor.position().x,
          y: monitor.position().y,
        },
        video_modes: monitor
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
      }),
      _ => None,
    }
  }

  #[napi]
  /// Prevents the window contents from being captured by other apps.
  pub fn set_content_protection(&self, enabled: bool) {
    self.window.set_content_protection(enabled);
  }

  #[napi]
  /// Sets the window always on top.
  pub fn set_always_on_top(&self, enabled: bool) {
    self.window.set_always_on_top(enabled);
  }

  #[napi]
  /// Sets always on bottom.
  pub fn set_always_on_bottom(&self, enabled: bool) {
    self.window.set_always_on_bottom(enabled);
  }

  #[napi]
  /// Turn window decorations on or off.
  pub fn set_decorations(&self, enabled: bool) {
    self.window.set_decorations(enabled);
  }

  #[napi(getter)]
  /// Gets the window's current fullscreen state.
  pub fn get_fullscreen(&self) -> Option<FullscreenType> {
    match self.window.fullscreen() {
      None => None,
      Some(Fullscreen::Borderless(None)) => Some(FullscreenType::Borderless),
      _ => Some(FullscreenType::Exclusive),
    }
  }

  #[napi]
  /// Sets the window to fullscreen or back.
  pub fn set_fullscreen(&self, fullscreen_type: Option<FullscreenType>) {
    let monitor = self.window.current_monitor();

    if monitor.is_none() {
      return;
    };

    let video_mode = monitor.unwrap().video_modes().next();

    if video_mode.is_none() {
      return;
    };

    let fs = match fullscreen_type {
      Some(FullscreenType::Exclusive) => Some(Fullscreen::Exclusive(video_mode.unwrap())),
      Some(FullscreenType::Borderless) => Some(Fullscreen::Borderless(None)),
      _ => None,
    };

    self.window.set_fullscreen(fs);
  }
}

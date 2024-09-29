use napi::{Either, Result};
use napi_derive::*;
use tao::{
  dpi::{LogicalPosition, LogicalSize, PhysicalSize},
  event_loop::EventLoop,
  window::{Icon, ProgressBarState, Window, WindowBuilder},
};
use wry::{Rect, WebView, WebViewBuilder};

#[cfg(target_os = "windows")]
use tao::platform::windows::IconExtWindows;

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
}

#[napi]
pub struct BrowserWindow {
  window: Window,
  webview: WebView,
}

#[napi]
impl BrowserWindow {
  pub fn new(
    event_loop: &EventLoop<()>,
    options: Option<BrowserWindowOptions>,
    child: bool,
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

    if let Some(user_agent) = options.user_agent {
      webview = webview.with_user_agent(&user_agent);
    }

    if let Some(html) = options.html {
      webview = webview.with_html(&html);
    }

    if let Some(url) = options.url {
      webview = webview.with_url(&url);
    }

    let webview = webview.build().map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create webview: {}", e),
      )
    })?;

    Ok(Self { window, webview })
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

  //   #[napi]
  //   /// Evaluates the given JavaScript code with a callback.
  //   pub fn evaluate_script_with_callback<T: Fn(String) -> Result<()> + Send>(
  //     &self,
  //     js: String,
  //     cb: T,
  //   ) -> Result<()> {
  //     self
  //       .webview
  //       .evaluate_script_with_callback(&js, |val| {
  //         cb(val).unwrap_or(());
  //       })
  //       .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("{}", e)))
  //   }

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
}

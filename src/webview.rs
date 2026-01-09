use std::{cell::RefCell, rc::Rc};

use napi::{
  bindgen_prelude::FunctionRef,
  threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode},
  Env, Result,
};
use napi_derive::*;
use tao::dpi::{LogicalPosition, LogicalSize};
use wry::{http::Request, Rect, WebViewBuilder};

use crate::{HeaderData, IpcMessage};

/// Represents the theme of the window.
#[napi]
pub enum Theme {
  /// The light theme.
  Light,
  /// The dark theme.
  Dark,
  /// The system theme.
  System,
}

#[napi(object)]
pub struct WebviewOptions {
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
  /// Whether the window is incognito. Default is `false`.
  pub incognito: Option<bool>,
  /// The default user agent.
  pub user_agent: Option<String>,
  /// Whether the webview should be built as a child.
  pub child: Option<bool>,
  /// The preload script to inject.
  pub preload: Option<String>,
  /// Whether the window is transparent. Default is `false`.
  pub transparent: Option<bool>,
  /// The default theme.
  pub theme: Option<Theme>,
  /// Whether the window is zoomable via hotkeys or gestures.
  pub hotkeys_zoom: Option<bool>,
  /// Whether the clipboard access is enabled.
  pub clipboard: Option<bool>,
  /// Whether the autoplay policy is enabled.
  pub autoplay: Option<bool>,
  /// Indicates whether horizontal swipe gestures trigger backward and forward page navigation.
  pub back_forward_navigation_gestures: Option<bool>,
}

impl Default for WebviewOptions {
  fn default() -> Self {
    Self {
      url: None,
      html: None,
      width: None,
      height: None,
      x: None,
      y: None,
      enable_devtools: Some(true),
      incognito: Some(false),
      user_agent: Some("WebviewJS".to_owned()),
      child: Some(false),
      preload: None,
      transparent: Some(false),
      theme: None,
      hotkeys_zoom: Some(true),
      clipboard: Some(true),
      autoplay: Some(true),
      back_forward_navigation_gestures: Some(true),
    }
  }
}

#[napi(js_name = "Webview")]
pub struct JsWebview {
  /// The inner webview.
  webview_inner: wry::WebView,
  /// The ipc handler fn
  ipc_state: Rc<RefCell<Option<FunctionRef<IpcMessage, ()>>>>,
}

#[napi]
impl JsWebview {
  pub fn create(env: &Env, window: &tao::window::Window, options: WebviewOptions) -> Result<Self> {
    // let mut webview = if options.child.unwrap_or(false) {
    //   WebViewBuilder::new_as_child(window)
    // } else {
    //   WebViewBuilder::new(window)
    // };
    let mut webview = WebViewBuilder::new();

    if let Some(devtools) = options.enable_devtools {
      webview = webview.with_devtools(devtools);
    }

    webview = webview.with_bounds(Rect {
      position: LogicalPosition::new(options.x.unwrap_or(0.0), options.y.unwrap_or(0.0)).into(),
      size: LogicalSize::new(
        options.width.unwrap_or(800.0),
        options.height.unwrap_or(600.0),
      )
      .into(),
    });

    if let Some(incognito) = options.incognito {
      webview = webview.with_incognito(incognito);
    }

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
          Theme::Light => wry::Theme::Light,
          Theme::Dark => wry::Theme::Dark,
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

    let ipc_state = Rc::new(RefCell::new(None::<FunctionRef<IpcMessage, ()>>));
    let ipc_state_clone = ipc_state.clone();
    let env_copy = *env;

    let ipc_handler = move |req: Request<String>| {
      let borrowed = RefCell::borrow(&ipc_state_clone);
      if let Some(func) = borrowed.as_ref() {
        let on_ipc_msg = func.borrow_back(&env_copy);

        if on_ipc_msg.is_err() {
          return;
        }

        let on_ipc_msg = on_ipc_msg.unwrap();

        let body = req.body().as_bytes().to_vec().into();
        let headers = req
          .headers()
          .iter()
          .map(|(k, v)| HeaderData {
            key: k.as_str().to_string(),
            value: v.to_str().ok().map(|s| s.to_string()),
          })
          .collect::<Vec<_>>();

        let ipc_message = IpcMessage {
          body,
          headers,
          method: req.method().to_string(),
          uri: req.uri().to_string(),
        };

        let _ = on_ipc_msg.call(ipc_message);
      }
    };

    webview = webview.with_ipc_handler(ipc_handler);

    let handle_build_error = |e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create webview: {}", e),
      )
    };

    #[cfg(not(target_os = "linux"))]
    let webview = {
      if options.child.unwrap_or(false) {
        webview.build_as_child(&window).map_err(handle_build_error)
      } else {
        webview.build(&window).map_err(handle_build_error)
      }
    }?;

    #[cfg(target_os = "linux")]
    let webview = {
      if options.child.unwrap_or(false) {
        webview
          .build_as_child(&window)
          .map_err(handle_build_error)?
      } else {
        webview.build(&window).map_err(handle_build_error)?
      }
    };

    Ok(Self {
      webview_inner: webview,
      ipc_state,
    })
  }

  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Err(napi::Error::new(
      napi::Status::GenericFailure,
      "Webview constructor is not directly supported",
    ))
  }

  #[napi]
  /// Sets the IPC handler callback.
  pub fn on_ipc_message(&mut self, handler: Option<FunctionRef<IpcMessage, ()>>) {
    *self.ipc_state.borrow_mut() = handler;
  }

  #[napi]
  /// Launch a print modal for this window's contents.
  pub fn print(&self) -> Result<()> {
    self.webview_inner.print().map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to print: {}", e),
      )
    })
  }

  #[napi]
  /// Set webview zoom level.
  pub fn zoom(&self, scale_factor: f64) -> Result<()> {
    self.webview_inner.zoom(scale_factor).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to zoom: {}", e),
      )
    })
  }

  #[napi]
  /// Hides or shows the webview.
  pub fn set_webview_visibility(&self, visible: bool) -> Result<()> {
    self.webview_inner.set_visible(visible).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to set webview visibility: {}", e),
      )
    })
  }

  #[napi]
  /// Whether the devtools is opened.
  pub fn is_devtools_open(&self) -> bool {
    self.webview_inner.is_devtools_open()
  }

  #[napi]
  /// Opens the devtools.
  pub fn open_devtools(&self) {
    self.webview_inner.open_devtools();
  }

  #[napi]
  /// Closes the devtools.
  pub fn close_devtools(&self) {
    self.webview_inner.close_devtools();
  }

  #[napi]
  /// Loads the given URL.
  pub fn load_url(&self, url: String) -> Result<()> {
    self.webview_inner.load_url(&url).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to load URL: {}", e),
      )
    })
  }

  #[napi]
  /// Loads the given HTML content.
  pub fn load_html(&self, html: String) -> Result<()> {
    self.webview_inner.load_html(&html).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to load HTML: {}", e),
      )
    })
  }

  #[napi]
  /// Evaluates the given JavaScript code.
  pub fn evaluate_script(&self, js: String) -> Result<()> {
    self
      .webview_inner
      .evaluate_script(&js)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("{}", e)))
  }

  #[napi]
  pub fn evaluate_script_with_callback(
    &self,
    js: String,
    callback: ThreadsafeFunction<String>,
  ) -> Result<()> {
    self
      .webview_inner
      .evaluate_script_with_callback(&js, move |val| {
        callback.call(Ok(val), ThreadsafeFunctionCallMode::Blocking);
      })
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("{}", e)))
  }

  #[napi]
  /// Reloads the webview.
  pub fn reload(&self) -> Result<()> {
    self.webview_inner.reload().map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to reload: {}", e),
      )
    })
  }
}

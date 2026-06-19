use std::{cell::RefCell, rc::Rc};
// wry::WebView is not Send, so Rc (not Arc) is correct here — everything
// runs on the main thread.

use napi::{
  bindgen_prelude::FunctionRef,
  threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode},
  Env, Result,
};
use napi_derive::*;
use winit::window::Window;
use wry::{http::Request, Rect, WebViewBuilder};

use crate::{HeaderData, IpcMessage};

// ── Cookie types ─────────────────────────────────────────────────────────────

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

// ── Webview bounds ────────────────────────────────────────────────────────────

#[napi(object)]
pub struct WebviewBounds {
  pub x: f64,
  pub y: f64,
  pub width: f64,
  pub height: f64,
}

#[napi]
pub enum Theme {
  Light,
  Dark,
  System,
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
  // Rc is shared with the owning BrowserWindow so the WebView stays alive
  // even if JS garbage-collects this handle.
  pub(crate) webview_inner: Rc<wry::WebView>,
  ipc_state: Rc<RefCell<Option<FunctionRef<IpcMessage, ()>>>>,
}

#[napi]
impl JsWebview {
  pub fn create(env: &Env, window: &Window, options: WebviewOptions) -> Result<Self> {
    let mut webview = WebViewBuilder::new();

    if let Some(devtools) = options.enable_devtools {
      webview = webview.with_devtools(devtools);
    }

    // Only pin the webview to explicit bounds when the caller asked for it.
    // Leaving bounds unset lets wry fill the parent window and automatically
    // resize via its WM_SIZE subclass — this prevents the black-border artifact
    // when the window is maximised or resized.
    // Child webviews always need explicit bounds to position correctly inside
    // their parent.
    let is_child = options.child.unwrap_or(false);
    let has_bounds = is_child
      || options.x.is_some()
      || options.y.is_some()
      || options.width.is_some()
      || options.height.is_some();
    if has_bounds {
      webview = webview.with_bounds(Rect {
        position: dpi::LogicalPosition::new(options.x.unwrap_or(0.0), options.y.unwrap_or(0.0))
          .into(),
        size: dpi::LogicalSize::new(
          options.width.unwrap_or(800.0),
          options.height.unwrap_or(600.0),
        )
        .into(),
      });
    }

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

    if let Some(gestures) = options.back_forward_navigation_gestures {
      webview = webview.with_back_forward_navigation_gestures(gestures);
    }

    if let Some(zoom) = options.hotkeys_zoom {
      webview = webview.with_hotkeys_zoom(zoom);
    }

    #[cfg(target_os = "windows")]
    if let Some(theme) = options.theme {
      use wry::WebViewBuilderExtWindows;
      let t = match theme {
        Theme::Light => wry::Theme::Light,
        Theme::Dark => wry::Theme::Dark,
        _ => wry::Theme::Auto,
      };
      webview = webview.with_theme(t);
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
        let Ok(on_ipc_msg) = func.borrow_back(&env_copy) else { return };

        let body = req.body().as_bytes().to_vec().into();
        let headers = req
          .headers()
          .iter()
          .map(|(k, v)| HeaderData {
            key: k.as_str().to_string(),
            value: v.to_str().ok().map(|s| s.to_string()),
          })
          .collect::<Vec<_>>();

        let _ = on_ipc_msg.call(IpcMessage {
          body,
          headers,
          method: req.method().to_string(),
          uri: req.uri().to_string(),
        });
      }
    };

    webview = webview.with_ipc_handler(ipc_handler);

    let err = |e| napi::Error::new(napi::Status::GenericFailure, format!("Failed to create webview: {}", e));

    let built = if options.child.unwrap_or(false) {
      webview.build_as_child(window).map_err(err)
    } else {
      webview.build(window).map_err(err)
    }?;

    Ok(Self { webview_inner: Rc::new(built), ipc_state })
  }

  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Err(napi::Error::new(
      napi::Status::GenericFailure,
      "Webview constructor is not directly supported",
    ))
  }

  #[napi]
  pub fn on_ipc_message(&mut self, handler: Option<FunctionRef<IpcMessage, ()>>) {
    *self.ipc_state.borrow_mut() = handler;
  }

  #[napi]
  pub fn print(&self) -> Result<()> {
    self.webview_inner.print().map_err(|e| {
      napi::Error::new(napi::Status::GenericFailure, format!("Failed to print: {}", e))
    })
  }

  #[napi]
  pub fn zoom(&self, scale_factor: f64) -> Result<()> {
    self.webview_inner.zoom(scale_factor).map_err(|e| {
      napi::Error::new(napi::Status::GenericFailure, format!("Failed to zoom: {}", e))
    })
  }

  #[napi]
  pub fn set_webview_visibility(&self, visible: bool) -> Result<()> {
    self.webview_inner.set_visible(visible).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to set webview visibility: {}", e),
      )
    })
  }

  #[napi]
  pub fn is_devtools_open(&self) -> bool {
    self.webview_inner.is_devtools_open()
  }

  #[napi]
  pub fn open_devtools(&self) {
    self.webview_inner.open_devtools();
  }

  #[napi]
  pub fn close_devtools(&self) {
    self.webview_inner.close_devtools();
  }

  #[napi]
  pub fn load_url(&self, url: String) -> Result<()> {
    self.webview_inner.load_url(&url).map_err(|e| {
      napi::Error::new(napi::Status::GenericFailure, format!("Failed to load URL: {}", e))
    })
  }

  #[napi]
  pub fn load_html(&self, html: String) -> Result<()> {
    self.webview_inner.load_html(&html).map_err(|e| {
      napi::Error::new(napi::Status::GenericFailure, format!("Failed to load HTML: {}", e))
    })
  }

  #[napi]
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
  pub fn reload(&self) -> Result<()> {
    self.webview_inner.reload().map_err(|e| {
      napi::Error::new(napi::Status::GenericFailure, format!("Failed to reload: {}", e))
    })
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  /// Get the URL the webview is currently showing.
  #[napi]
  pub fn url(&self) -> Option<String> {
    self.webview_inner.url().ok()
  }

  /// Load `url` with additional HTTP request headers.
  #[napi]
  pub fn load_url_with_headers(&self, url: String, headers: Vec<HeaderData>) -> Result<()> {
    let mut map = wry::http::HeaderMap::new();
    for h in headers {
      if let (Ok(name), Some(val)) = (
        h.key.parse::<wry::http::header::HeaderName>(),
        h.value,
      ) {
        if let Ok(v) = val.parse::<wry::http::header::HeaderValue>() {
          map.insert(name, v);
        }
      }
    }
    self
      .webview_inner
      .load_url_with_headers(&url, map)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  // ── Cookies ──────────────────────────────────────────────────────────────────

  /// Return all cookies currently stored for `url`, or every cookie if `url`
  /// is `null` / `undefined`.
  #[napi]
  pub fn get_cookies(&self, url: Option<String>) -> Result<Vec<WebviewCookie>> {
    let raw = match url {
      Some(ref u) => self.webview_inner.cookies_for_url(u),
      None => self.webview_inner.cookies(),
    }
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))?;

    Ok(raw.into_iter().map(cookie_to_js).collect())
  }

  /// Store a cookie in the webview's session.
  #[napi]
  pub fn set_cookie(&self, cookie: WebviewCookie) -> Result<()> {
    let c = js_to_cookie(&cookie);
    self
      .webview_inner
      .set_cookie(&c)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  /// Delete a cookie by name.  `domain` and `path` narrow the match;
  /// omit them to delete across all domains/paths.
  #[napi]
  pub fn delete_cookie(
    &self,
    name: String,
    domain: Option<String>,
    path: Option<String>,
  ) -> Result<()> {
    let mut builder = wry::cookie::Cookie::build((name, String::new()));
    if let Some(d) = domain {
      builder = builder.domain(d);
    }
    if let Some(p) = path {
      builder = builder.path(p);
    }
    let c = builder.build();
    self
      .webview_inner
      .delete_cookie(&c)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  /// Erase all cookies, cache, local storage, and IndexedDB data.
  #[napi]
  pub fn clear_all_browsing_data(&self) -> Result<()> {
    self
      .webview_inner
      .clear_all_browsing_data()
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  // ── Appearance ───────────────────────────────────────────────────────────────

  /// Set the background colour shown before (or behind) page content.
  /// Values are 0-255.
  #[napi]
  pub fn set_background_color(&self, r: u8, g: u8, b: u8, a: u8) -> Result<()> {
    self
      .webview_inner
      .set_background_color((r, g, b, a))
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  // ── Bounds ───────────────────────────────────────────────────────────────────

  /// Return the webview's current bounds relative to the window, in logical
  /// pixels.
  #[napi]
  pub fn get_bounds(&self) -> Option<WebviewBounds> {
    self.webview_inner.bounds().ok().map(|r| {
      let pos = r.position.to_logical::<f64>(1.0);
      let size = r.size.to_logical::<f64>(1.0);
      WebviewBounds { x: pos.x, y: pos.y, width: size.width, height: size.height }
    })
  }

  /// Reposition and resize the webview within its window.
  #[napi]
  pub fn set_bounds(&self, bounds: WebviewBounds) -> Result<()> {
    let rect = Rect {
      position: dpi::LogicalPosition::new(bounds.x, bounds.y).into(),
      size: dpi::LogicalSize::new(bounds.width, bounds.height).into(),
    };
    self
      .webview_inner
      .set_bounds(rect)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  // ── Focus ─────────────────────────────────────────────────────────────────────

  /// Give keyboard focus to the webview content area.
  #[napi]
  pub fn focus(&self) -> Result<()> {
    self
      .webview_inner
      .focus()
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  /// Return focus to the parent/host window.
  #[napi]
  pub fn focus_parent(&self) -> Result<()> {
    self
      .webview_inner
      .focus_parent()
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

fn cookie_to_js(c: wry::cookie::Cookie<'static>) -> WebviewCookie {
  WebviewCookie {
    name: c.name().to_string(),
    value: c.value().to_string(),
    domain: c.domain().map(str::to_string),
    path: c.path().map(str::to_string),
    http_only: c.http_only(),
    secure: c.secure(),
    same_site: c.same_site().map(|ss| match ss {
      wry::cookie::SameSite::Strict => "strict".to_string(),
      wry::cookie::SameSite::Lax => "lax".to_string(),
      wry::cookie::SameSite::None => "none".to_string(),
    }),
  }
}

fn js_to_cookie(c: &WebviewCookie) -> wry::cookie::Cookie<'static> {
  let mut builder =
    wry::cookie::Cookie::build((c.name.clone(), c.value.clone()));
  if let Some(ref d) = c.domain {
    builder = builder.domain(d.clone());
  }
  if let Some(ref p) = c.path {
    builder = builder.path(p.clone());
  }
  if let Some(ho) = c.http_only {
    builder = builder.http_only(ho);
  }
  if let Some(sec) = c.secure {
    builder = builder.secure(sec);
  }
  if let Some(ref ss) = c.same_site {
    let same_site = match ss.to_lowercase().as_str() {
      "strict" => wry::cookie::SameSite::Strict,
      "none" => wry::cookie::SameSite::None,
      _ => wry::cookie::SameSite::Lax,
    };
    builder = builder.same_site(same_site);
  }
  builder.build()
}

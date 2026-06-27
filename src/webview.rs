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

use crate::browser_window::next_protocol_id;
use crate::types::*;

/// Internal type alias for async protocol pending-responder maps.
pub(crate) type ProtocolPendingMap =
  Rc<RefCell<std::collections::HashMap<u64, wry::RequestAsyncResponder>>>;
/// Internal type alias for async protocol JS handler.
pub(crate) type ProtocolHandlerRef = Rc<RefCell<Option<FunctionRef<String, ()>>>>;
/// Internal type alias for async protocol ID counter.
pub(crate) type ProtocolCounterRef = Rc<RefCell<u64>>;

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
      ipc_name: None,
    }
  }
}

#[napi(js_name = "Webview")]
pub struct JsWebview {
  // Rc is shared with the owning BrowserWindow so the WebView stays alive
  // even if JS garbage-collects this handle.
  pub(crate) webview_inner: Rc<wry::WebView>,
  ipc_state: Rc<RefCell<Option<FunctionRef<IpcMessage, ()>>>>,
  // expose() handlers: namespace → JS function that receives ExposeCallData.
  expose_handlers: Rc<RefCell<std::collections::HashMap<String, FunctionRef<ExposeCallData, ()>>>>,
}

#[napi]
impl JsWebview {
  pub fn create(
    env: &Env,
    window: &Window,
    options: WebviewOptions,
    // (scheme, js_handler_ref, pending_responders, id_counter)
    protocols: &[(
      String,
      ProtocolHandlerRef,
      ProtocolPendingMap,
      ProtocolCounterRef,
    )],
  ) -> Result<Self> {
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
    //
    // On macOS we always use build_as_child (adding as an NSView subview instead
    // of replacing the NSWindow's contentView).  wry's non-child path calls
    // setContentView which breaks winit's invariant that the content view is
    // always its own WinitView subclass, crashing on window focus change.
    // So on macOS a full-window webview also needs explicit bounds.
    let is_child = options.child.unwrap_or(false);
    let _ = is_child; // used on non-macOS paths below
    #[cfg(target_os = "macos")]
    let needs_bounds = true; // always set bounds on macOS (child path requires it)
    #[cfg(not(target_os = "macos"))]
    let needs_bounds = is_child
      || options.x.is_some()
      || options.y.is_some()
      || options.width.is_some()
      || options.height.is_some();

    if needs_bounds {
      // For full-window webviews on macOS derive the initial size from the window.
      #[cfg(target_os = "macos")]
      let (default_w, default_h) = {
        let s = window.inner_size();
        (s.width as f64, s.height as f64)
      };
      #[cfg(not(target_os = "macos"))]
      let (default_w, default_h) = (800.0_f64, 600.0_f64);

      webview = webview.with_bounds(Rect {
        position: dpi::LogicalPosition::new(options.x.unwrap_or(0.0), options.y.unwrap_or(0.0))
          .into(),
        size: dpi::PhysicalSize::new(
          options.width.map(|w| w as u32).unwrap_or(default_w as u32),
          options.height.map(|h| h as u32).unwrap_or(default_h as u32),
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

    // ── IPC name alias ────────────────────────────────────────────────────────
    // wry always exposes `window.ipc`; create an alias under a custom name.
    if let Some(ref ipc_name) = options.ipc_name {
      if ipc_name != "ipc" {
        let alias = format!(
          "Object.defineProperty(window,{n},{{get:()=>window.ipc,configurable:true,enumerable:true}});",
          n = serde_json::to_string(ipc_name).unwrap_or_else(|_| format!("\"{}\"", ipc_name))
        );
        webview = webview.with_initialization_script(&alias);
      }
    }

    // ── Custom protocols (async) ──────────────────────────────────────────────
    // wry's with_asynchronous_custom_protocol closure is NOT required to be
    // Send, so Rc<RefCell<>> is safe — everything runs on the main thread.
    let env_copy = *env;
    for (name, handler_ref, responders_rc, counter_rc) in protocols {
      let handler_rc = Rc::clone(handler_ref);
      let resp_rc = Rc::clone(responders_rc);
      let ctr_rc = Rc::clone(counter_rc);
      let env_c = env_copy;

      webview =
        webview.with_asynchronous_custom_protocol(name.clone(), move |_id, req, responder| {
          // Assign a unique ID for this request
          let id = next_protocol_id(&ctr_rc);
          resp_rc.borrow_mut().insert(id, responder);

          // Build JSON payload for the JS handler
          let headers_json = req
            .headers()
            .iter()
            .map(|(k, v)| serde_json::json!({ "key": k.as_str(), "value": v.to_str().ok() }))
            .collect::<Vec<_>>();

          let body_bytes = req.body();
          let body_value = if body_bytes.is_empty() {
            serde_json::Value::Null
          } else {
            serde_json::Value::Array(
              body_bytes
                .iter()
                .map(|&b| serde_json::Value::Number(b.into()))
                .collect(),
            )
          };

          let payload = serde_json::json!({
            "id":      id as f64,
            "url":     req.uri().to_string(),
            "method":  req.method().to_string(),
            "headers": headers_json,
            "body":    body_value,
          })
          .to_string();

          // Call the JS handler — safe because we're on the main thread
          let borrowed = handler_rc.borrow();
          let callback_result = borrowed
            .as_ref()
            .ok_or("Protocol handler is not registered")
            .and_then(|func_ref| {
              func_ref
                .borrow_back(&env_c)
                .map_err(|_| "Protocol handler is unavailable")
            })
            .and_then(|func| {
              func
                .call(payload)
                .map_err(|_| "Protocol handler invocation failed")
            });

          if let Err(message) = callback_result {
            if let Some(responder) = resp_rc.borrow_mut().remove(&id) {
              let response = wry::http::Response::builder()
                .status(500)
                .header("Content-Type", "text/plain")
                .body(std::borrow::Cow::Owned(message.as_bytes().to_vec()))
                .expect("static protocol fallback response is valid");
              responder.respond(response);
            }
          }
        });
    }

    // ── IPC (with expose routing) ─────────────────────────────────────────────
    let ipc_state = Rc::new(RefCell::new(None::<FunctionRef<IpcMessage, ()>>));
    let ipc_state_clone = ipc_state.clone();
    let expose_handlers: Rc<
      RefCell<std::collections::HashMap<String, FunctionRef<ExposeCallData, ()>>>,
    > = Rc::new(RefCell::new(std::collections::HashMap::new()));
    let expose_handlers_clone = Rc::clone(&expose_handlers);
    let env_copy = *env;

    let ipc_handler = move |req: Request<String>| {
      let body_str = req.body().as_str();

      // Check for expose() proxy calls before forwarding to user handler.
      // The page-side script always sets __e:true for these messages.
      if let Ok(v) = serde_json::from_str::<serde_json::Value>(body_str) {
        if v.get("__e").and_then(|x| x.as_bool()) == Some(true) {
          let ns = v
            .get("ns")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
          let method = v
            .get("method")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
          let id = v.get("id").and_then(|x| x.as_f64()).unwrap_or(0.0);
          let args_json = v
            .get("args")
            .map(|x| x.to_string())
            .unwrap_or_else(|| "[]".to_string());

          let borrowed = expose_handlers_clone.borrow();
          if let Some(func_ref) = borrowed.get(&ns) {
            if let Ok(func) = func_ref.borrow_back(&env_copy) {
              let _ = func.call(ExposeCallData {
                ns,
                method,
                id,
                args_json,
              });
            }
          }
          return; // consume — do not forward to user handler
        }
      }

      // User IPC handler
      let borrowed = RefCell::borrow(&ipc_state_clone);
      if let Some(func) = borrowed.as_ref() {
        let Ok(on_ipc_msg) = func.borrow_back(&env_copy) else {
          return;
        };

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

    let err = |e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create webview: {}", e),
      )
    };

    // On macOS we always use build_as_child so the webview becomes a subview of
    // winit's WinitView rather than replacing the NSWindow contentView.
    // See: https://github.com/tauri-apps/wry/blob/dev/examples/winit.rs
    #[cfg(target_os = "macos")]
    let built = webview.build_as_child(window).map_err(err)?;
    #[cfg(not(target_os = "macos"))]
    let built = if options.child.unwrap_or(false) {
      webview.build_as_child(window).map_err(err)
    } else {
      webview.build(window).map_err(err)
    }?;

    Ok(Self {
      webview_inner: Rc::new(built),
      ipc_state,
      expose_handlers,
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
  pub fn on_ipc_message(&mut self, handler: Option<FunctionRef<IpcMessage, ()>>) {
    *self.ipc_state.borrow_mut() = handler;
  }

  // ── expose() support ─────────────────────────────────────────────────────────

  /// Low-level method used by the JS `expose()` wrapper.
  ///
  /// Injects a page script that creates `window[name]` as an object with:
  /// - static values from `statics_json` (a JSON object string)
  /// - async function stubs for each name in `func_names`
  ///
  /// When the page calls one of the stubs the call is routed back here via
  /// the internal IPC channel and dispatched to `handler`.  `handler` is
  /// responsible for calling `evaluateScript` to send the response.
  #[napi(js_name = "_exposeInternal")]
  pub fn expose_internal(
    &mut self,
    name: String,
    statics_json: String,
    func_names: Vec<String>,
    handler: FunctionRef<ExposeCallData, ()>,
  ) -> Result<()> {
    // Register the handler so the IPC router can find it
    self
      .expose_handlers
      .borrow_mut()
      .insert(name.clone(), handler);

    // Generate the page-side bootstrap script.
    // We create window.__webviewjs__ once (idempotent) and then build the
    // namespace proxy for this specific `name`.
    let name_json = serde_json::to_string(&name)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))?;
    let funcs_json = serde_json::to_string(&func_names)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))?;

    let script = format!(
      r#"(function(){{
  if(!window.__webviewjs__){{
    let __id=0;
    const __p=new Map();
    window.__webviewjs__={{
      resolve:function(id,val){{const e=__p.get(id);if(e){{__p.delete(id);e[0](val);}}}},
      reject:function(id,message,name){{const e=__p.get(id);if(e){{__p.delete(id);const err=new Error(message);err.name=name||'Error';e[1](err);}}}},
      call:function(ns,method,args){{
        let argsJson;
        try{{argsJson=JSON.stringify(args);if(argsJson===undefined)throw new Error('not serialisable');}}
        catch{{const err=new Error('Arguments are not JSON-serialisable');err.name='SerializationError';return Promise.reject(err);}}
        return new Promise(function(res,rej){{
          const id=++__id;
          __p.set(id,[res,rej]);
          window.ipc.postMessage(JSON.stringify({{__e:true,ns:ns,method:method,id:id,args:JSON.parse(argsJson)}}));
        }});
      }}
    }};
  }}
  const __statics={statics};
  const __funcs={funcs};
  const __ns=Object.assign({{}},__statics);
  for(const fn of __funcs){{
    (function(m){{__ns[m]=function(){{return window.__webviewjs__.call({name},m,Array.from(arguments));}};}})(fn);
  }}
  window[{name}]=__ns;
}})();"#,
      statics = statics_json,
      funcs = funcs_json,
      name = name_json,
    );

    self
      .webview_inner
      .evaluate_script(&script)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  #[napi]
  pub fn print(&self) -> Result<()> {
    self.webview_inner.print().map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to print: {}", e),
      )
    })
  }

  #[napi]
  pub fn zoom(&self, scale_factor: f64) -> Result<()> {
    self.webview_inner.zoom(scale_factor).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to zoom: {}", e),
      )
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
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to load URL: {}", e),
      )
    })
  }

  #[napi]
  pub fn load_html(&self, html: String) -> Result<()> {
    self.webview_inner.load_html(&html).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to load HTML: {}", e),
      )
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
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to reload: {}", e),
      )
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
      if let (Ok(name), Some(val)) = (h.key.parse::<wry::http::header::HeaderName>(), h.value) {
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
      WebviewBounds {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
      }
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
  let mut builder = wry::cookie::Cookie::build((c.name.clone(), c.value.clone()));
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

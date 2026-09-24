use std::{
  cell::{Cell, Ref, RefCell},
  collections::HashMap,
  rc::Rc,
};
// wry::WebView is not Send, so Rc (not Arc) is correct here — everything
// runs on the main thread.

use napi::{
  bindgen_prelude::FunctionRef,
  threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode},
  Env, Result,
};
use napi_derive::*;
use std::sync::Arc;
use tao::window::Window;
use wry::{
  http::Request, NewWindowFeatures, NewWindowResponse, PageLoadEvent, Rect, WebViewBuilder,
};

use crate::browser_window::next_protocol_id;
use crate::types::*;
use crate::web_context::JsWebContext;

#[cfg(target_os = "linux")]
use tao::platform::unix::WindowExtUnix;

#[cfg(target_os = "linux")]
use wry::WebViewBuilderExtUnix;

/// Shared reference to the webview event dispatch callback.
/// The `Arc<WebviewEventThreadsafeFunction>` wrapper lets us cheaply clone the pointer into
/// `Send + Sync` closures (e.g. `with_new_window_req_handler`).
pub(crate) type WebviewEventHandlerRef = Rc<RefCell<Option<Arc<WebviewEventThreadsafeFunction>>>>;
pub(crate) type WebviewResource = Rc<RefCell<Option<Rc<wry::WebView>>>>;

/// `with_navigation_handler` doesn't require `Send`, so `FunctionRef` is fine.
pub(crate) type WebviewBoolHandlerRef = Rc<RefCell<Option<FunctionRef<String, bool>>>>;
pub(crate) type WebviewNewWindowHandlerRef =
  Rc<RefCell<Option<FunctionRef<WebviewEventPayload, bool>>>>;

/// Fire a `WebviewEventPayload` via the TSF event dispatch.  Non-blocking: the
/// call is queued to libuv and executed on the JS thread.
fn dispatch_event(handler: &WebviewEventHandlerRef, payload: WebviewEventPayload) {
  let borrowed = handler.borrow();
  if let Some(tsf) = borrowed.as_ref() {
    let _ = tsf.call(Ok(payload), ThreadsafeFunctionCallMode::NonBlocking);
  }
}

/// Call a sync bool JS handler; returns `true` (allow) on missing handler or error.
fn call_bool_handler(handler: &WebviewBoolHandlerRef, env: Env, url: String) -> bool {
  let borrowed = handler.borrow();
  borrowed
    .as_ref()
    .and_then(|func_ref| func_ref.borrow_back(&env).ok())
    .and_then(|func| func.call(url).ok())
    .unwrap_or(true)
}

/// Call a sync new-window guard; returns `true` (allow) on missing handler or error.
fn call_new_window_handler(
  handler: &WebviewNewWindowHandlerRef,
  env: Env,
  event: WebviewEventPayload,
) -> bool {
  let borrowed = handler.borrow();
  borrowed
    .as_ref()
    .and_then(|func_ref| func_ref.borrow_back(&env).ok())
    .and_then(|func| func.call(event).ok())
    .unwrap_or(true)
}

pub(crate) fn protocol_error_response(
  message: &str,
) -> wry::http::Response<std::borrow::Cow<'static, [u8]>> {
  wry::http::Response::builder()
    .status(500)
    .header("Content-Type", "text/plain")
    .body(std::borrow::Cow::Owned(message.as_bytes().to_vec()))
    .expect("static protocol fallback response is valid")
}

pub(crate) fn respond_protocol_error(responders: &ProtocolPendingMap, id: u32, message: &str) {
  if let Some(responder) = responders.borrow_mut().remove(&id) {
    responder.respond(protocol_error_response(message));
  }
}

/// Internal type alias for async protocol pending-responder maps.
pub(crate) type ProtocolPendingMap = Rc<RefCell<HashMap<u32, wry::RequestAsyncResponder>>>;
/// Internal type alias for async protocol JS handler.
pub(crate) type ProtocolHandlerRef = Rc<RefCell<Option<FunctionRef<ProtocolRequest, ()>>>>;
/// Internal type alias for async protocol ID counter.
pub(crate) type ProtocolCounterRef = Rc<Cell<u32>>;

pub(crate) struct ProtocolRegistration {
  pub(crate) name: String,
  pub(crate) handler: ProtocolHandlerRef,
}

pub(crate) type WebviewEventThreadsafeFunction = ThreadsafeFunction<
  WebviewEventPayload,
  (),
  WebviewEventPayload,
  napi::Status,
  true, // CalleeHandled
  true, // Weak
>;
pub(crate) type WebviewScriptThreadsafeFunction = ThreadsafeFunction<
  String,
  (),
  String,
  napi::Status,
  true, // CalleeHandled
  true, // Weak
>;

pub(crate) struct WebviewCreateContext<'a> {
  pub(crate) protocols: &'a [ProtocolRegistration],
  pub(crate) protocol_responders: ProtocolPendingMap,
  pub(crate) protocol_next_id: ProtocolCounterRef,
  pub(crate) event_handler: Option<WebviewEventThreadsafeFunction>,
  pub(crate) navigation_handler: Option<FunctionRef<String, bool>>,
  pub(crate) new_window_handler: Option<FunctionRef<WebviewEventPayload, bool>>,
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
      ipc_name: None,
      auto_normalize_load_url: Some(true),
      use_https_scheme: Some(false),
    }
  }
}

#[napi(js_name = "Webview")]
pub struct JsWebview {
  // Rc is shared with the owning BrowserWindow so the WebView stays alive
  // even if JS garbage-collects this handle.
  pub(crate) webview_inner: WebviewResource,
  ipc_state: Rc<RefCell<Option<FunctionRef<IpcMessage, ()>>>>,
  disposed: Rc<Cell<bool>>,
  #[cfg(target_os = "windows")]
  auto_normalize_load_url: bool,
  #[cfg(target_os = "windows")]
  protocols: Vec<String>,
  #[cfg(target_os = "windows")]
  https_scheme_enabled: bool,
}

#[napi]
impl JsWebview {
  pub(crate) fn create(
    env: &Env,
    window: &Arc<Window>,
    options: WebviewOptions,
    web_context: Option<&mut crate::web_context::JsWebContext>,
    create_context: WebviewCreateContext<'_>,
  ) -> Result<Self> {
    let WebviewCreateContext {
      protocols,
      protocol_responders,
      protocol_next_id,
      event_handler,
      navigation_handler,
      new_window_handler,
    } = create_context;
    let event_handler = Rc::new(RefCell::new(event_handler.map(Arc::new)));
    let nav_handler = Rc::new(RefCell::new(navigation_handler));
    let new_window_handler = Rc::new(RefCell::new(new_window_handler));
    let mut context = web_context.map(JsWebContext::inner).transpose()?;
    let mut webview = if let Some(ctx) = context.as_mut() {
      WebViewBuilder::new_with_web_context(&mut *ctx)
    } else {
      WebViewBuilder::new()
    };

    if let Some(devtools) = options.enable_devtools {
      webview = webview.with_devtools(devtools);
    }

    #[cfg(target_os = "windows")]
    if let Some(https_enabled) = options.use_https_scheme {
      use wry::WebViewBuilderExtWindows;
      webview = webview.with_https_scheme(https_enabled);
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
    // setContentView which breaks Tao's invariant that the content view remains
    // its own native view subclass, crashing on window focus change.
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

    // ── Navigation handler ────────────────────────────────────────────────────
    {
      let nav_rc = Rc::clone(&nav_handler);
      let ev_rc = Rc::clone(&event_handler);
      let env_c = *env;
      webview = webview.with_navigation_handler(move |url: String| -> bool {
        let details = WebviewEventPayload {
          event: WebviewEventType::NavigationStarted.name().to_owned(),
          url: Some(url.clone()),
          target: Some("current".to_owned()),
          ..Default::default()
        };
        dispatch_event(&ev_rc, details);
        call_bool_handler(&nav_rc, env_c, url)
      });
    }

    // ── Page-load handler ─────────────────────────────────────────────────────
    {
      let ev_rc = Rc::clone(&event_handler);
      webview = webview.with_on_page_load_handler(move |event: PageLoadEvent, url: String| {
        let ev_type = match event {
          PageLoadEvent::Started => WebviewEventType::PageLoadStarted,
          PageLoadEvent::Finished => WebviewEventType::PageLoadFinished,
        };
        dispatch_event(
          &ev_rc,
          WebviewEventPayload {
            event: ev_type.name().to_owned(),
            url: Some(url),
            ..Default::default()
          },
        );
      });
    }

    // ── Document title changed handler ────────────────────────────────────────
    {
      let ev_rc = Rc::clone(&event_handler);
      webview = webview.with_document_title_changed_handler(move |title: String| {
        dispatch_event(
          &ev_rc,
          WebviewEventPayload {
            event: WebviewEventType::TitleChanged.name().to_owned(),
            title: Some(title),
            ..Default::default()
          },
        );
      });
    }

    // ── Download started handler ──────────────────────────────────────────────
    {
      let ev_rc = Rc::clone(&event_handler);
      webview = webview.with_download_started_handler(
        move |url: String, _dest: &mut std::path::PathBuf| -> bool {
          dispatch_event(
            &ev_rc,
            WebviewEventPayload {
              event: WebviewEventType::DownloadStarted.name().to_owned(),
              url: Some(url),
              ..Default::default()
            },
          );
          true // always allow; users control via event listener
        },
      );
    }

    // ── Download completed handler ────────────────────────────────────────────
    {
      let ev_rc = Rc::clone(&event_handler);
      webview = webview.with_download_completed_handler(
        move |url: String, _path: Option<std::path::PathBuf>, success: bool| {
          dispatch_event(
            &ev_rc,
            WebviewEventPayload {
              event: WebviewEventType::DownloadCompleted.name().to_owned(),
              url: Some(url),
              success: Some(success),
              ..Default::default()
            },
          );
        },
      );
    }

    // ── New window request handler ────────────────────────────────────────────
    // Wry requires this callback for `window.open` / `target="_blank"` requests.
    // On Windows Wry executes the callback through its message-loop dispatcher
    // after the WebView2 COM event returns, so the synchronous navigation guard
    // can be called here without crossing the COM callback directly into JS.
    // The ThreadsafeFunction remains necessary for the observational event.
    {
      let tsf_clone = event_handler.borrow().as_ref().map(Arc::clone);
      let nav_rc = Rc::clone(&nav_handler);
      let new_window_rc = Rc::clone(&new_window_handler);
      let env_c = *env;
      if tsf_clone.is_some()
        || nav_handler.borrow().is_some()
        || new_window_handler.borrow().is_some()
      {
        webview = webview.with_new_window_req_handler(
          move |url: String, features: NewWindowFeatures| -> NewWindowResponse {
            let window_features = WebviewNewWindowFeatures {
              size: features.size.map(|size| WebviewWindowSize {
                width: size.width,
                height: size.height,
              }),
              position: features.position.map(|position| WebviewWindowPosition {
                x: position.x,
                y: position.y,
              }),
            };
            let event = WebviewEventPayload {
              event: WebviewEventType::NewWindowRequested.name().to_owned(),
              url: Some(url.clone()),
              target: Some("new-window".to_owned()),
              window_features: if window_features.size.is_some()
                || window_features.position.is_some()
              {
                Some(window_features)
              } else {
                None
              },
              ..Default::default()
            };
            if let Some(tsf) = &tsf_clone {
              let _ = tsf.call(Ok(event.clone()), ThreadsafeFunctionCallMode::NonBlocking);
            }

            let navigation_allowed = call_bool_handler(&nav_rc, env_c, url);
            let new_window_allowed = call_new_window_handler(&new_window_rc, env_c, event);
            if navigation_allowed && new_window_allowed {
              NewWindowResponse::Allow
            } else {
              NewWindowResponse::Deny
            }
          },
        );
      }
    }

    // ── Custom protocols (async) ──────────────────────────────────────────────
    // wry's with_asynchronous_custom_protocol closure is NOT required to be
    // Send, so Rc<RefCell<>> is safe — everything runs on the main thread.
    let env_copy = *env;
    for protocol in protocols {
      let name = protocol.name.clone();
      let handler_rc = Rc::clone(&protocol.handler);
      let resp_rc = Rc::clone(&protocol_responders);
      let ctr_rc = Rc::clone(&protocol_next_id);
      let env_c = env_copy;

      webview = webview.with_asynchronous_custom_protocol(name, move |_id, req, responder| {
        let id = next_protocol_id(&ctr_rc);
        resp_rc.borrow_mut().insert(id, responder);

        let headers = req
          .headers()
          .iter()
          .map(|(key, value)| HeaderData {
            key: key.as_str().to_owned(),
            value: value.to_str().ok().map(str::to_owned),
          })
          .collect();
        let request = ProtocolRequest {
          id,
          url: req.uri().to_string(),
          method: req.method().to_string(),
          headers,
          body: req.body().to_vec().into(),
        };

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
              .call(request)
              .map_err(|_| "Protocol handler invocation failed")
          });

        if let Err(message) = callback_result {
          respond_protocol_error(&resp_rc, id, message);
        }
      });
    }

    // ── IPC transport ─────────────────────────────────────────────────────────
    let ipc_state = Rc::new(RefCell::new(None::<FunctionRef<IpcMessage, ()>>));
    let ipc_state_clone = ipc_state.clone();
    let env_copy = *env;

    let ipc_handler = move |req: Request<String>| {
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
    // Tao's native content view rather than replacing the NSWindow contentView.
    #[cfg(target_os = "macos")]
    let built = webview.build_as_child(window).map_err(err)?;

    #[cfg(target_os = "linux")]
    let built = if options.child.unwrap_or(false) {
      // Keep existing child behavior for this experiment.
      webview.build_as_child(window).map_err(err)?
    } else {
      let container = window.default_vbox().ok_or_else(|| {
        napi::Error::new(
          napi::Status::GenericFailure,
          "Tao window has no default GTK container",
        )
      })?;

      webview.build_gtk(container).map_err(err)?
    };

    #[cfg(all(not(target_os = "macos"), not(target_os = "linux")))]
    let built = if options.child.unwrap_or(false) {
      webview.build_as_child(window).map_err(err)
    } else {
      webview.build(window).map_err(err)
    }?;

    Ok(Self {
      webview_inner: Rc::new(RefCell::new(Some(Rc::new(built)))),
      ipc_state,
      disposed: Rc::new(Cell::new(false)),
      #[cfg(target_os = "windows")]
      auto_normalize_load_url: options.auto_normalize_load_url.unwrap_or(true),
      #[cfg(target_os = "windows")]
      protocols: protocols
        .iter()
        .map(|protocol| protocol.name.clone())
        .collect(),
      #[cfg(target_os = "windows")]
      https_scheme_enabled: options.use_https_scheme.unwrap_or(false),
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

  pub(crate) fn lifecycle_shared(&self) -> Rc<Cell<bool>> {
    Rc::clone(&self.disposed)
  }

  fn webview(&self) -> Ref<'_, Rc<wry::WebView>> {
    match Ref::filter_map(self.webview_inner.borrow(), Option::as_ref) {
      Ok(webview) => webview,
      Err(_) => panic!("Webview has been disposed"),
    }
  }

  #[napi]
  pub fn dispose(&mut self) {
    if self.disposed.replace(true) {
      return;
    }
    if let Some(webview) = self.webview_inner.borrow_mut().take() {
      let _ = webview.set_visible(false);
    }
    self.ipc_state.borrow_mut().take();
  }

  #[napi]
  pub fn is_disposed(&self) -> bool {
    self.disposed.get()
  }

  // ── expose() support ─────────────────────────────────────────────────────────

  /// Low-level method used by the JS `expose()` wrapper.
  ///
  /// Injects a page script that creates `window[name]` as an object with:
  /// - static values from `statics_json` (a JSON object string)
  /// - async function stubs for each name in `func_names`.
  ///
  /// The generated page calls are delivered through the generic IPC transport;
  /// the JavaScript wrapper owns namespace dispatch and Promise completion.
  #[napi(js_name = "_exposeInternal")]
  pub fn expose_internal(
    &mut self,
    name: String,
    statics_json: String,
    func_names: Vec<String>,
  ) -> Result<()> {
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
      .webview()
      .evaluate_script(&script)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  #[napi]
  pub fn print(&self) -> Result<()> {
    self.webview().print().map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to print: {}", e),
      )
    })
  }

  #[napi]
  pub fn zoom(&self, scale_factor: f64) -> Result<()> {
    self.webview().zoom(scale_factor).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to zoom: {}", e),
      )
    })
  }

  #[napi]
  pub fn set_webview_visibility(&self, visible: bool) -> Result<()> {
    self.webview().set_visible(visible).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to set webview visibility: {}", e),
      )
    })
  }

  #[napi]
  pub fn is_devtools_open(&self) -> bool {
    self.webview().is_devtools_open()
  }

  #[napi]
  pub fn open_devtools(&self) {
    self.webview().open_devtools();
  }

  #[napi]
  pub fn close_devtools(&self) {
    self.webview().close_devtools();
  }

  #[cfg(not(target_os = "windows"))]
  fn normalize_url(&self, url: String) -> String {
    url
  }

  #[cfg(target_os = "windows")]
  fn normalize_url(&self, url: String) -> String {
    if !self.auto_normalize_load_url {
      return url;
    }

    let Some((protocol, _)) = url.split_once("://") else {
      return url;
    };

    if !self.protocols.iter().any(|p| p == protocol) {
      return url;
    }

    let scheme = if self.https_scheme_enabled {
      "https"
    } else {
      "http"
    };

    // WebView2 doesn't reliably support custom protocols, so rewrite
    // registered schemes to HTTP(S) before loading.
    // See: https://github.com/MicrosoftEdge/WebView2Feedback/issues/73
    crate::custom_protocol_workaround::apply_uri_work_around(&url, scheme, protocol)
  }

  #[napi]
  pub fn load_url(&self, url: String) -> Result<()> {
    let url = self.normalize_url(url);

    self.webview().load_url(&url).map_err(|error| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to load URL: {error}"),
      )
    })
  }

  #[napi]
  pub fn load_html(&self, html: String) -> Result<()> {
    self.webview().load_html(&html).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to load HTML: {}", e),
      )
    })
  }

  #[napi]
  pub fn evaluate_script(&self, js: String) -> Result<()> {
    self
      .webview()
      .evaluate_script(&js)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("{}", e)))
  }

  #[napi]
  pub fn evaluate_script_with_callback(
    &self,
    js: String,
    callback: WebviewScriptThreadsafeFunction,
  ) -> Result<()> {
    self
      .webview()
      .evaluate_script_with_callback(&js, move |val| {
        callback.call(Ok(val), ThreadsafeFunctionCallMode::Blocking);
      })
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, format!("{}", e)))
  }

  #[napi]
  pub fn reload(&self) -> Result<()> {
    self.webview().reload().map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to reload: {}", e),
      )
    })
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  /// The URL the webview is currently showing.
  #[napi]
  pub fn url(&self) -> Option<String> {
    self.webview().url().ok()
  }

  /// Webview width in logical pixels (same coordinate space as `set_bounds`).
  #[napi(getter)]
  pub fn width(&self) -> Option<f64> {
    self
      .webview()
      .bounds()
      .ok()
      .map(|r| r.size.to_logical::<f64>(1.0).width)
  }

  /// Webview height in logical pixels (same coordinate space as `set_bounds`).
  #[napi(getter)]
  pub fn height(&self) -> Option<f64> {
    self
      .webview()
      .bounds()
      .ok()
      .map(|r| r.size.to_logical::<f64>(1.0).height)
  }

  /// Webview x offset from the window's top-left corner, in logical pixels.
  #[napi(getter)]
  pub fn x(&self) -> Option<f64> {
    self
      .webview()
      .bounds()
      .ok()
      .map(|r| r.position.to_logical::<f64>(1.0).x)
  }

  /// Webview y offset from the window's top-left corner, in logical pixels.
  #[napi(getter)]
  pub fn y(&self) -> Option<f64> {
    self
      .webview()
      .bounds()
      .ok()
      .map(|r| r.position.to_logical::<f64>(1.0).y)
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

    let url = self.normalize_url(url);

    self
      .webview()
      .load_url_with_headers(&url, map)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  // ── Cookies ──────────────────────────────────────────────────────────────────

  /// Return all cookies currently stored for `url`, or every cookie if `url`
  /// is `null` / `undefined`.
  #[napi]
  pub fn get_cookies(&self, url: Option<String>) -> Result<Vec<WebviewCookie>> {
    let raw = match url {
      Some(ref u) => self.webview().cookies_for_url(u),
      None => self.webview().cookies(),
    }
    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))?;

    Ok(raw.into_iter().map(cookie_to_js).collect())
  }

  /// Store a cookie in the webview's session.
  #[napi]
  pub fn set_cookie(&self, cookie: WebviewCookie) -> Result<()> {
    let c = js_to_cookie(&cookie);
    self
      .webview()
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
      .webview()
      .delete_cookie(&c)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  /// Erase all cookies, cache, local storage, and IndexedDB data.
  #[napi]
  pub fn clear_all_browsing_data(&self) -> Result<()> {
    self
      .webview()
      .clear_all_browsing_data()
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  // ── Appearance ───────────────────────────────────────────────────────────────

  /// Set the background colour shown before (or behind) page content.
  /// Values are 0-255.
  #[napi]
  pub fn set_background_color(&self, r: u8, g: u8, b: u8, a: u8) -> Result<()> {
    self
      .webview()
      .set_background_color((r, g, b, a))
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  // ── Bounds ───────────────────────────────────────────────────────────────────

  /// Return the webview's current bounds relative to the window, in logical
  /// pixels.
  #[napi]
  pub fn get_bounds(&self) -> Option<WebviewBounds> {
    self.webview().bounds().ok().map(|r| {
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
      .webview()
      .set_bounds(rect)
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  // ── Focus ─────────────────────────────────────────────────────────────────────

  /// Give keyboard focus to the webview content area.
  #[napi]
  pub fn focus(&self) -> Result<()> {
    self
      .webview()
      .focus()
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
  }

  /// Return focus to the parent/host window.
  #[napi]
  pub fn focus_parent(&self) -> Result<()> {
    self
      .webview()
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

use std::{
  cell::{RefCell, RefMut},
  path::Path,
  rc::Rc,
};

use napi::Result;
use napi_derive::napi;
use wry::WebContext;

#[napi(object, js_name = "WebContextOptions")]
pub struct WebContextOptions {
  /// Whether the WebView window should have a custom user data path.
  /// This is useful in Windows when a bundled application can’t have the webview data inside Program Files.
  pub data_directory: Option<String>,
  /// Whether the WebView window should allow automation (e.g. for testing).
  /// Note: this is currently only enforced on Linux, and has the stipulation that only 1 context allows automation at a time.
  pub allows_automation: Option<bool>,
}

#[napi(js_name = "WebContext")]
pub struct JsWebContext {
  web_context_inner: WebContextResource,
}

pub(crate) type WebContextResource = Rc<RefCell<Option<WebContext>>>;

#[napi]
impl JsWebContext {
  #[napi(constructor)]
  /// Not supported. Use `app.createWebContext(options)` instead.
  pub fn new() -> Result<Self> {
    Err(napi::Error::new(
      napi::Status::GenericFailure,
      "WebContext must be created with `app.createWebContext(options)` instead of `new WebContext()`.".to_string(),
    ))
  }

  /// Creates a new WebContext with the given options.
  pub fn create(options: Option<WebContextOptions>) -> Self {
    let data_directory = options.as_ref().and_then(|o| o.data_directory.clone());
    let allows_automation = options
      .as_ref()
      .and_then(|o| o.allows_automation)
      .unwrap_or(false);

    let mut web_context_inner =
      WebContext::new(data_directory.map(|dir| Path::new(&dir).to_path_buf()));

    if allows_automation {
      web_context_inner.set_allows_automation(true);
    }

    JsWebContext {
      web_context_inner: Rc::new(RefCell::new(Some(web_context_inner))),
    }
  }

  pub(crate) fn resource(&self) -> WebContextResource {
    Rc::clone(&self.web_context_inner)
  }

  pub fn inner(&mut self) -> Result<RefMut<'_, WebContext>> {
    RefMut::filter_map(self.web_context_inner.borrow_mut(), Option::as_mut)
      .map_err(|_| napi::Error::new(napi::Status::GenericFailure, "WebContext has been disposed"))
  }

  #[napi(getter)]
  /// A reference to the data directory the context was created with.
  pub fn data_directory(&self) -> Option<String> {
    self
      .web_context_inner
      .borrow()
      .as_ref()?
      .data_directory()
      .map(|path| path.to_string_lossy().to_string())
  }

  #[napi]
  /// Check if a custom protocol has been registered on this context.
  pub fn is_custom_protocol_registered(&self, scheme: String) -> bool {
    self
      .web_context_inner
      .borrow()
      .as_ref()
      .map(|context| context.is_custom_protocol_registered(&scheme))
      .unwrap_or(false)
  }

  #[napi]
  /// Set if this context allows automation.
  /// Note: this is currently only enforced on Linux, and has the stipulation that only 1 context allows automation at a time.
  pub fn set_allows_automation(&mut self, flag: bool) -> Result<()> {
    self.inner()?.set_allows_automation(flag);
    Ok(())
  }

  #[napi]
  pub fn dispose(&mut self) {
    self.web_context_inner.borrow_mut().take();
  }

  #[napi]
  pub fn is_disposed(&self) -> bool {
    self.web_context_inner.borrow().is_none()
  }
}

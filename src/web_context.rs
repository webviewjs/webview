use std::path::Path;

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
  web_context_inner: WebContext,
}

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

    JsWebContext { web_context_inner }
  }

  pub fn inner(&mut self) -> &mut WebContext {
    &mut self.web_context_inner
  }

  #[napi(getter)]
  /// A reference to the data directory the context was created with.
  pub fn data_directory(&self) -> Option<String> {
    self
      .web_context_inner
      .data_directory()
      .map(|path| path.to_string_lossy().to_string())
  }

  #[napi]
  /// Check if a custom protocol has been registered on this context.
  pub fn is_custom_protocol_registered(&self, scheme: String) -> bool {
    self
      .web_context_inner
      .is_custom_protocol_registered(&scheme)
  }

  #[napi]
  /// Set if this context allows automation.
  /// Note: this is currently only enforced on Linux, and has the stipulation that only 1 context allows automation at a time.
  pub fn set_allows_automation(&mut self, flag: bool) {
    self.web_context_inner.set_allows_automation(flag);
  }
}

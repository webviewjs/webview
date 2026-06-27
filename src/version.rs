use napi_derive::napi;

#[napi]
/// The current version of the `@webviewjs/webview` package
pub const VERSION: &str = env!("WEBVIEW_PKG_VERSION");

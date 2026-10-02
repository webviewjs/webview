/// FreeBSD x64 stub — compiles to a valid N-API addon but every API call
/// throws immediately with a clear "unsupported platform" message.
///
/// This exists solely so package managers that resolve `x86_64-unknown-freebsd`
/// get a loadable `.node` file.  No GUI functionality is provided.
use crate::types::*;
use napi::bindgen_prelude::*;
use napi::Result;
use napi_derive::napi;

const UNSUPPORTED: &str =
  "Unsupported platform: FreeBSD x64 is not currently supported by WebViewJS.";

fn unsupported<T>() -> Result<T> {
  Err(napi::Error::new(napi::Status::GenericFailure, UNSUPPORTED))
}

// ── Free functions ─────────────────────────────────────────────────────────────

#[napi]
pub fn get_webview_version() -> Result<String> {
  unsupported()
}

// ── Application ───────────────────────────────────────────────────────────────

#[napi]
pub struct Application;

#[napi]
impl Application {
  #[napi(constructor)]
  pub fn new(_env: Env, _options: Option<ApplicationOptions>) -> Result<Self> {
    // Since `Application` is the entrypoint for everything else, throwing here ensures that all other APIs are unreachable on FreeBSD.
    // we dont need to define the other methods, since they will never be called if the constructor fails.
    unsupported()
  }
}

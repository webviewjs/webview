//! Wry functions
//!
//! This module contains all functions from the wry crate.

use napi::Result;
use napi_derive::napi;

/// Returns the version of the webview library.
#[napi]
pub fn webview_version() -> Result<(u32, u32, u32)> {
  Ok((0, 53, 5))
}

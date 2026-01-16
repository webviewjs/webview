//! Wry traits
//!
//! This module contains all traits from the wry crate.

use napi::bindgen_prelude::*;
use napi_derive::napi;

use crate::wry::structs::WebView;

/// Extension trait for WebView on Unix platforms.
#[napi]
impl WebView {
  /// Gets the GTK widget for the webview (Unix only).
  #[napi]
  pub fn gtk_widget(&self) -> Result<u64> {
    #[cfg(any(
      target_os = "linux",
      target_os = "dragonfly",
      target_os = "freebsd",
      target_os = "netbsd",
      target_os = "openbsd"
    ))]
    {
      use wry::WebViewExtUnix;
      if let Some(inner) = &self.inner {
        let guard = inner.lock().unwrap();
        let webview_widget = guard.webview();
        // In webkit2gtk-rs, the widget is a wrapper around a pointer.
        // We can safely extract it as a u64 (pointer) for the GTK widget.
        let widget_ptr = &webview_widget as *const _ as *const *const std::ffi::c_void;
        Ok(unsafe { *widget_ptr } as u64)
      } else {
        Err(napi::Error::new(
          napi::Status::GenericFailure,
          "WebView not initialized".to_string(),
        ))
      }
    }

    #[cfg(not(any(
      target_os = "linux",
      target_os = "dragonfly",
      target_os = "freebsd",
      target_os = "netbsd",
      target_os = "openbsd"
    )))]
    {
      Err(napi::Error::new(
        napi::Status::GenericFailure,
        "Unix-specific method not available on this platform".to_string(),
      ))
    }
  }
}

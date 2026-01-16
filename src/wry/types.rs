//! Wry type aliases
//!
//! This module contains all type aliases from the wry crate.

use napi::Result as NapiResult;

/// RGBA color type.
pub type RGBA = [u8; 4];

/// Result type for webview operations.
pub type Result<T> = NapiResult<T>;

/// Unique identifier for a webview.
pub type WebViewId = u64;

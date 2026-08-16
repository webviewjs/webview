//! Based on https://github.com/tauri-apps/wry/blob/14be44842747a62c4110bd982f61f6c1acd705c3/src/custom_protocol_workaround.rs
//! - WebView2 supports non-standard protocols only on Windows 10+, so we have to use a workaround.
//!   See <https://github.com/MicrosoftEdge/WebView2Feedback/issues/73>
//! - On Android, there's no API for registering custom protocols, so this workaround is also used.
//!
//! The process looks like this:
//!
//! 1. Use [`apply_uri_work_around`] to convert the URI we want to navigate to
//! 2. Intercept http(s) requests, test the request URI against [`is_work_around_uri`],
//!    if it matches, we apply [`revert_uri_work_around`] to the URI and feed it to the custom protocol handler

use napi_derive::napi;

/// If the URI is a work around URI for this protocol which starts with `{http_or_https}://{protocol}.`
pub fn is_work_around_uri(uri: &str, http_or_https: &str, protocol: &str) -> bool {
  uri
    .strip_prefix(http_or_https)
    .and_then(|rest| rest.strip_prefix("://"))
    .and_then(|rest| rest.strip_prefix(protocol))
    .and_then(|rest| rest.strip_prefix("."))
    .is_some()
}

/// Conveting `{protocol}://localhost/abc` to `{http_or_https}://{protocol}.localhost/abc`
pub fn apply_uri_work_around(uri: &str, http_or_https: &str, protocol: &str) -> String {
  uri.replace(
    &original_uri_prefix(protocol),
    &work_around_uri_prefix(http_or_https, protocol),
  )
}

/// Conveting `{http_or_https}://{protocol}.localhost/abc` back to `{protocol}://localhost/abc`
pub fn revert_uri_work_around(uri: &str, http_or_https: &str, protocol: &str) -> String {
  uri.replace(
    &work_around_uri_prefix(http_or_https, protocol),
    &original_uri_prefix(protocol),
  )
}

pub fn original_uri_prefix(protocol: &str) -> String {
  format!("{protocol}://")
}

pub fn work_around_uri_prefix(http_or_https: &str, protocol: &str) -> String {
  format!("{http_or_https}://{protocol}.")
}

#[napi(js_name = "isWorkAroundUri")]
/// If the URI is a work around URI for this protocol which starts with `{http_or_https}://{protocol}.`
pub fn js_is_work_around_uri(uri: String, http_or_https: String, protocol: String) -> bool {
  is_work_around_uri(&uri, &http_or_https, &protocol)
}

#[napi(js_name = "applyUriWorkAround")]
/// Conveting `{protocol}://localhost/abc` to `{http_or_https}://{protocol}.localhost/abc`
pub fn js_apply_uri_work_around(uri: String, http_or_https: String, protocol: String) -> String {
  apply_uri_work_around(&uri, &http_or_https, &protocol)
}

#[napi(js_name = "revertUriWorkAround")]
/// Conveting `{http_or_https}://{protocol}.localhost/abc` back to `{protocol}://localhost/abc`
pub fn js_revert_uri_work_around(uri: String, http_or_https: String, protocol: String) -> String {
  revert_uri_work_around(&uri, &http_or_https, &protocol)
}

#[napi(js_name = "originalUriPrefix")]
/// Returns `{protocol}://`
pub fn js_original_uri_prefix(protocol: String) -> String {
  original_uri_prefix(&protocol)
}

#[napi(js_name = "workAroundUriPrefix")]
/// Returns `{http_or_https}://{protocol}.`
pub fn js_work_around_uri_prefix(http_or_https: String, protocol: String) -> String {
  work_around_uri_prefix(&http_or_https, &protocol)
}

#[cfg(test)]
mod tests {
  use super::is_work_around_uri;

  #[test]
  fn checks_if_custom_protocol_uri() {
    let scheme = "http";
    let uri = "http://wry.localhost/path/to/page";
    assert!(is_work_around_uri(uri, scheme, "wry"));
    assert!(!is_work_around_uri(uri, scheme, "asset"));
  }
}

//! Tao functions
//!
//! This module contains all functions from the tao crate.

use napi_derive::napi;

use crate::tao::structs::MonitorInfo;

/// Returns the current version of the tao crate.
#[napi]
pub fn tao_version() -> String {
  "0.34.5".to_string()
}

/// Returns the primary monitor information.
#[napi]
pub fn primary_monitor() -> MonitorInfo {
  MonitorInfo {
    name: None,
    size: crate::tao::structs::Size {
      width: 1920.0,
      height: 1080.0,
    },
    position: crate::tao::structs::Position { x: 0.0, y: 0.0 },
    scale_factor: 1.0,
  }
}

/// Returns a list of all available monitors.
#[napi]
pub fn available_monitors() -> Vec<MonitorInfo> {
  vec![primary_monitor()]
}

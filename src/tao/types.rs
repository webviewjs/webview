//! Tao type aliases
//!
//! This module contains all type aliases from the tao crate.

use napi::Result as NapiResult;

/// Result type for tao operations.
pub type Result<T> = NapiResult<T>;

/// Unique identifier for a window.
pub type WindowId = u32;

/// Device identifier.
pub type DeviceId = u32;

/// Axis identifier for scroll events.
pub type AxisId = u32;

/// Button identifier for mouse events.
pub type ButtonId = u32;

/// RGBA color type for icons and other pixel data.
pub type RGBA = [u8; 4];

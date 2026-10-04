#![deny(clippy::all)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod custom_protocol_workaround;
pub mod types;
pub mod version;

pub mod app;
pub mod browser_window;
pub mod menu;
#[cfg(any(target_os = "android", target_os = "ios"))]
pub(crate) mod mobile;
pub mod notifications;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub mod tray;
#[cfg(any(target_os = "android", target_os = "ios"))]
#[path = "tray_stub.rs"]
pub mod tray;
pub mod web_context;
pub mod webview;

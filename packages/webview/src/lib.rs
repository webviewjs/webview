#![deny(clippy::all)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod custom_protocol_workaround;
pub mod types;
pub mod version;

pub mod app;
pub mod browser_window;
pub mod menu;
pub mod notifications;
#[cfg(not(target_os = "android"))]
pub mod tray;
#[cfg(target_os = "android")]
#[path = "tray_stub.rs"]
pub mod tray;
pub mod web_context;
pub mod webview;

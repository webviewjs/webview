#![deny(clippy::all)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod types;
pub mod version;

// FreeBSD x64 is a stub-only target: the real GUI stack (wry/winit) is not
// compiled.  Every exported API throws a clear runtime error on that platform.
#[cfg(target_os = "freebsd")]
mod freebsd_stub;

// ── Real implementation (all other platforms) ─────────────────────────────────
#[cfg(not(target_os = "freebsd"))]
pub mod app;
#[cfg(not(target_os = "freebsd"))]
pub mod browser_window;
#[cfg(not(target_os = "freebsd"))]
pub mod menu;
#[cfg(not(any(target_os = "android", target_os = "freebsd")))]
pub mod tray;
#[cfg(target_os = "android")]
#[path = "tray_stub.rs"]
pub mod tray;
#[cfg(not(target_os = "freebsd"))]
pub mod web_context;
#[cfg(not(target_os = "freebsd"))]
pub mod webview;
#[cfg(target_os = "windows")]
mod win32_resize;

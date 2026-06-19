//! Platform behaviour:
//!  - **Windows**: per-window menu bar attached via Win32 HWND.
//!  - **macOS**: app-level NSApplication menu bar (no per-window attachment).
//!  - **Linux**: GTK integration is not possible through winit's raw handles,
//!    so menus are a no-op; menu events are never fired on Linux.
//!  - **Android**: menu system is completely disabled.

#[cfg(not(target_os = "android"))]
use muda::{accelerator::Accelerator, Menu, MenuItem, PredefinedMenuItem, Submenu};
use napi::Result;

use crate::{MenuItemOptions, MenuOptions};

/// Perform any one-time platform-level menu initialisation.
/// Called automatically from `Application::new()` so the caller never needs
/// to invoke `initMenuSystem()` manually.
pub fn auto_init_platform() {
  #[cfg(target_os = "macos")]
  {
    // Install a blank menu bar so macOS has somewhere to attach items.
    // This is idempotent — safe to call multiple times.
    muda::Menu::new().init_for_nsapp();
  }
}

/// Build a [`muda::Menu`] from the JS-facing options tree.
#[cfg(not(target_os = "android"))]
pub fn create_menu_from_options(options: MenuOptions) -> Result<Menu> {
  let menu = Menu::new();

  // The built-in "App" submenu ships on every platform (App > Quit etc.).
  let app = Submenu::new("App", true);
  app
    .append_items(&[
      &PredefinedMenuItem::about(None, None),
      &PredefinedMenuItem::separator(),
      &PredefinedMenuItem::hide(None),
      &PredefinedMenuItem::hide_others(None),
      &PredefinedMenuItem::show_all(None),
      &PredefinedMenuItem::separator(),
      &PredefinedMenuItem::quit(None),
    ])
    .ok();
  menu.append(&app).ok();

  for item in options.items {
    add_item_to_menu(&menu, item)?;
  }

  Ok(menu)
}

/// Attach `menu` to a native window on the platforms that support it.
#[cfg(not(target_os = "android"))]
pub fn init_menu_for_window(menu: &Menu, window: &winit::window::Window) -> Result<()> {
  #[cfg(target_os = "windows")]
  {
    use winit::raw_window_handle::{HasWindowHandle, RawWindowHandle};
    if let Ok(handle) = window.window_handle() {
      if let RawWindowHandle::Win32(h) = handle.as_raw() {
        unsafe {
          let _ = menu.init_for_hwnd(h.hwnd.get() as _);
        };
      }
    }
  }
  // macOS: menus are app-level — init_for_nsapp is called in auto_init_platform.
  #[cfg(target_os = "macos")]
  let _ = (menu, window);
  // Linux: winit does not expose GTK handles so menus can't be attached.
  #[cfg(not(any(target_os = "windows", target_os = "macos")))]
  let _ = (menu, window);

  Ok(())
}

// ── Recursive item builders ───────────────────────────────────────────────────

#[cfg(not(target_os = "android"))]
fn add_item_to_menu(menu: &Menu, item: MenuItemOptions) -> Result<()> {
  if let Some(sub_opts) = item.submenu {
    let sub = Submenu::new(item.label.as_deref().unwrap_or(""), true);
    for child in sub_opts.items {
      add_item_to_submenu(&sub, child)?;
    }
    menu.append(&sub).map_err(menu_err)?;
  } else if let Some(ref role) = item.role {
    menu.append(&role_to_predefined(role)?).map_err(menu_err)?;
  } else if item.id.is_some() || item.label.is_some() {
    menu.append(&make_menu_item(&item)?).map_err(menu_err)?;
  }
  Ok(())
}

#[cfg(not(target_os = "android"))]
fn add_item_to_submenu(submenu: &Submenu, item: MenuItemOptions) -> Result<()> {
  if let Some(sub_opts) = item.submenu {
    let nested = Submenu::new(item.label.as_deref().unwrap_or(""), true);
    for child in sub_opts.items {
      add_item_to_submenu(&nested, child)?;
    }
    submenu.append(&nested).map_err(menu_err)?;
  } else if let Some(ref role) = item.role {
    submenu
      .append(&role_to_predefined(role)?)
      .map_err(menu_err)?;
  } else if item.id.is_some() || item.label.is_some() {
    submenu.append(&make_menu_item(&item)?).map_err(menu_err)?;
  }
  Ok(())
}

#[cfg(not(target_os = "android"))]
fn role_to_predefined(role: &str) -> Result<PredefinedMenuItem> {
  Ok(match role {
    // Editing
    "copy" => PredefinedMenuItem::copy(None),
    "paste" => PredefinedMenuItem::paste(None),
    "cut" => PredefinedMenuItem::cut(None),
    "undo" => PredefinedMenuItem::undo(None),
    "redo" => PredefinedMenuItem::redo(None),
    "selectall" | "select-all" => PredefinedMenuItem::select_all(None),
    "separator" | "-" => PredefinedMenuItem::separator(),
    // Window
    "minimize" => PredefinedMenuItem::minimize(None),
    "maximize" => PredefinedMenuItem::maximize(None),
    "fullscreen" => PredefinedMenuItem::fullscreen(None),
    "close" | "closewindow" | "close-window" => PredefinedMenuItem::close_window(None),
    // App
    "quit" => PredefinedMenuItem::quit(None),
    "about" => PredefinedMenuItem::about(None, None),
    "hide" => PredefinedMenuItem::hide(None),
    "hideothers" | "hide-others" => PredefinedMenuItem::hide_others(None),
    "showall" | "show-all" => PredefinedMenuItem::show_all(None),
    // macOS-only
    "services" => PredefinedMenuItem::services(None),
    "bringalltofront" | "bring-all-to-front" => PredefinedMenuItem::bring_all_to_front(None),
    _ => {
      return Err(napi::Error::new(
        napi::Status::InvalidArg,
        format!("Unknown menu role: \"{}\"", role),
      ))
    }
  })
}

#[cfg(not(target_os = "android"))]
fn make_menu_item(item: &MenuItemOptions) -> Result<MenuItem> {
  Ok(MenuItem::with_id(
    muda::MenuId(
      item
        .id
        .clone()
        .unwrap_or_else(|| item.label.clone().unwrap_or_else(|| "item".to_string())),
    ),
    item.label.as_deref().unwrap_or(""),
    item.enabled.unwrap_or(true),
    item
      .accelerator
      .as_ref()
      .and_then(|acc| acc.parse::<Accelerator>().ok()),
  ))
}

#[cfg(not(target_os = "android"))]
fn menu_err(e: impl std::fmt::Display) -> napi::Error {
  napi::Error::new(napi::Status::GenericFailure, e.to_string())
}

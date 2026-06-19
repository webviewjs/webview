use napi::{Either, Env, Result};
use napi_derive::*;
use std::sync::{Arc, Mutex};
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;
use tao::{
  dpi::{LogicalPosition, PhysicalPosition, LogicalSize, PhysicalSize},
  event_loop::EventLoop,
  window::{Fullscreen, ProgressBarState, Window, WindowBuilder, WindowId},
};
use rfd::FileDialog;
#[cfg(not(target_os = "android"))]
use muda::Menu;

use crate::webview::{JsWebview, Theme, WebviewOptions};
use crate::MenuOptions;
#[cfg(not(target_os = "android"))]
use crate::create_menu_from_options;

// #[cfg(target_os = "windows")]
// use tao::platform::windows::IconExtWindows;

#[napi]
pub enum FullscreenType {
  /// Exclusive fullscreen.
  Exclusive,
  /// Borderless fullscreen.
  Borderless,
}

#[napi(object)]
pub struct Dimensions {
  /// The width of the size.
  pub width: u32,
  /// The height of the size.
  pub height: u32,
}

#[napi(object)]
pub struct Position {
  /// The x position.
  pub x: i32,
  /// The y position.
  pub y: i32,
}

#[napi(object, js_name = "VideoMode")]
pub struct JsVideoMode {
  /// The size of the video mode.
  pub size: Dimensions,
  /// The bit depth of the video mode.
  pub bit_depth: u16,
  /// The refresh rate of the video mode.
  pub refresh_rate: u16,
}

#[napi(object)]
pub struct Monitor {
  /// The name of the monitor.
  pub name: Option<String>,
  /// The scale factor of the monitor.
  pub scale_factor: f64,
  /// The size of the monitor.
  pub size: Dimensions,
  /// The position of the monitor.
  pub position: Position,
  /// The video modes of the monitor.
  pub video_modes: Vec<JsVideoMode>,
}

#[napi(js_name = "ProgressBarState")]
pub enum JsProgressBarState {
  None,
  Normal,
  /// Treated as normal in linux and macos
  Indeterminate,
  /// Treated as normal in linux
  Paused,
  /// Treated as normal in linux
  Error,
}

#[napi(object)]
pub struct JsProgressBar {
  /// The progress state.
  pub state: Option<JsProgressBarState>,
  /// The progress value.
  pub progress: Option<u32>,
}

#[napi(object)]
pub struct BrowserWindowOptions {
  /// The window menu
  pub menu: Option<MenuOptions>,
  /// Whether to show the menu bar
  pub show_menu: Option<bool>,
  /// Whether the window is resizable. Default is `true`.
  pub resizable: Option<bool>,
  /// The window title.
  pub title: Option<String>,
  /// Whether to use logical sizing (DPI-aware) instead of physical sizing for width, height, x, and y.
  pub logical: Option<bool>,
  /// The width of the window.
  pub width: Option<f64>,
  /// The height of the window.
  pub height: Option<f64>,
  /// The x position of the window.
  pub x: Option<f64>,
  /// The y position of the window.
  pub y: Option<f64>,
  /// Whether or not the window should be created with content protection mode.
  pub content_protection: Option<bool>,
  /// Whether or not the window is always on top.
  pub always_on_top: Option<bool>,
  /// Whether or not the window is always on bottom.
  pub always_on_bottom: Option<bool>,
  /// Whether or not the window is visible.
  pub visible: Option<bool>,
  /// Whether or not the window decorations are enabled.
  pub decorations: Option<bool>,
  /// Whether or not the window is visible on all workspaces
  pub visible_on_all_workspaces: Option<bool>,
  /// Whether or not the window is maximized.
  pub maximized: Option<bool>,
  /// Whether or not the window is maximizable
  pub maximizable: Option<bool>,
  /// Whether or not the window is minimizable
  pub minimizable: Option<bool>,
  /// Whether or not the window is focused
  pub focused: Option<bool>,
  /// Whether or not the window is transparent
  pub transparent: Option<bool>,
  /// The fullscreen state of the window.
  pub fullscreen: Option<FullscreenType>,
}

#[napi(object)]
pub struct FileDialogOptions {
  /// Whether to allow selecting multiple files.
  pub multiple: Option<bool>,
  /// The title of the file dialog.
  pub title: Option<String>,
  /// The initial directory of the file dialog.
  pub default_path: Option<String>,
  /// The file types that can be selected in the file dialog.
  pub filters: Option<Vec<FileFilter>>,
}

#[napi(object)]
pub struct FileFilter {
  /// The name of the file filter.
  pub name: String,
  /// The extensions of the file filter.
  pub extensions: Vec<String>,
}

impl Default for BrowserWindowOptions {
  fn default() -> Self {
    Self {
      menu: None,
      show_menu: Some(true),
      resizable: Some(true),
      title: Some("WebviewJS".to_owned()),
      logical: Some(false),
      width: Some(800.0),
      height: Some(600.0),
      x: Some(0.0),
      y: Some(0.0),
      content_protection: Some(false),
      always_on_top: Some(false),
      always_on_bottom: Some(false),
      visible: Some(true),
      decorations: Some(true),
      visible_on_all_workspaces: Some(false),
      maximized: Some(false),
      maximizable: Some(true),
      minimizable: Some(true),
      focused: Some(true),
      transparent: Some(false),
      fullscreen: None,
    }
  }
}

#[napi]
pub struct BrowserWindow {
  is_child_window: bool,
  window: Window,
  window_id: u32,
  #[cfg(not(target_os = "android"))]
  window_menu: Option<Menu>,
}

#[napi]
impl BrowserWindow {
  pub fn new(
    event_loop: &EventLoop<()>,
    options: Option<BrowserWindowOptions>,
    child: bool,
    #[cfg(not(target_os = "android"))]
    global_menu: Arc<Mutex<Option<Menu>>>,
    #[cfg(target_os = "android")]
    _global_menu: Arc<Mutex<Option<()>>>,
  ) -> Result<Self> {
    let options = options.unwrap_or_default();

    let mut window = WindowBuilder::new();

    if let Some(resizable) = options.resizable {
      window = window.with_resizable(resizable);
    }

    if let Some(width) = options.width {
      if let Some(logical) = options.logical {
        if logical {
          window = window.with_inner_size(LogicalSize::new(width, options.height.unwrap()));
        } else {
          window = window.with_inner_size(PhysicalSize::new(width, options.height.unwrap()));
        }
      } else {
        window = window.with_inner_size(PhysicalSize::new(width, options.height.unwrap()));
      }
    }

    if let Some(x) = options.x {
      if let Some(logical) = options.logical {
        if logical {
          window = window.with_position(LogicalPosition::new(x, options.y.unwrap()));
        } else {
          window = window.with_position(PhysicalPosition::new(x, options.y.unwrap()));
        }
      } else {
        window = window.with_position(PhysicalPosition::new(x, options.y.unwrap()));
      }
    }

    if let Some(visible) = options.visible {
      window = window.with_visible(visible);
    }

    if let Some(decorations) = options.decorations {
      window = window.with_decorations(decorations);
    }

    if let Some(always_on_top) = options.always_on_top {
      window = window.with_always_on_top(always_on_top);
    }

    if let Some(always_on_bottom) = options.always_on_bottom {
      window = window.with_always_on_bottom(always_on_bottom);
    }

    if let Some(visible_on_all_workspaces) = options.visible_on_all_workspaces {
      window = window.with_visible_on_all_workspaces(visible_on_all_workspaces);
    }

    if let Some(maximized) = options.maximized {
      window = window.with_maximized(maximized);
    }

    if let Some(maximizable) = options.maximizable {
      window = window.with_maximizable(maximizable);
    }

    if let Some(minimizable) = options.minimizable {
      window = window.with_minimizable(minimizable);
    }

    if let Some(focused) = options.focused {
      window = window.with_focused(focused);
    }

    if let Some(transparent) = options.transparent {
      window = window.with_transparent(transparent);
      #[cfg(target_os = "windows")]
      {
        use tao::platform::windows::WindowBuilderExtWindows;
        window = window.with_undecorated_shadow(false);
      }
    }

    if let Some(fullscreen) = options.fullscreen {
      let fs = match fullscreen {
        // Some(FullscreenType::Exclusive) => Some(Fullscreen::Exclusive()),
        FullscreenType::Borderless => Some(Fullscreen::Borderless(None)),
        _ => None,
      };

      window = window.with_fullscreen(fs);
    }

    if let Some(title) = options.title {
      window = window.with_title(&title);
    }

    let window = window.build(event_loop).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create window: {}", e),
      )
    })?;

    // Generate a window ID by hashing the WindowId
    let mut hasher = DefaultHasher::new();
    window.id().hash(&mut hasher);
    let window_id = hasher.finish() as u32;

    // Handle menu for this window
    #[cfg(not(target_os = "android"))]
    let window_menu = if let Some(menu_options) = options.menu {
      // Create window-specific menu
      let menu = create_menu_from_options(menu_options)?;
      #[cfg(target_os = "windows")]
      {
        use tao::platform::windows::WindowExtWindows;
        unsafe {
          menu.init_for_hwnd(window.hwnd() as isize).map_err(|e| {
            napi::Error::new(
              napi::Status::GenericFailure,
              format!("Failed to set window menu: {}", e),
            )
          })?
        };
      }
      #[cfg(target_os = "linux")]
      {
        use tao::platform::unix::WindowExtUnix;
        menu.init_for_gtk_window(window.gtk_window(), window.default_vbox()).map_err(|e| {
          napi::Error::new(
            napi::Status::GenericFailure,
            format!("Failed to set window menu: {}", e),
          )
        })?;
      }
      Some(menu)
    } else if options.show_menu.unwrap_or(false) {
      // Use global menu if available and show_menu is true
      if let Ok(global_menu) = global_menu.lock() {
        if let Some(_menu) = global_menu.as_ref() {
          #[cfg(target_os = "windows")]
          {
            use tao::platform::windows::WindowExtWindows;
            unsafe {
              _menu.init_for_hwnd(window.hwnd() as isize).map_err(|e| {
                napi::Error::new(
                  napi::Status::GenericFailure,
                  format!("Failed to set global menu: {}", e),
                )
              })?
            };
          }
          #[cfg(target_os = "linux")]
          {
            use tao::platform::unix::WindowExtUnix;
            _menu.init_for_gtk_window(window.gtk_window(), window.default_vbox()).map_err(|e| {
              napi::Error::new(
                napi::Status::GenericFailure,
                format!("Failed to set global menu: {}", e),
              )
            })?;
          }
        }
      }
      None
    } else {
      None
    };

    Ok(Self {
      window,
      is_child_window: child,
      window_id,
      #[cfg(not(target_os = "android"))]
      window_menu,
    })
  }

  #[napi]
  /// Creates a webview on this window.
  pub fn create_webview(&mut self, env: Env, options: Option<WebviewOptions>) -> Result<JsWebview> {
    let webview = JsWebview::create(&env, &self.window, options.unwrap_or_default())?;
    Ok(webview)
  }

  #[napi(getter)]
  /// Whether or not the window is a child window.
  pub fn is_child(&self) -> bool {
    self.is_child_window
  }

  #[napi]
  /// Whether the window is focused.
  pub fn is_focused(&self) -> bool {
    self.window.is_focused()
  }

  #[napi]
  /// Whether the window is visible.
  pub fn is_visible(&self) -> bool {
    self.window.is_visible()
  }

  #[napi]
  /// Whether the window is decorated.
  pub fn is_decorated(&self) -> bool {
    self.window.is_decorated()
  }

  #[napi]
  /// Whether the window is closable.
  pub fn is_closable(&self) -> bool {
    self.window.is_closable()
  }

  #[napi]
  /// Whether the window is maximizable.
  pub fn is_maximizable(&self) -> bool {
    self.window.is_maximizable()
  }

  #[napi]
  /// Whether the window is minimizable.
  pub fn is_minimizable(&self) -> bool {
    self.window.is_minimizable()
  }

  #[napi]
  /// Whether the window is maximized.
  pub fn is_maximized(&self) -> bool {
    self.window.is_maximized()
  }

  #[napi]
  /// Whether the window is minimized.
  pub fn is_minimized(&self) -> bool {
    self.window.is_minimized()
  }

  #[napi]
  /// Whether the window is resizable.
  pub fn is_resizable(&self) -> bool {
    self.window.is_resizable()
  }

  #[napi]
  /// Sets the window title.
  pub fn set_title(&self, title: String) {
    self.window.set_title(&title);
  }

  #[napi(getter)]
  /// Sets the window title.
  pub fn get_title(&self) -> String {
    self.window.title()
  }

  #[napi]
  /// Sets closable.
  pub fn set_closable(&self, closable: bool) {
    self.window.set_closable(closable);
  }

  #[napi]
  /// Sets maximizable.
  pub fn set_maximizable(&self, maximizable: bool) {
    self.window.set_maximizable(maximizable);
  }

  #[napi]
  /// Sets minimizable.
  pub fn set_minimizable(&self, minimizable: bool) {
    self.window.set_minimizable(minimizable);
  }

  #[napi]
  /// Sets resizable.
  pub fn set_resizable(&self, resizable: bool) {
    self.window.set_resizable(resizable);
  }

  #[napi]
  /// Sets the window inner size (width and height).
  pub fn set_size(&self, width: u32, height: u32, logical: Option<bool>) {
    if let Some(logical) = logical {
      if logical {
        self.window.set_inner_size(LogicalSize::new(width, height));
      } else {
        self.window.set_inner_size(PhysicalSize::new(width, height));
      }
    } else {
      self.window.set_inner_size(PhysicalSize::new(width, height));
    }
  }

  #[napi]
  /// Gets the window inner size.
  pub fn get_size(&self, logical: Option<bool>) -> Dimensions {
    let size = self.window.inner_size();
    if let Some(logical) = logical {
      if logical {
        let logical_size = size.to_logical::<f64>(self.window.scale_factor());
        return Dimensions {
          width: logical_size.width as u32,
          height: logical_size.height as u32,
        };
      }
    }
    Dimensions {
      width: size.width,
      height: size.height,
    }
  }

  #[napi]
  /// Sets the window position (x and y).
  pub fn set_position(&self, x: i32, y: i32, logical: Option<bool>) {
    if let Some(logical) = logical {
      if logical {
        self.window.set_outer_position(LogicalPosition::new(x, y));
      } else {
        self.window.set_outer_position(PhysicalPosition::new(x, y));
      }
    } else {
      self.window.set_outer_position(PhysicalPosition::new(x, y));
    }
  }

  #[napi]
  /// Gets the window position.
  pub fn get_position(&self, logical: Option<bool>) -> Position {
    let position = self.window.outer_position().unwrap_or(PhysicalPosition::new(0, 0));
    if let Some(logical) = logical {
      if logical {
        let logical_position = position.to_logical::<f64>(self.window.scale_factor());
        return Position {
          x: logical_position.x as i32,
          y: logical_position.y as i32,
        };
      }
    }
    Position {
      x: position.x,
      y: position.y,
    }
  }

  #[napi]
  /// Opens a file select dialog
  pub fn open_file_dialog(&self, options: Option<FileDialogOptions>) -> Result<Vec<String>> {
    let mut dialog = FileDialog::new();

    if let Some(opts) = options.as_ref() {
      if let Some(title) = &opts.title {
        dialog = dialog.set_title(title);
      }

      if let Some(path) = &opts.default_path {
        dialog = dialog.set_directory(path);
      }

      if let Some(filters) = &opts.filters {
        for filter in filters {
          dialog = dialog.add_filter(
            &filter.name,
            &filter.extensions,
          );
        }
      }
    }

    dialog = dialog.add_filter("All Files", &["*"]);

    let files = if options
      .as_ref()
      .and_then(|o| o.multiple)
      .unwrap_or(false)
    {
      dialog.pick_files()
    } else {
      dialog.pick_file().map(|f| vec![f])
    };

    Ok(
      files
        .unwrap_or_default()
        .into_iter()
        .map(|f| f.as_path().to_string_lossy().to_string())
        .collect()
    )
  }

  #[napi]
  /// Gets the window ID.
  pub fn id(&self) -> u32 {
    self.window_id
  }

  #[napi]
  /// Gets whether the window has a menu.
  pub fn has_menu(&self) -> bool {
    #[cfg(not(target_os = "android"))]
    { self.window_menu.is_some() }
    #[cfg(target_os = "android")]
    { false }
  }

  /// Gets the tao window ID (for internal use).
  pub fn tao_window_id(&self) -> WindowId {
    self.window.id()
  }

  #[napi(getter)]
  /// Gets the window theme.
  pub fn get_theme(&self) -> Theme {
    match self.window.theme() {
      tao::window::Theme::Light => Theme::Light,
      tao::window::Theme::Dark => Theme::Dark,
      _ => Theme::System,
    }
  }

  #[napi]
  /// Sets the window theme.
  pub fn set_theme(&self, theme: Theme) {
    let theme = match theme {
      Theme::Light => Some(tao::window::Theme::Light),
      Theme::Dark => Some(tao::window::Theme::Dark),
      _ => None,
    };

    self.window.set_theme(theme);
  }

  #[napi]
  /// Sets the window icon.
  #[allow(unused_variables)]
  pub fn set_window_icon(
    &self,
    icon: Either<Vec<u8>, String>,
    width: u32,
    height: u32,
  ) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
      use tao::platform::windows::IconExtWindows;
      use tao::window::Icon;

      let ico = match icon {
        Either::A(bytes) => Icon::from_rgba(bytes, width, height),
        Either::B(path) => Icon::from_path(&path, PhysicalSize::new(width, height).into()),
      };

      let parsed = ico.map_err(|e| {
        napi::Error::new(
          napi::Status::GenericFailure,
          format!("Failed to set window icon: {}", e),
        )
      })?;

      self.window.set_window_icon(Some(parsed));
    }

    Ok(())
  }

  #[napi]
  /// Removes the window icon.
  pub fn remove_window_icon(&self) {
    self.window.set_window_icon(None);
  }

  #[napi]
  /// Modifies the window's visibility.
  /// If `false`, this will hide all the window. If `true`, this will show the window.
  pub fn set_visible(&self, visible: bool) {
    self.window.set_visible(visible);
  }

  #[napi]
  /// Modifies the window's progress bar.
  pub fn set_progress_bar(&self, state: JsProgressBar) {
    let progress_state = match state.state {
      Some(JsProgressBarState::Normal) => Some(tao::window::ProgressState::Normal),
      Some(JsProgressBarState::Indeterminate) => Some(tao::window::ProgressState::Indeterminate),
      Some(JsProgressBarState::Paused) => Some(tao::window::ProgressState::Paused),
      Some(JsProgressBarState::Error) => Some(tao::window::ProgressState::Error),
      _ => None,
    };

    let progress_value = state.progress.map(|value| value as u64);

    let progress = ProgressBarState {
      progress: progress_value,
      state: progress_state,
      desktop_filename: None,
    };

    self.window.set_progress_bar(progress);
  }

  #[napi]
  /// Maximizes the window.
  pub fn set_maximized(&self, value: bool) {
    self.window.set_maximized(value);
  }

  #[napi]
  /// Minimizes the window.
  pub fn set_minimized(&self, value: bool) {
    self.window.set_minimized(value);
  }

  #[napi]
  /// Bring the window to front and focus.
  pub fn focus(&self) {
    self.window.set_focus();
  }

  #[napi]
  /// Get available monitors.
  pub fn get_available_monitors(&self) -> Vec<Monitor> {
    self
      .window
      .available_monitors()
      .map(|m| Monitor {
        name: m.name(),
        scale_factor: m.scale_factor(),
        size: Dimensions {
          width: m.size().width,
          height: m.size().height,
        },
        position: Position {
          x: m.position().x,
          y: m.position().y,
        },
        video_modes: m
          .video_modes()
          .map(|v| JsVideoMode {
            size: Dimensions {
              width: v.size().width,
              height: v.size().height,
            },
            bit_depth: v.bit_depth(),
            refresh_rate: v.refresh_rate(),
          })
          .collect(),
      })
      .collect()
  }

  #[napi]
  /// Get the current monitor.
  pub fn get_current_monitor(&self) -> Option<Monitor> {
    self.window.current_monitor().map(|monitor| Monitor {
      name: monitor.name(),
      scale_factor: monitor.scale_factor(),
      size: Dimensions {
        width: monitor.size().width,
        height: monitor.size().height,
      },
      position: Position {
        x: monitor.position().x,
        y: monitor.position().y,
      },
      video_modes: monitor
        .video_modes()
        .map(|v| JsVideoMode {
          size: Dimensions {
            width: v.size().width,
            height: v.size().height,
          },
          bit_depth: v.bit_depth(),
          refresh_rate: v.refresh_rate(),
        })
        .collect(),
    })
  }

  #[napi]
  /// Get the primary monitor.
  pub fn get_primary_monitor(&self) -> Option<Monitor> {
    self.window.primary_monitor().map(|monitor| Monitor {
      name: monitor.name(),
      scale_factor: monitor.scale_factor(),
      size: Dimensions {
        width: monitor.size().width,
        height: monitor.size().height,
      },
      position: Position {
        x: monitor.position().x,
        y: monitor.position().y,
      },
      video_modes: monitor
        .video_modes()
        .map(|v| JsVideoMode {
          size: Dimensions {
            width: v.size().width,
            height: v.size().height,
          },
          bit_depth: v.bit_depth(),
          refresh_rate: v.refresh_rate(),
        })
        .collect(),
    })
  }

  #[napi]
  /// Get the monitor from the given point.
  pub fn get_monitor_from_point(&self, x: f64, y: f64) -> Option<Monitor> {
    self.window.monitor_from_point(x, y).map(|monitor| Monitor {
      name: monitor.name(),
      scale_factor: monitor.scale_factor(),
      size: Dimensions {
        width: monitor.size().width,
        height: monitor.size().height,
      },
      position: Position {
        x: monitor.position().x,
        y: monitor.position().y,
      },
      video_modes: monitor
        .video_modes()
        .map(|v| JsVideoMode {
          size: Dimensions {
            width: v.size().width,
            height: v.size().height,
          },
          bit_depth: v.bit_depth(),
          refresh_rate: v.refresh_rate(),
        })
        .collect(),
    })
  }

  #[napi]
  /// Prevents the window contents from being captured by other apps.
  pub fn set_content_protection(&self, enabled: bool) {
    self.window.set_content_protection(enabled);
  }

  #[napi]
  /// Sets the window always on top.
  pub fn set_always_on_top(&self, enabled: bool) {
    self.window.set_always_on_top(enabled);
  }

  #[napi]
  /// Sets always on bottom.
  pub fn set_always_on_bottom(&self, enabled: bool) {
    self.window.set_always_on_bottom(enabled);
  }

  #[napi]
  /// Turn window decorations on or off.
  pub fn set_decorations(&self, enabled: bool) {
    self.window.set_decorations(enabled);
  }

  #[napi(getter)]
  /// Gets the window's current fullscreen state.
  pub fn get_fullscreen(&self) -> Option<FullscreenType> {
    match self.window.fullscreen() {
      None => None,
      Some(Fullscreen::Borderless(None)) => Some(FullscreenType::Borderless),
      _ => Some(FullscreenType::Exclusive),
    }
  }

  #[napi]
  /// Sets the window to fullscreen or back.
  pub fn set_fullscreen(&self, fullscreen_type: Option<FullscreenType>) {
    let monitor = self.window.current_monitor();

    if monitor.is_none() {
      return;
    };

    let video_mode = monitor.unwrap().video_modes().next();

    if video_mode.is_none() {
      return;
    };

    let fs = match fullscreen_type {
      Some(FullscreenType::Exclusive) => Some(Fullscreen::Exclusive(video_mode.unwrap())),
      Some(FullscreenType::Borderless) => Some(Fullscreen::Borderless(None)),
      _ => None,
    };

    self.window.set_fullscreen(fs);
  }

  #[napi]
  /// Closes the window by hiding it. Note: This hides the window rather than closing it completely,
  /// as tao requires the event loop to handle window closing. Use this when you want to
  /// close a specific window (like a login window) and potentially reopen it later.
  pub fn close(&self) {
    self.window.set_visible(false);
  }

  #[napi]
  /// Hides the window without destroying it.
  pub fn hide(&self) {
    self.window.set_visible(false);
  }

  #[napi]
  /// Shows the window if it was hidden.
  pub fn show(&self) {
    self.window.set_visible(true);
  }
}

//! Tao structs
//!
//! This module contains all structs from the tao crate.

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::sync::{Arc, Mutex};

use crate::tao::enums::{
  CursorIcon, ModifiersState, MouseButton, MouseButtonState, TaoTheme, WindowEvent,
};
use crate::tao::types::Result;

#[cfg(target_os = "macos")]
use tao::platform::macos::WindowBuilderExtMacOS;
#[cfg(any(
  target_os = "linux",
  target_os = "dragonfly",
  target_os = "freebsd",
  target_os = "netbsd",
  target_os = "openbsd"
))]
use tao::platform::unix::WindowBuilderExtUnix;
#[cfg(target_os = "windows")]
use tao::platform::windows::WindowBuilderExtWindows;

/// Forward declaration for MonitorInfo to avoid circular dependencies
#[napi(object)]
pub struct MonitorInfo {
  /// The name of monitor.
  pub name: Option<String>,
  /// The size of monitor.
  pub size: Size,
  /// The position of monitor.
  pub position: Position,
  /// The scale factor of monitor.
  pub scale_factor: f64,
}

/// 2D position.
#[napi(object)]
pub struct Position {
  /// The X coordinate.
  pub x: f64,
  /// The Y coordinate.
  pub y: f64,
}

/// 2D size.
#[napi(object)]
pub struct Size {
  /// The width.
  pub width: f64,
  /// The height.
  pub height: f64,
}

/// 2D rectangle.
#[napi(object)]
pub struct Rectangle {
  /// The position.
  pub origin: Position,
  /// The size.
  pub size: Size,
}

/// Window options for creating a window.
#[napi(object)]
pub struct WindowOptions {
  /// The title of window.
  pub title: String,
  /// The width of window.
  pub width: u32,
  /// The height of window.
  pub height: u32,
  /// The X position of window.
  pub x: Option<f64>,
  /// The Y position of window.
  pub y: Option<f64>,
  /// Whether window is resizable.
  pub resizable: bool,
  /// Whether window has a decorations.
  pub decorations: bool,
  /// Whether window is always on top.
  pub always_on_top: bool,
  /// Whether window is visible.
  pub visible: bool,
  /// Whether window is transparent.
  pub transparent: bool,
  /// Whether window is maximized.
  pub maximized: bool,
  /// Whether window is focused.
  pub focused: bool,
  /// Whether window has a menubar.
  pub menubar: bool,
  /// The icon of window.
  pub icon: Option<Buffer>,
  /// The theme of window.
  pub theme: Option<TaoTheme>,
}

/// Window size limits.
#[napi(object)]
pub struct WindowSizeConstraints {
  /// The minimum width.
  pub min_width: Option<u32>,
  /// The minimum height.
  pub min_height: Option<u32>,
  /// The maximum width.
  pub max_width: Option<u32>,
  /// The maximum height.
  pub max_height: Option<u32>,
}

/// Cursor position.
#[napi(object)]
pub struct CursorPosition {
  /// The X coordinate.
  pub x: f64,
  /// The Y coordinate.
  pub y: f64,
}

/// Mouse event data.
#[napi(object)]
pub struct MouseEvent {
  /// The button that was pressed/released.
  pub button: MouseButton,
  /// The state of button.
  pub state: MouseButtonState,
  /// The position of mouse.
  pub position: Position,
  /// The number of clicks.
  pub click_count: u16,
  /// The modifiers state.
  pub modifiers: ModifiersState,
}

/// Keyboard event data.
#[napi(object)]
pub struct KeyboardEvent {
  /// The key that was pressed.
  pub key: String,
  /// The key code.
  pub code: String,
  /// The key state.
  pub state: MouseButtonState,
  /// The modifiers state.
  pub modifiers: ModifiersState,
}

/// Raw keyboard event data.
#[napi(object)]
pub struct RawKeyEvent {
  /// The key code.
  pub key_code: u32,
  /// The key state.
  pub state: MouseButtonState,
  /// The modifiers state.
  pub modifiers: ModifiersState,
}

/// Touch event data.
#[napi(object)]
pub struct Touch {
  /// The touch identifier.
  pub id: u32,
  /// The position of touch.
  pub position: Position,
  /// The force of touch.
  pub force: Option<f64>,
  /// The device ID.
  pub device_id: u32,
}

/// Gesture event data.
#[napi(object)]
pub struct GestureEvent {
  /// The gesture type.
  pub gesture_type: String,
  /// The position of gesture.
  pub position: Position,
  /// The amount of gesture.
  pub amount: f64,
}

/// Window event data.
#[napi(object)]
pub struct WindowEventData {
  /// The window event type.
  pub event: WindowEvent,
  /// The window ID.
  pub window_id: u32,
}

/// HiDPI scaling information.
#[napi(object)]
pub struct HiDpiScaling {
  /// The scale factor.
  pub scale_factor: f64,
  /// The position in pixels.
  pub position_in_pixels: Position,
}

/// Theme change details.
#[napi(object)]
pub struct ThemeChangeDetails {
  /// The new theme.
  pub new_theme: TaoTheme,
}

/// Cursor icon change details.
#[napi(object)]
pub struct CursorChangeDetails {
  /// The new cursor icon.
  pub new_cursor: CursorIcon,
}

/// Window scale factor change details.
#[napi(object)]
pub struct ScaleFactorChangeDetails {
  /// The new scale factor.
  pub scale_factor: f64,
  /// The new inner size in logical pixels.
  pub new_inner_size: Size,
}

/// Window resize details.
#[napi(object)]
pub struct ResizeDetails {
  /// The new width.
  pub width: u32,
  /// The new height.
  pub height: u32,
}

/// Window drag details.
#[napi(object)]
pub struct WindowDragOptions {
  /// The window to drag.
  pub window_id: u32,
}

/// Window jump options.
#[napi(object)]
pub struct WindowJumpOptions {
  /// The window to jump.
  pub window_id: u32,
  /// The options to pass.
  pub options: Option<WindowOptions>,
}

/// Not supported error.
#[napi(object)]
pub struct NotSupportedError {
  /// The error message.
  pub message: String,
}

/// OS error.
#[napi(object)]
pub struct OsError {
  /// The OS error code.
  pub code: i32,
  /// The error message.
  pub message: String,
}

/// Video mode information.
#[napi(object)]
pub struct VideoMode {
  /// The size of video mode.
  pub size: Size,
  /// The bit depth.
  pub bit_depth: u16,
  /// The refresh rate.
  pub refresh_rate: u32,
}

/// Window attributes.
#[napi(object)]
pub struct WindowAttributes {
  /// The title of window.
  pub title: String,
  /// The width of window.
  pub width: u32,
  /// The height of window.
  pub height: u32,
  /// The X position of window.
  pub x: Option<f64>,
  /// The Y position of window.
  pub y: Option<f64>,
  /// Whether window is resizable.
  pub resizable: bool,
  /// Whether window has decorations.
  pub decorated: bool,
  /// Whether window is always on top.
  pub always_on_top: bool,
  /// Whether window is visible.
  pub visible: bool,
  /// Whether window is transparent.
  pub transparent: bool,
  /// Whether window is maximized.
  pub maximized: bool,
  /// Whether window is focused.
  pub focused: bool,
  /// Whether window has a menubar.
  pub menubar: bool,
  /// The icon of window.
  pub icon: Option<Buffer>,
  /// The theme of window.
  pub theme: Option<TaoTheme>,
}

/// Progress bar data from Tao.
#[napi(object)]
pub struct TaoProgressBar {
  /// The progress state.
  pub state: String,
  /// The progress value (0-100).
  pub progress: u32,
}

/// Icon data.
#[napi(object)]
pub struct Icon {
  /// The width of icon.
  pub width: u32,
  /// The height of icon.
  pub height: u32,
  /// The RGBA pixel data.
  pub rgba: Buffer,
}

/// Event loop for handling window events.
#[napi]
pub struct EventLoop {
  #[allow(dead_code)]
  pub(crate) inner: Option<tao::event_loop::EventLoop<()>>,
  #[allow(dead_code)]
  pub(crate) proxy: Option<tao::event_loop::EventLoopProxy<()>>,
}

#[napi]
impl EventLoop {
  /// Creates a new event loop.
  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    let event_loop = tao::event_loop::EventLoop::new();
    let proxy = event_loop.create_proxy();
    Ok(Self {
      inner: Some(event_loop),
      proxy: Some(proxy),
    })
  }

  /// Runs the event loop.
  #[napi]
  pub fn run(&mut self) -> Result<()> {
    if let Some(event_loop) = self.inner.take() {
      event_loop.run(move |event, _, control_flow| {
        *control_flow = tao::event_loop::ControlFlow::Wait;
        if let tao::event::Event::WindowEvent {
          event: tao::event::WindowEvent::CloseRequested,
          ..
        } = event
        {
          *control_flow = tao::event_loop::ControlFlow::Exit;
        }
      });
    }
    Ok(())
  }

  /// Runs a single iteration of the event loop.
  #[napi]
  pub fn run_iteration(&mut self) -> Result<bool> {
    let mut keep_running = true;
    if let Some(event_loop) = &mut self.inner {
      #[cfg(any(
        target_os = "linux",
        target_os = "dragonfly",
        target_os = "freebsd",
        target_os = "netbsd",
        target_os = "openbsd",
        target_os = "windows",
        target_os = "macos",
      ))]
      {
        use tao::platform::run_return::EventLoopExtRunReturn;
        event_loop.run_return(|event, _, control_flow| {
          *control_flow = tao::event_loop::ControlFlow::Poll;
          match event {
            tao::event::Event::WindowEvent {
              event: tao::event::WindowEvent::CloseRequested,
              ..
            } => {
              keep_running = false;
              *control_flow = tao::event_loop::ControlFlow::Exit;
            }
            tao::event::Event::RedrawEventsCleared => {
              *control_flow = tao::event_loop::ControlFlow::Exit;
            }
            _ => {}
          }
        });
      }
    }
    Ok(keep_running)
  }

  /// Creates an event loop proxy.
  #[napi]
  pub fn create_proxy(&self) -> Result<EventLoopProxy> {
    Ok(EventLoopProxy {
      inner: self.proxy.clone(),
    })
  }
}

/// Builder for creating event loops.
#[napi]
pub struct EventLoopBuilder {
  inner: Option<tao::event_loop::EventLoopBuilder<()>>,
}

#[napi]
impl EventLoopBuilder {
  /// Creates a new event loop builder.
  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Ok(Self {
      inner: Some(tao::event_loop::EventLoopBuilder::new()),
    })
  }

  /// Builds the event loop.
  #[napi]
  pub fn build(&mut self) -> Result<EventLoop> {
    let event_loop = self
      .inner
      .take()
      .ok_or_else(|| {
        napi::Error::new(
          napi::Status::GenericFailure,
          "EventLoopBuilder already consumed".to_string(),
        )
      })?
      .build();
    let proxy = event_loop.create_proxy();
    Ok(EventLoop {
      inner: Some(event_loop),
      proxy: Some(proxy),
    })
  }
}

/// Proxy for sending events to an event loop.
#[napi]
pub struct EventLoopProxy {
  #[allow(dead_code)]
  inner: Option<tao::event_loop::EventLoopProxy<()>>,
}

#[napi]
impl EventLoopProxy {
  /// Sends an event to the event loop.
  #[napi]
  pub fn send_event(&self) -> Result<()> {
    if let Some(proxy) = &self.inner {
      let _ = proxy.send_event(());
    }
    Ok(())
  }

  /// Wakes up the event loop.
  #[napi]
  pub fn wake_up(&self) -> Result<()> {
    if let Some(proxy) = &self.inner {
      let _ = proxy.send_event(());
    }
    Ok(())
  }
}

/// Target for event loop operations.
#[napi]
pub struct EventLoopWindowTarget {
  #[allow(dead_code)]
  inner: Option<tao::event_loop::EventLoopWindowTarget<()>>,
}

/// Window for displaying content.
#[napi]
pub struct Window {
  #[allow(dead_code)]
  pub(crate) inner: Option<Arc<Mutex<tao::window::Window>>>,
}

#[napi]
impl Window {
  /// Creates a new window with default attributes.
  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Ok(Self { inner: None })
  }

  /// Gets the window ID.
  #[napi(getter)]
  pub fn id(&self) -> Result<u64> {
    if let Some(inner) = &self.inner {
      let id = inner.lock().unwrap().id();
      let mut id_val: u64 = 0;
      unsafe {
        std::ptr::copy_nonoverlapping(
          &id as *const _ as *const u8,
          &mut id_val as *mut _ as *mut u8,
          std::mem::size_of_val(&id).min(8),
        );
      }
      Ok(id_val)
    } else {
      Ok(0)
    }
  }

  /// Gets the window title.
  #[napi]
  pub fn title(&self) -> Result<String> {
    if let Some(inner) = &self.inner {
      Ok(inner.lock().unwrap().title())
    } else {
      Ok(String::new())
    }
  }

  /// Sets the window title.
  #[napi]
  pub fn set_title(&self, title: String) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().set_title(&title);
    }
    Ok(())
  }

  /// Gets whether the window is visible.
  #[napi]
  pub fn is_visible(&self) -> Result<bool> {
    if let Some(inner) = &self.inner {
      Ok(inner.lock().unwrap().is_visible())
    } else {
      Ok(true)
    }
  }

  /// Sets whether the window is visible.
  #[napi]
  pub fn set_visible(&self, visible: bool) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().set_visible(visible);
    }
    Ok(())
  }

  /// Gets whether the window is resizable.
  #[napi]
  pub fn is_resizable(&self) -> Result<bool> {
    if let Some(inner) = &self.inner {
      Ok(inner.lock().unwrap().is_resizable())
    } else {
      Ok(true)
    }
  }

  /// Sets whether the window is resizable.
  #[napi]
  pub fn set_resizable(&self, resizable: bool) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().set_resizable(resizable);
    }
    Ok(())
  }

  /// Gets whether the window is decorated.
  #[napi]
  pub fn is_decorated(&self) -> Result<bool> {
    if let Some(inner) = &self.inner {
      Ok(inner.lock().unwrap().is_decorated())
    } else {
      Ok(true)
    }
  }

  /// Sets whether the window is decorated.
  #[napi]
  pub fn set_decorated(&self, decorated: bool) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().set_decorations(decorated);
    }
    Ok(())
  }

  /// Gets the window position.
  #[napi]
  pub fn outer_position(&self) -> Result<Position> {
    if let Some(inner) = &self.inner {
      let pos = inner.lock().unwrap().outer_position().ok();
      if let Some(physical_pos) = pos {
        Ok(Position {
          x: physical_pos.x as f64,
          y: physical_pos.y as f64,
        })
      } else {
        Ok(Position { x: 0.0, y: 0.0 })
      }
    } else {
      Ok(Position { x: 0.0, y: 0.0 })
    }
  }

  /// Sets the window position.
  #[napi]
  pub fn set_outer_position(&self, x: f64, y: f64) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner
        .lock()
        .unwrap()
        .set_outer_position(tao::dpi::PhysicalPosition::new(x as i32, y as i32));
    }
    Ok(())
  }

  /// Gets the window size.
  #[napi]
  pub fn inner_size(&self) -> Result<Size> {
    if let Some(inner) = &self.inner {
      let size = inner.lock().unwrap().inner_size();
      Ok(Size {
        width: size.width as f64,
        height: size.height as f64,
      })
    } else {
      Ok(Size {
        width: 800.0,
        height: 600.0,
      })
    }
  }

  /// Sets the window size.
  #[napi]
  pub fn set_inner_size(&self, width: f64, height: f64) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner
        .lock()
        .unwrap()
        .set_inner_size(tao::dpi::PhysicalSize::new(width as u32, height as u32));
    }
    Ok(())
  }

  /// Gets whether the window is maximized.
  #[napi]
  pub fn is_maximized(&self) -> Result<bool> {
    if let Some(inner) = &self.inner {
      Ok(inner.lock().unwrap().is_maximized())
    } else {
      Ok(false)
    }
  }

  /// Sets whether the window is maximized.
  #[napi]
  pub fn set_maximized(&self, maximized: bool) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().set_maximized(maximized);
    }
    Ok(())
  }

  /// Gets whether the window is minimized.
  #[napi]
  pub fn is_minimized(&self) -> Result<bool> {
    if let Some(inner) = &self.inner {
      Ok(inner.lock().unwrap().is_minimized())
    } else {
      Ok(false)
    }
  }

  /// Sets whether the window is minimized.
  #[napi]
  pub fn set_minimized(&self, minimized: bool) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().set_minimized(minimized);
    }
    Ok(())
  }

  /// Gets whether the window is always on top.
  #[napi]
  pub fn is_always_on_top(&self) -> Result<bool> {
    if let Some(inner) = &self.inner {
      Ok(inner.lock().unwrap().is_always_on_top())
    } else {
      Ok(false)
    }
  }

  /// Sets whether the window is always on top.
  #[napi]
  pub fn set_always_on_top(&self, always_on_top: bool) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().set_always_on_top(always_on_top);
    }
    Ok(())
  }

  /// Gets whether the window is focused.
  #[napi]
  pub fn is_focused(&self) -> Result<bool> {
    if let Some(inner) = &self.inner {
      Ok(inner.lock().unwrap().is_focused())
    } else {
      Ok(true)
    }
  }

  /// Requests the window to be focused.
  #[napi]
  pub fn request_focus(&self) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().set_focus();
    }
    Ok(())
  }

  /// Gets the current cursor icon.
  #[napi]
  pub fn cursor_icon(&self) -> Result<CursorIcon> {
    Ok(CursorIcon::Default)
  }

  /// Sets the cursor icon.
  #[napi]
  pub fn set_cursor_icon(&self, cursor: CursorIcon) -> Result<()> {
    if let Some(inner) = &self.inner {
      let tao_cursor = match cursor {
        CursorIcon::Default => tao::window::CursorIcon::Default,
        CursorIcon::Crosshair => tao::window::CursorIcon::Crosshair,
        CursorIcon::Hand => tao::window::CursorIcon::Hand,
        CursorIcon::Arrow => tao::window::CursorIcon::Arrow,
        CursorIcon::Move => tao::window::CursorIcon::Move,
        CursorIcon::Text => tao::window::CursorIcon::Text,
        CursorIcon::Wait => tao::window::CursorIcon::Wait,
        CursorIcon::Help => tao::window::CursorIcon::Help,
        CursorIcon::Progress => tao::window::CursorIcon::Progress,
        CursorIcon::NotAllowed => tao::window::CursorIcon::NotAllowed,
        CursorIcon::EastResize => tao::window::CursorIcon::EResize,
        CursorIcon::NorthResize => tao::window::CursorIcon::NResize,
        CursorIcon::NortheastResize => tao::window::CursorIcon::NeResize,
        CursorIcon::NorthwestResize => tao::window::CursorIcon::NwResize,
        CursorIcon::SouthResize => tao::window::CursorIcon::SResize,
        CursorIcon::SoutheastResize => tao::window::CursorIcon::SeResize,
        CursorIcon::SouthwestResize => tao::window::CursorIcon::SwResize,
        CursorIcon::WestResize => tao::window::CursorIcon::WResize,
        CursorIcon::NorthSouthResize => tao::window::CursorIcon::NsResize,
        CursorIcon::EastWestResize => tao::window::CursorIcon::EwResize,
        CursorIcon::NortheastSouthwestResize => tao::window::CursorIcon::NeswResize,
        CursorIcon::NorthwestSoutheastResize => tao::window::CursorIcon::NwseResize,
        CursorIcon::ColumnResize => tao::window::CursorIcon::ColResize,
        CursorIcon::RowResize => tao::window::CursorIcon::RowResize,
        CursorIcon::AllScroll => tao::window::CursorIcon::AllScroll,
        CursorIcon::ZoomIn => tao::window::CursorIcon::ZoomIn,
        CursorIcon::ZoomOut => tao::window::CursorIcon::ZoomOut,
      };
      inner.lock().unwrap().set_cursor_icon(tao_cursor);
    }
    Ok(())
  }

  /// Sets the cursor position.
  #[napi]
  pub fn set_cursor_position(&self, x: f64, y: f64) -> Result<()> {
    if let Some(inner) = &self.inner {
      let _ = inner
        .lock()
        .unwrap()
        .set_cursor_position(tao::dpi::Position::Physical(
          tao::dpi::PhysicalPosition::new(x as i32, y as i32),
        ));
    }
    Ok(())
  }

  /// Gets the cursor position.
  #[napi]
  pub fn cursor_position(&self) -> Result<Position> {
    if let Some(inner) = &self.inner {
      let pos = inner.lock().unwrap().cursor_position().ok();
      if let Some(physical_pos) = pos {
        Ok(Position {
          x: physical_pos.x,
          y: physical_pos.y,
        })
      } else {
        Ok(Position { x: 0.0, y: 0.0 })
      }
    } else {
      Ok(Position { x: 0.0, y: 0.0 })
    }
  }

  /// Drags the window.
  #[napi]
  pub fn drag_window(&self) -> Result<bool> {
    if let Some(inner) = &self.inner {
      Ok(inner.lock().unwrap().drag_window().is_ok())
    } else {
      Ok(false)
    }
  }

  /// Sets the window theme.
  #[napi]
  pub fn set_theme(&self, theme: TaoTheme) -> Result<()> {
    if let Some(inner) = &self.inner {
      let tao_theme = match theme {
        TaoTheme::Light => tao::window::Theme::Light,
        TaoTheme::Dark => tao::window::Theme::Dark,
      };
      inner.lock().unwrap().set_theme(Some(tao_theme));
    }
    Ok(())
  }

  /// Gets the window theme.
  #[napi]
  pub fn theme(&self) -> Result<Option<TaoTheme>> {
    if let Some(inner) = &self.inner {
      let theme = inner.lock().unwrap().theme();
      Ok(Some(match theme {
        tao::window::Theme::Light => TaoTheme::Light,
        tao::window::Theme::Dark => TaoTheme::Dark,
        _ => TaoTheme::Light,
      }))
    } else {
      Ok(None)
    }
  }

  /// Sets the window icon.
  #[napi]
  pub fn set_window_icon(&self, width: u32, height: u32, rgba: Buffer) -> Result<()> {
    if let Some(inner) = &self.inner {
      let icon = tao::window::Icon::from_rgba(rgba.to_vec(), width, height).map_err(|e| {
        napi::Error::new(napi::Status::GenericFailure, format!("Invalid icon: {}", e))
      })?;
      inner.lock().unwrap().set_window_icon(Some(icon));
    }
    Ok(())
  }

  /// Sets whether to ignore cursor events.
  #[napi]
  pub fn set_ignore_cursor_events(&self, ignore: bool) -> Result<()> {
    if let Some(inner) = &self.inner {
      let _ = inner.lock().unwrap().set_ignore_cursor_events(ignore);
    }
    Ok(())
  }

  /// Requests a redrawing of the window.
  #[napi]
  pub fn request_redraw(&self) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().request_redraw();
    }
    Ok(())
  }

  /// Closes the window.
  #[napi]
  pub fn close(&self) -> Result<()> {
    if let Some(inner) = &self.inner {
      inner.lock().unwrap().request_redraw();
    }
    Ok(())
  }
}

/// Builder for creating windows.
#[napi]
pub struct WindowBuilder {
  attributes: WindowAttributes,
  #[allow(dead_code)]
  inner: Option<tao::window::WindowBuilder>,
}

#[napi]
impl WindowBuilder {
  /// Creates a new window builder.
  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Ok(Self {
      attributes: WindowAttributes {
        title: String::from("Window"),
        width: 800,
        height: 600,
        x: None,
        y: None,
        resizable: true,
        decorated: true,
        always_on_top: false,
        visible: true,
        transparent: false,
        maximized: false,
        focused: true,
        menubar: true,
        icon: None,
        theme: None,
      },
      inner: None,
    })
  }

  /// Sets the window title.
  #[napi]
  pub fn with_title(&mut self, title: String) -> Result<&Self> {
    self.attributes.title = title;
    Ok(self)
  }

  /// Sets the window size.
  #[napi]
  pub fn with_inner_size(&mut self, width: u32, height: u32) -> Result<&Self> {
    self.attributes.width = width;
    self.attributes.height = height;
    Ok(self)
  }

  /// Sets the window position.
  #[napi]
  pub fn with_position(&mut self, x: f64, y: f64) -> Result<&Self> {
    self.attributes.x = Some(x);
    self.attributes.y = Some(y);
    Ok(self)
  }

  /// Sets whether the window is resizable.
  #[napi]
  pub fn with_resizable(&mut self, resizable: bool) -> Result<&Self> {
    self.attributes.resizable = resizable;
    Ok(self)
  }

  /// Sets whether the window has decorations.
  #[napi]
  pub fn with_decorated(&mut self, decorated: bool) -> Result<&Self> {
    self.attributes.decorated = decorated;
    Ok(self)
  }

  /// Sets whether the window is always on top.
  #[napi]
  pub fn with_always_on_top(&mut self, always_on_top: bool) -> Result<&Self> {
    self.attributes.always_on_top = always_on_top;
    Ok(self)
  }

  /// Sets whether the window is visible.
  #[napi]
  pub fn with_visible(&mut self, visible: bool) -> Result<&Self> {
    self.attributes.visible = visible;
    Ok(self)
  }

  /// Sets whether the window is transparent.
  #[napi]
  pub fn with_transparent(&mut self, transparent: bool) -> Result<&Self> {
    self.attributes.transparent = transparent;
    Ok(self)
  }

  /// Sets whether the window is maximized.
  #[napi]
  pub fn with_maximized(&mut self, maximized: bool) -> Result<&Self> {
    self.attributes.maximized = maximized;
    Ok(self)
  }

  /// Sets whether the window is focused.
  #[napi]
  pub fn with_focused(&mut self, focused: bool) -> Result<&Self> {
    self.attributes.focused = focused;
    Ok(self)
  }

  /// Sets whether the window has a menubar.
  #[napi]
  pub fn with_menubar(&mut self, menubar: bool) -> Result<&Self> {
    self.attributes.menubar = menubar;
    Ok(self)
  }

  /// Sets the window icon.
  #[napi]
  pub fn with_window_icon(&mut self, icon: Buffer) -> Result<&Self> {
    self.attributes.icon = Some(icon);
    Ok(self)
  }

  /// Sets the window theme.
  #[napi]
  pub fn with_theme(&mut self, theme: TaoTheme) -> Result<&Self> {
    self.attributes.theme = Some(theme);
    Ok(self)
  }

  /// Builds the window.
  #[napi]
  pub fn build(&mut self, event_loop: &EventLoop) -> Result<Window> {
    // Get the event loop reference
    let el = event_loop.inner.as_ref().ok_or_else(|| {
      napi::Error::new(
        napi::Status::GenericFailure,
        "Event loop already running or consumed".to_string(),
      )
    })?;
    println!(
      "Building window with transparency: {}",
      self.attributes.transparent
    );
    let mut builder = tao::window::WindowBuilder::new()
      .with_title(&self.attributes.title)
      .with_inner_size(tao::dpi::LogicalSize::new(
        self.attributes.width,
        self.attributes.height,
      ))
      .with_resizable(self.attributes.resizable)
      .with_decorations(self.attributes.decorated)
      .with_always_on_top(self.attributes.always_on_top)
      .with_visible(self.attributes.visible)
      .with_transparent(self.attributes.transparent);

    #[cfg(any(
      target_os = "linux",
      target_os = "dragonfly",
      target_os = "freebsd",
      target_os = "netbsd",
      target_os = "openbsd"
    ))]
    {
      if self.attributes.transparent {
        builder = builder.with_rgba_visual(true);
      }
    }
    #[cfg(target_os = "macos")]
    {
      if self.attributes.transparent {
        builder = builder
          .with_titlebar_transparent(true)
          .with_fullsize_content_view(true);
      }
    }
    #[cfg(target_os = "windows")]
    {
      if self.attributes.transparent {
        builder = builder.with_undecorated_shadow(false);
      }
    }
    builder = builder
      .with_maximized(self.attributes.maximized)
      .with_focused(self.attributes.focused);

    // Set position if provided
    if let Some(x) = self.attributes.x {
      if let Some(y) = self.attributes.y {
        builder = builder.with_position(tao::dpi::LogicalPosition::new(x, y));
      }
    }

    // Build the window
    let window = builder.build(el).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create window: {}", e),
      )
    })?;

    Ok(Window {
      inner: Some(Arc::new(Mutex::new(window))),
    })
  }
}

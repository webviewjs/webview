use std::cell::{Cell, RefCell};
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::{Arc, Mutex};

use crate::browser_window::BrowserWindow;
#[cfg(target_os = "android")]
use crate::tray::JsTrayIcon;
#[cfg(not(any(target_os = "android", target_os = "freebsd")))]
use crate::tray::{event_payload, JsTrayIcon, TrayEventHandler, TrayResource};
use crate::types::*;
use crate::web_context::{JsWebContext, WebContextOptions, WebContextResource};
use crate::webview::WebviewResource;
#[cfg(all(not(target_os = "android"), not(target_os = "freebsd")))]
use muda::Menu;
use napi::bindgen_prelude::*;
use napi::Result;
use napi_derive::napi;
#[cfg(not(target_os = "windows"))]
use winit::window::{Cursor, CursorIcon, ResizeDirection};
use winit::{
  application::ApplicationHandler,
  event::{ElementState, Ime, MouseButton, MouseScrollDelta, TouchPhase, WindowEvent},
  event_loop::{ActiveEventLoop, EventLoop},
  window::{Window, WindowId},
};

#[napi]
pub fn get_webview_version() -> Result<String> {
  wry::webview_version().map_err(|e| {
    napi::Error::new(
      napi::Status::GenericFailure,
      format!("Failed to get webview version: {}", e),
    )
  })
}

// ── Internal state ────────────────────────────────────────────────────────────

type WindowEventHandler = Rc<RefCell<Option<FunctionRef<WindowEventPayload, ()>>>>;
type WebviewLifecycles = Rc<RefCell<Vec<Rc<Cell<bool>>>>>;

fn dispatch_reentrant<T>(
  slot: &RefCell<Option<T>>,
  invoke: impl FnOnce(&T),
  should_restore: impl FnOnce() -> bool,
) {
  let handler = slot.borrow_mut().take();
  if let Some(handler) = handler {
    invoke(&handler);
    if should_restore() && slot.borrow().is_none() {
      slot.borrow_mut().replace(handler);
    }
  }
}

struct AppState {
  handler: Rc<RefCell<Option<FunctionRef<ApplicationEvent, ()>>>>,
  env: Env,
  should_exit: bool,
  ready: bool,
  /// Tracks open windows so we can hide them on close without dropping BrowserWindow.
  windows: HashMap<WindowId, Arc<Window>>,
  /// Shared handle into each BrowserWindow's webview list.  Winit swallows
  /// WM_SIZE without forwarding to wry's subclass proc, so we resize manually
  /// when WindowEvent::Resized arrives.
  webviews: HashMap<WindowId, Rc<RefCell<Vec<WebviewResource>>>>,
  /// Per-window event handlers shared with each BrowserWindow instance.
  window_handlers: HashMap<WindowId, WindowEventHandler>,
  window_lifecycles: HashMap<WindowId, Rc<Cell<bool>>>,
  webview_lifecycles: HashMap<WindowId, WebviewLifecycles>,
  /// Last known physical cursor position per window (for edge-resize hit testing).
  cursor_positions: HashMap<WindowId, (f64, f64)>,
  /// Last known modifier state.
  current_modifiers: winit::event::Modifiers,
  #[cfg(not(target_os = "android"))]
  menu_event_receiver: Option<muda::MenuEventReceiver>,
  #[cfg(not(any(target_os = "android", target_os = "freebsd")))]
  tray_handlers: HashMap<String, TrayEventHandler>,
  #[cfg(not(any(target_os = "android", target_os = "freebsd")))]
  tray_resources: Vec<TrayResource>,
  web_contexts: Vec<WebContextResource>,
}

impl AppState {
  fn shutdown(&mut self) {
    if self.should_exit {
      return;
    }
    #[cfg(not(any(target_os = "android", target_os = "freebsd")))]
    {
      for resource in self.tray_resources.drain(..) {
        resource.borrow_mut().take();
      }
      self.tray_handlers.clear();
    }
    for views in self.webviews.values() {
      for resource in views.borrow().iter() {
        if let Some(view) = resource.borrow_mut().take() {
          let _ = view.set_visible(false);
        }
      }
    }
    for win in self.windows.values() {
      win.set_visible(false);
    }
    self.windows.clear();
    self.webviews.clear();
    for handler in self.window_handlers.values() {
      handler.borrow_mut().take();
    }
    self.window_handlers.clear();
    for lifecycle in self.window_lifecycles.values() {
      lifecycle.set(true);
    }
    self.window_lifecycles.clear();
    for lifecycles in self.webview_lifecycles.values() {
      for lifecycle in lifecycles.borrow().iter() {
        lifecycle.set(true);
      }
      lifecycles.borrow_mut().clear();
    }
    self.webview_lifecycles.clear();
    self.cursor_positions.clear();
    for context in self.web_contexts.drain(..) {
      context.borrow_mut().take();
    }
    self.handler.borrow_mut().take();
    #[cfg(not(target_os = "android"))]
    {
      self.menu_event_receiver = None;
    }
    self.should_exit = true;
  }

  fn fire(&self, event: ApplicationEvent) {
    dispatch_reentrant(
      &self.handler,
      |f| {
        if let Ok(func) = f.borrow_back(&self.env) {
          let _ = func.call(event);
        }
      },
      || !self.should_exit,
    );
  }

  fn fire_window_event(&self, window_id: WindowId, payload: WindowEventPayload) {
    let Some(handler) = self.window_handlers.get(&window_id).cloned() else {
      return;
    };
    let lifecycle = self.window_lifecycles.get(&window_id).cloned();
    dispatch_reentrant(
      &handler,
      |f| {
        if let Ok(func) = f.borrow_back(&self.env) {
          let _ = func.call(payload);
        }
      },
      || !self.should_exit && lifecycle.is_none_or(|disposed| !disposed.get()),
    );
  }
}

#[cfg(not(target_os = "windows"))]
fn resize_direction(
  x: f64,
  y: f64,
  width: f64,
  height: f64,
  border: f64,
) -> Option<ResizeDirection> {
  let left = x < border;
  let right = x > width - border;
  let top = y < border;
  let bottom = y > height - border;

  match (left, right, top, bottom) {
    (true, _, true, _) => Some(ResizeDirection::NorthWest),
    (_, true, true, _) => Some(ResizeDirection::NorthEast),
    (true, _, _, true) => Some(ResizeDirection::SouthWest),
    (_, true, _, true) => Some(ResizeDirection::SouthEast),
    (true, _, _, _) => Some(ResizeDirection::West),
    (_, true, _, _) => Some(ResizeDirection::East),
    (_, _, true, _) => Some(ResizeDirection::North),
    (_, _, _, true) => Some(ResizeDirection::South),
    _ => None,
  }
}

#[cfg(not(target_os = "windows"))]
fn cursor_for_resize_dir(dir: &ResizeDirection) -> CursorIcon {
  match dir {
    ResizeDirection::North | ResizeDirection::South => CursorIcon::NsResize,
    ResizeDirection::East | ResizeDirection::West => CursorIcon::EwResize,
    ResizeDirection::NorthEast | ResizeDirection::SouthWest => CursorIcon::NeswResize,
    ResizeDirection::NorthWest | ResizeDirection::SouthEast => CursorIcon::NwseResize,
  }
}

fn modifiers_bits(mods: &winit::event::Modifiers) -> u32 {
  let s = mods.state();
  let mut bits = 0u32;
  if s.shift_key() {
    bits |= 1;
  }
  if s.control_key() {
    bits |= 2;
  }
  if s.alt_key() {
    bits |= 4;
  }
  if s.super_key() {
    bits |= 8;
  }
  bits
}

fn logical_key_name(key: &winit::keyboard::Key) -> Option<String> {
  match key {
    winit::keyboard::Key::Character(c) => Some(c.as_str().to_owned()),
    winit::keyboard::Key::Named(named) => Some(match named {
      winit::keyboard::NamedKey::Space => " ".to_owned(),
      winit::keyboard::NamedKey::Super => "Meta".to_owned(),
      other => format!("{:?}", other),
    }),
    winit::keyboard::Key::Dead(Some(c)) => Some(format!("Dead({})", c)),
    _ => None,
  }
}

fn physical_key_code(key: &winit::keyboard::PhysicalKey) -> Option<String> {
  match key {
    winit::keyboard::PhysicalKey::Code(code) => Some(format!("{:?}", code)),
    winit::keyboard::PhysicalKey::Unidentified(_) => None,
  }
}

// ── ApplicationHandler ────────────────────────────────────────────────────────

struct AppHandler<'a>(&'a mut AppState);

impl ApplicationHandler for AppHandler<'_> {
  fn resumed(&mut self, _event_loop: &ActiveEventLoop) {
    let state = &mut *self.0;
    if !state.ready {
      state.ready = true;
      state.fire(ApplicationEvent {
        event: WebviewApplicationEvent::Ready,
        custom_menu_event: None,
      });
    }
  }

  fn window_event(
    &mut self,
    _event_loop: &ActiveEventLoop,
    window_id: WindowId,
    event: WindowEvent,
  ) {
    let state = &mut self.0;
    if state.should_exit {
      return;
    }

    match event {
      WindowEvent::Resized(new_size) => {
        if let Some(views) = state.webviews.get(&window_id) {
          let rect = wry::Rect {
            position: ::dpi::PhysicalPosition::new(0_i32, 0_i32).into(),
            size: ::dpi::PhysicalSize::new(new_size.width, new_size.height).into(),
          };
          for resource in views.borrow().iter() {
            if let Some(webview) = resource.borrow().as_ref() {
              let _ = webview.set_bounds(rect);
            }
          }
        }
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::Resized,
            width: Some(new_size.width),
            height: Some(new_size.height),
            x: None,
            y: None,
            button: None,
            delta_x: None,
            delta_y: None,
            key: None,
            code: None,
            modifiers: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::Moved(pos) => {
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::Moved,
            x: Some(pos.x as f64),
            y: Some(pos.y as f64),
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            key: None,
            code: None,
            modifiers: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::CloseRequested => {
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::CloseRequested,
            x: None,
            y: None,
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            key: None,
            code: None,
            modifiers: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
        if let Some(win) = state.windows.remove(&window_id) {
          win.set_visible(false);
        }
        state.cursor_positions.remove(&window_id);
        state.fire(ApplicationEvent {
          event: WebviewApplicationEvent::WindowCloseRequested,
          custom_menu_event: None,
        });
        if state.windows.is_empty() {
          state.fire(ApplicationEvent {
            event: WebviewApplicationEvent::ApplicationCloseRequested,
            custom_menu_event: None,
          });
          state.shutdown();
        }
      }
      WindowEvent::Focused(focused) => {
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: if focused {
              WindowEventType::Focused
            } else {
              WindowEventType::Blurred
            },
            x: None,
            y: None,
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            key: None,
            code: None,
            modifiers: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::CursorEntered { .. } => {
        let pos = state.cursor_positions.get(&window_id).copied();
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::MouseEnter,
            x: pos.map(|p| p.0),
            y: pos.map(|p| p.1),
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            key: None,
            code: None,
            modifiers: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::CursorLeft { .. } => {
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::MouseLeave,
            x: None,
            y: None,
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            key: None,
            code: None,
            modifiers: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::CursorMoved { position, .. } => {
        let (cx, cy) = (position.x, position.y);
        state.cursor_positions.insert(window_id, (cx, cy));

        // For undecorated+resizable windows, update cursor icon near edges.
        // On Windows this is handled by the WM_NCHITTEST subclass instead
        // (WebView2 consumes mouse events before winit sees them).
        #[cfg(not(target_os = "windows"))]
        if let Some(win) = state.windows.get(&window_id) {
          if !win.is_decorated() && win.is_resizable() {
            let size = win.inner_size();
            let border = 6.0 * win.scale_factor();
            if let Some(dir) =
              resize_direction(cx, cy, size.width as f64, size.height as f64, border)
            {
              win.set_cursor(Cursor::Icon(cursor_for_resize_dir(&dir)));
            } else {
              win.set_cursor(Cursor::Icon(CursorIcon::Default));
            }
          }
        }

        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::MouseMove,
            x: Some(cx),
            y: Some(cy),
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            key: None,
            code: None,
            modifiers: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::MouseInput {
        state: btn_state,
        button,
        ..
      } => {
        let btn_index = match button {
          MouseButton::Left => 0u32,
          MouseButton::Middle => 1u32,
          MouseButton::Right => 2u32,
          _ => 3u32,
        };

        // For undecorated+resizable windows, initiate drag-resize on left press near edges.
        // On Windows this is handled by the WM_NCHITTEST subclass instead.
        #[cfg(not(target_os = "windows"))]
        if btn_state == ElementState::Pressed && button == MouseButton::Left {
          if let (Some(win), Some(&(cx, cy))) = (
            state.windows.get(&window_id),
            state.cursor_positions.get(&window_id),
          ) {
            if !win.is_decorated() && win.is_resizable() {
              let size = win.inner_size();
              let border = 6.0 * win.scale_factor();
              if let Some(dir) =
                resize_direction(cx, cy, size.width as f64, size.height as f64, border)
              {
                let _ = win.drag_resize_window(dir);
                return;
              }
            }
          }
        }

        let pos = state.cursor_positions.get(&window_id).copied();
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: if btn_state == ElementState::Pressed {
              WindowEventType::MouseDown
            } else {
              WindowEventType::MouseUp
            },
            x: pos.map(|p| p.0),
            y: pos.map(|p| p.1),
            button: Some(btn_index),
            width: None,
            height: None,
            delta_x: None,
            delta_y: None,
            modifiers: Some(modifiers_bits(&state.current_modifiers)),
            key: None,
            code: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::MouseWheel { delta, .. } => {
        let (dx, dy) = match delta {
          MouseScrollDelta::LineDelta(x, y) => (x as f64 * 20.0, y as f64 * 20.0),
          MouseScrollDelta::PixelDelta(pos) => (pos.x, pos.y),
        };
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::Scroll,
            delta_x: Some(dx),
            delta_y: Some(dy),
            x: None,
            y: None,
            width: None,
            height: None,
            button: None,
            key: None,
            code: None,
            modifiers: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::ModifiersChanged(mods) => {
        state.current_modifiers = mods;
      }
      WindowEvent::KeyboardInput {
        event: ref key_event,
        ..
      } => {
        let mods = modifiers_bits(&state.current_modifiers);
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: if key_event.state == ElementState::Pressed {
              WindowEventType::KeyDown
            } else {
              WindowEventType::KeyUp
            },
            key: logical_key_name(&key_event.logical_key),
            code: physical_key_code(&key_event.physical_key),
            modifiers: Some(mods),
            is_repeat: Some(key_event.repeat),
            x: None,
            y: None,
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            files: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::Ime(ime) => {
        let (text, phase) = match &ime {
          Ime::Enabled => (None, Some("enabled".to_owned())),
          Ime::Preedit(t, _) => (Some(t.clone()), Some("preedit".to_owned())),
          Ime::Commit(t) => (Some(t.clone()), Some("commit".to_owned())),
          Ime::Disabled => (None, Some("disabled".to_owned())),
        };
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::Ime,
            text,
            phase,
            x: None,
            y: None,
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            modifiers: None,
            key: None,
            code: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            touch_id: None,
          },
        );
      }
      WindowEvent::DroppedFile(path) => {
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::FileDrop,
            files: Some(vec![path.to_string_lossy().into_owned()]),
            x: None,
            y: None,
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            modifiers: None,
            key: None,
            code: None,
            is_repeat: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::HoveredFile(path) => {
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::FileHover,
            files: Some(vec![path.to_string_lossy().into_owned()]),
            x: None,
            y: None,
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            modifiers: None,
            key: None,
            code: None,
            is_repeat: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::HoveredFileCancelled => {
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::FileHoverCancelled,
            x: None,
            y: None,
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            modifiers: None,
            key: None,
            code: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::ScaleFactorChanged { scale_factor, .. } => {
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::ScaleFactorChanged,
            scale_factor: Some(scale_factor),
            x: None,
            y: None,
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            modifiers: None,
            key: None,
            code: None,
            is_repeat: None,
            files: None,
            text: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::ThemeChanged(theme) => {
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::ThemeChanged,
            text: Some(match theme {
              winit::window::Theme::Light => "light".to_owned(),
              winit::window::Theme::Dark => "dark".to_owned(),
            }),
            x: None,
            y: None,
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            modifiers: None,
            key: None,
            code: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            touch_id: None,
            phase: None,
          },
        );
      }
      WindowEvent::Touch(touch) => {
        let phase_str = match touch.phase {
          TouchPhase::Started => "started",
          TouchPhase::Moved => "moved",
          TouchPhase::Ended => "ended",
          TouchPhase::Cancelled => "cancelled",
        };
        state.fire_window_event(
          window_id,
          WindowEventPayload {
            event: WindowEventType::Touch,
            x: Some(touch.location.x),
            y: Some(touch.location.y),
            touch_id: Some(touch.id as f64),
            phase: Some(phase_str.to_owned()),
            width: None,
            height: None,
            button: None,
            delta_x: None,
            delta_y: None,
            modifiers: None,
            key: None,
            code: None,
            is_repeat: None,
            files: None,
            scale_factor: None,
            text: None,
          },
        );
      }
      _ => {}
    }
  }
}

// ── NAPI Application ──────────────────────────────────────────────────────────

#[napi]
pub struct Application {
  event_loop: Option<EventLoop<()>>,
  state: AppState,
  #[cfg(not(target_os = "android"))]
  global_menu: Rc<RefCell<Option<Menu>>>,
  window_ids: Arc<Mutex<HashMap<String, u32>>>,
}

#[napi]
impl Application {
  #[napi(constructor)]
  pub fn new(env: Env, _options: Option<ApplicationOptions>) -> Result<Self> {
    // On macOS, disable winit's built-in default menu so it doesn't overwrite
    // the muda-managed menu bar on the first pump iteration.
    #[cfg(target_os = "macos")]
    let event_loop = {
      use winit::platform::macos::EventLoopBuilderExtMacOS;
      EventLoop::builder()
        .with_default_menu(false)
        .build()
        .map_err(|e| {
          napi::Error::new(
            napi::Status::GenericFailure,
            format!("Failed to create event loop: {}", e),
          )
        })?
    };
    #[cfg(not(target_os = "macos"))]
    let event_loop = EventLoop::new().map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create event loop: {}", e),
      )
    })?;

    // On macOS install a default app menu immediately so the menu bar is
    // functional from the start.  Store it in global_menu so the ObjC delegate
    // is kept alive (it would be freed if the Menu were dropped here).
    // set_menu() will replace this with the user-supplied menu.
    #[cfg(not(target_os = "android"))]
    let initial_global_menu: Option<Menu> = {
      #[cfg(target_os = "macos")]
      {
        Some(crate::menu::make_default_macos_menu())
      }
      #[cfg(not(target_os = "macos"))]
      {
        None
      }
    };

    Ok(Self {
      event_loop: Some(event_loop),
      state: AppState {
        handler: Rc::new(RefCell::new(None)),
        env,
        should_exit: false,
        ready: false,
        windows: HashMap::new(),
        webviews: HashMap::new(),
        window_handlers: HashMap::new(),
        window_lifecycles: HashMap::new(),
        webview_lifecycles: HashMap::new(),
        cursor_positions: HashMap::new(),
        current_modifiers: winit::event::Modifiers::default(),
        #[cfg(not(target_os = "android"))]
        menu_event_receiver: {
          // On macOS we always have a menu from startup so start receiving events
          // immediately.  On other platforms the receiver is set when set_menu is called.
          #[cfg(target_os = "macos")]
          {
            Some(muda::MenuEvent::receiver().clone())
          }
          #[cfg(not(target_os = "macos"))]
          {
            None
          }
        },
        #[cfg(not(any(target_os = "android", target_os = "freebsd")))]
        tray_handlers: HashMap::new(),
        #[cfg(not(any(target_os = "android", target_os = "freebsd")))]
        tray_resources: Vec::new(),
        web_contexts: Vec::new(),
      },
      #[cfg(not(target_os = "android"))]
      global_menu: Rc::new(RefCell::new(initial_global_menu)),
      window_ids: Arc::new(Mutex::new(HashMap::new())),
    })
  }

  #[napi]
  pub fn on_event(&mut self, handler: Option<FunctionRef<ApplicationEvent, ()>>) {
    *self.state.handler.borrow_mut() = handler;
  }

  #[napi]
  pub fn bind(&mut self, handler: Option<FunctionRef<ApplicationEvent, ()>>) {
    *self.state.handler.borrow_mut() = handler;
  }

  #[napi]
  pub fn is_ready(&self) -> bool {
    self.state.ready
  }

  #[napi]
  pub fn exit(&mut self) {
    self.state.shutdown();
    #[cfg(not(target_os = "android"))]
    self.global_menu.borrow_mut().take();
    if let Ok(mut ids) = self.window_ids.lock() {
      ids.clear();
    }
  }

  #[napi]
  /// Creates a new WebContext with the given options.
  pub fn create_web_context(&mut self, options: Option<WebContextOptions>) -> Result<JsWebContext> {
    if self.state.should_exit {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "Application has been disposed",
      ));
    }
    let context = JsWebContext::create(options);
    self.state.web_contexts.push(context.resource());
    Ok(context)
  }

  #[napi]
  pub fn create_tray_icon(&mut self, options: TrayIconOptions) -> Result<JsTrayIcon> {
    if self.state.should_exit {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "Application has been disposed",
      ));
    }
    let tray = JsTrayIcon::create(options)?;
    #[cfg(not(any(target_os = "android", target_os = "freebsd")))]
    {
      self
        .state
        .tray_handlers
        .insert(tray.id(), tray.event_handler());
      self.state.tray_resources.push(tray.resource());
      self.state.menu_event_receiver = Some(muda::MenuEvent::receiver().clone());
    }
    Ok(tray)
  }

  #[napi]
  pub fn create_browser_window(
    &mut self,
    options: Option<BrowserWindowOptions>,
  ) -> Result<BrowserWindow> {
    if self.state.should_exit {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "Application has been disposed",
      ));
    }
    let event_loop = self.event_loop.as_ref().ok_or_else(|| {
      napi::Error::new(
        napi::Status::GenericFailure,
        "Event loop is not initialized",
      )
    })?;

    #[allow(unused_mut)]
    let mut window_options = options.unwrap_or_default();
    #[cfg(not(target_os = "android"))]
    if window_options.menu.is_none() && self.global_menu.borrow().is_some() {
      window_options.show_menu = Some(true);
    }

    #[cfg(not(target_os = "android"))]
    let window = BrowserWindow::new(
      event_loop,
      Some(window_options),
      false,
      self.global_menu.clone(),
    )?;
    #[cfg(target_os = "android")]
    let window = BrowserWindow::new(
      event_loop,
      Some(window_options),
      false,
      Rc::new(RefCell::new(None)),
    )?;

    if let Ok(mut ids) = self.window_ids.lock() {
      ids.insert(format!("{:?}", window.winit_window_id()), window.id());
    }

    // Track the window so pump_events can hide it on CloseRequested and resize
    // its webviews on Resized (winit bypasses wry's WM_SIZE subclass proc).
    let wid = window.winit_window_id();
    self.state.windows.insert(wid, Arc::clone(&window.window));
    self.state.webviews.insert(wid, window.webviews_shared());
    self
      .state
      .window_handlers
      .insert(wid, window.event_handler_shared());
    self
      .state
      .window_lifecycles
      .insert(wid, window.lifecycle_shared());
    self
      .state
      .webview_lifecycles
      .insert(wid, window.webview_lifecycles_shared());

    Ok(window)
  }

  #[napi]
  pub fn create_child_browser_window(
    &mut self,
    options: Option<BrowserWindowOptions>,
  ) -> Result<BrowserWindow> {
    if self.state.should_exit {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "Application has been disposed",
      ));
    }
    let event_loop = self.event_loop.as_ref().ok_or_else(|| {
      napi::Error::new(
        napi::Status::GenericFailure,
        "Event loop is not initialized",
      )
    })?;

    #[cfg(not(target_os = "android"))]
    let window = BrowserWindow::new(event_loop, options, true, self.global_menu.clone())?;
    #[cfg(target_os = "android")]
    let window = BrowserWindow::new(event_loop, options, true, Rc::new(RefCell::new(None)))?;

    let wid = window.winit_window_id();
    self.state.windows.insert(wid, Arc::clone(&window.window));
    self.state.webviews.insert(wid, window.webviews_shared());
    self
      .state
      .window_handlers
      .insert(wid, window.event_handler_shared());
    self
      .state
      .window_lifecycles
      .insert(wid, window.lifecycle_shared());
    self
      .state
      .webview_lifecycles
      .insert(wid, window.webview_lifecycles_shared());

    Ok(window)
  }

  #[napi]
  pub fn set_menu(&mut self, menu_options: Option<MenuOptions>) -> Result<()> {
    if self.state.should_exit {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "Application has been disposed",
      ));
    }
    #[cfg(not(target_os = "android"))]
    {
      if let Some(options) = menu_options {
        let m = crate::menu::create_menu_from_options(options)?;
        #[cfg(target_os = "macos")]
        m.init_for_nsapp();
        self.state.menu_event_receiver = Some(muda::MenuEvent::receiver().clone());
        *self.global_menu.borrow_mut() = Some(m);
      } else {
        // On macOS restoring the default menu keeps the app menu bar functional.
        #[cfg(target_os = "macos")]
        {
          let default_menu = crate::menu::make_default_macos_menu();
          *self.global_menu.borrow_mut() = Some(default_menu);
          // Keep the receiver — menu events can still arrive from predefined items.
        }
        #[cfg(not(target_os = "macos"))]
        {
          *self.global_menu.borrow_mut() = None;
          self.state.menu_event_receiver = None;
        }
      }
    }
    #[cfg(target_os = "android")]
    let _ = menu_options;
    Ok(())
  }

  /// Pump the winit event loop once without blocking. Returns `true` while
  /// the app is alive, `false` when it should stop. Drive this from a JS
  /// `setInterval` via the `run()` wrapper in `index.js`.
  #[napi]
  pub fn pump_events(&mut self) -> bool {
    use winit::platform::pump_events::EventLoopExtPumpEvents;

    if self.state.should_exit {
      return false;
    }

    // Drain menu events before pumping the window event loop.
    #[cfg(not(target_os = "android"))]
    {
      if let Some(rx) = &self.state.menu_event_receiver {
        while let Ok(ev) = rx.try_recv() {
          self.state.fire(ApplicationEvent {
            event: WebviewApplicationEvent::CustomMenuClick,
            custom_menu_event: Some(CustomMenuEvent {
              id: ev.id().0.clone(),
              window_id: 0,
            }),
          });
        }
      }
    }

    #[cfg(not(any(target_os = "android", target_os = "freebsd")))]
    while let Ok(event) = tray_icon::TrayIconEvent::receiver().try_recv() {
      if let Some(handler) = self.state.tray_handlers.get(&event.id().0) {
        let callback = handler.borrow();
        if let Some(callback) = callback.as_ref() {
          if let Ok(function) = callback.borrow_back(&self.state.env) {
            if let Some(payload) = event_payload(event) {
              let _ = function.call(payload);
            }
          }
        }
      }
    }

    // Split borrows so the handler can mutate state independently.
    let event_loop = match &mut self.event_loop {
      Some(el) => el,
      None => return false,
    };
    let state = &mut self.state;

    // Never call event_loop.exit() — doing so permanently marks the runner as
    // exited until reset_runner() fires, which can cause the next pump to
    // re-emit Init/Resumed and confuse the state machine.  Instead we
    // hide windows and let the JS side stop the interval when we return false.
    event_loop.pump_app_events(Some(std::time::Duration::ZERO), &mut AppHandler(state));

    !state.should_exit
  }

  /// Run the application event loop.
  #[napi]
  pub fn run(&mut self, _options: Option<ApplicationRunOptions>) -> Result<()> {
    // Note: this is intentionally no-op in rust. The binding loader file patches this to call `pump_events()` in a `setInterval` loop.
    Ok(())
  }
}

impl Drop for Application {
  fn drop(&mut self) {
    self.exit();
  }
}

#[cfg(test)]
mod tests {
  use super::dispatch_reentrant;
  use std::cell::RefCell;

  #[test]
  fn reentrant_dispatch_allows_callback_to_clear_its_slot() {
    let slot = RefCell::new(Some(1));

    dispatch_reentrant(
      &slot,
      |value| {
        assert_eq!(*value, 1);
        slot.borrow_mut().take();
      },
      || false,
    );

    assert!(slot.borrow().is_none());
  }

  #[test]
  fn reentrant_dispatch_preserves_a_replacement_callback() {
    let slot = RefCell::new(Some(1));

    dispatch_reentrant(
      &slot,
      |_| {
        slot.borrow_mut().replace(2);
      },
      || true,
    );

    assert_eq!(*slot.borrow(), Some(2));
  }
}

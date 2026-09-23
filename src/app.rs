use std::cell::{Cell, RefCell};
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::{Arc, Mutex};

use crate::browser_window::{BrowserWindow, WindowCloseState, WindowResource};
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
use tao::{
  event::{ElementState, MouseButton, MouseScrollDelta, TouchPhase, WindowEvent},
  event_loop::{DeviceEventFilter, EventLoop},
  keyboard::{Key, KeyCode, ModifiersState},
  window::WindowId,
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
  exit_requested: bool,
  ready: bool,
  /// Shared disposable native window resources tracked by the event loop.
  windows: HashMap<WindowId, WindowResource>,
  /// Shared handle into each BrowserWindow's webview list.  Tao swallows
  /// WM_SIZE without forwarding to wry's subclass proc, so we resize manually
  /// when WindowEvent::Resized arrives.
  webviews: HashMap<WindowId, Rc<RefCell<Vec<WebviewResource>>>>,
  /// Per-window event handlers shared with each BrowserWindow instance.
  window_handlers: HashMap<WindowId, WindowEventHandler>,
  /// Close-request cancellation state shared with each BrowserWindow.
  window_close_states: HashMap<WindowId, WindowCloseState>,
  window_lifecycles: HashMap<WindowId, Rc<Cell<bool>>>,
  webview_lifecycles: HashMap<WindowId, WebviewLifecycles>,
  /// Last known physical cursor position per window (for edge-resize hit testing).
  cursor_positions: HashMap<WindowId, (f64, f64)>,
  /// Last known modifier state.
  current_modifiers: ModifiersState,
  #[cfg(not(target_os = "android"))]
  menu_event_receiver: Option<muda::MenuEventReceiver>,
  #[cfg(not(any(target_os = "android", target_os = "freebsd")))]
  tray_handlers: HashMap<String, TrayEventHandler>,
  #[cfg(not(any(target_os = "android", target_os = "freebsd")))]
  tray_resources: Vec<TrayResource>,
  web_contexts: Vec<WebContextResource>,
}

impl AppState {
  fn begin_close_window(&mut self, window_id: WindowId) {
    if let Some(views) = self.webviews.get(&window_id) {
      for resource in views.borrow().iter() {
        resource.borrow_mut().take();
      }
    }
    if let Some(resource) = self.windows.get(&window_id) {
      resource.borrow_mut().take();
    }
  }

  fn finish_destroyed_window(&mut self, window_id: WindowId) {
    self.windows.remove(&window_id);
    self.webviews.remove(&window_id);
    self.window_close_states.remove(&window_id);

    if let Some(handler) = self.window_handlers.remove(&window_id) {
      handler.borrow_mut().take();
    }

    if let Some(lifecycle) = self.window_lifecycles.remove(&window_id) {
      lifecycle.set(true);
    }

    if let Some(lifecycles) = self.webview_lifecycles.remove(&window_id) {
      for lifecycle in lifecycles.borrow().iter() {
        lifecycle.set(true);
      }
      lifecycles.borrow_mut().clear();
    }

    self.cursor_positions.remove(&window_id);
  }

  fn finalize_shutdown(&mut self) {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

fn modifiers_bits(mods: &ModifiersState) -> u32 {
  let mut bits = 0u32;
  if mods.shift_key() {
    bits |= 1;
  }
  if mods.control_key() {
    bits |= 2;
  }
  if mods.alt_key() {
    bits |= 4;
  }
  if mods.super_key() {
    bits |= 8;
  }
  bits
}

fn logical_key_name(key: &Key<'_>) -> Option<String> {
  match key {
    Key::Character(c) => Some(c.to_string()),
    Key::Dead(Some(c)) => Some(format!("Dead({})", c)),
    _ => Some(format!("{:?}", key)),
  }
}

fn physical_key_code(key: &KeyCode) -> Option<String> {
  Some(format!("{:?}", key))
}

// ── Window event dispatch (moved out of ApplicationHandler) ───────────────────

fn handle_window_event(state: &mut AppState, window_id: WindowId, event: WindowEvent) {
  if state.should_exit {
    return;
  }

  match event {
    WindowEvent::Resized(new_size) => {
      #[cfg(not(target_os = "linux"))]
      {
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
      }
      state.fire_window_event(
        window_id,
        WindowEventPayload {
          event: WindowEventType::Resized.name().to_owned(),
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
          event: WindowEventType::Moved.name().to_owned(),
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
      let close_state = state.window_close_states.get(&window_id).cloned();
      if let Some(close_state) = close_state.as_ref() {
        close_state.begin();
      }

      state.fire_window_event(
        window_id,
        WindowEventPayload {
          event: WindowEventType::CloseRequested.name().to_owned(),
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

      // A BrowserWindow close listener can veto this request synchronously.
      // Do not fire the legacy application-level close notification or take
      // any native resources when the request was canceled. The native Tao
      // handlers already consume the platform close request, so the window
      // remains available for hide/show on every supported desktop backend.
      if close_state.is_some_and(|state| state.finish()) {
        return;
      }

      state.fire(ApplicationEvent {
        event: WebviewApplicationEvent::WindowCloseRequested
          .name()
          .to_owned(),
        custom_menu_event: None,
      });

      state.begin_close_window(window_id);
    }
    WindowEvent::Destroyed => {
      state.finish_destroyed_window(window_id);
      if state.windows.is_empty() {
        if !state.exit_requested {
          state.fire(ApplicationEvent {
            event: WebviewApplicationEvent::ApplicationCloseRequested
              .name()
              .to_owned(),
            custom_menu_event: None,
          });
        }
        state.finalize_shutdown();
      }
    }
    WindowEvent::Focused(focused) => {
      state.fire_window_event(
        window_id,
        WindowEventPayload {
          event: (if focused {
            WindowEventType::Focused.name()
          } else {
            WindowEventType::Blurred.name()
          })
          .to_owned(),
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
          event: WindowEventType::MouseEnter.name().to_owned(),
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
          event: WindowEventType::MouseLeave.name().to_owned(),
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

      state.fire_window_event(
        window_id,
        WindowEventPayload {
          event: WindowEventType::MouseMove.name().to_owned(),
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

      let pos = state.cursor_positions.get(&window_id).copied();
      state.fire_window_event(
        window_id,
        WindowEventPayload {
          event: (if btn_state == ElementState::Pressed {
            WindowEventType::MouseDown.name()
          } else {
            WindowEventType::MouseUp.name()
          })
          .to_owned(),
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
        _ => return,
      };
      state.fire_window_event(
        window_id,
        WindowEventPayload {
          event: WindowEventType::Scroll.name().to_owned(),
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
          event: (if key_event.state == ElementState::Pressed {
            WindowEventType::KeyDown.name()
          } else {
            WindowEventType::KeyUp.name()
          })
          .to_owned(),
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
    // tao uses ReceivedImeText instead of the full Ime lifecycle
    WindowEvent::ReceivedImeText(text) => {
      state.fire_window_event(
        window_id,
        WindowEventPayload {
          event: WindowEventType::Ime.name().to_owned(),
          text: Some(text),
          phase: Some("commit".to_owned()),
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
          event: WindowEventType::FileDrop.name().to_owned(),
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
          event: WindowEventType::FileHover.name().to_owned(),
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
          event: WindowEventType::FileHoverCancelled.name().to_owned(),
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
          event: WindowEventType::ScaleFactorChanged.name().to_owned(),
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
          event: WindowEventType::ThemeChanged.name().to_owned(),
          text: Some(match theme {
            tao::window::Theme::Light => "light".to_owned(),
            tao::window::Theme::Dark => "dark".to_owned(),
            _ => "light".to_owned(),
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
        _ => "unknown",
      };
      state.fire_window_event(
        window_id,
        WindowEventPayload {
          event: WindowEventType::Touch.name().to_owned(),
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
    let event_loop = EventLoop::new();

    // Nothing here ever consumes a tao DeviceEvent (the pump closure drops
    // them), so leaving raw input registered is pure cost - on Windows it
    // delayed input into the WebView2 child by seconds while a key was held.
    event_loop.set_device_event_filter(DeviceEventFilter::Always);

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
        exit_requested: false,
        ready: false,
        windows: HashMap::new(),
        webviews: HashMap::new(),
        window_handlers: HashMap::new(),
        window_close_states: HashMap::new(),
        window_lifecycles: HashMap::new(),
        webview_lifecycles: HashMap::new(),
        cursor_positions: HashMap::new(),
        current_modifiers: ModifiersState::default(),
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
    if self.state.should_exit || self.state.exit_requested {
      return;
    }

    self.state.exit_requested = true;
    if let Ok(mut ids) = self.window_ids.lock() {
      ids.clear();
    }

    let window_ids: Vec<_> = self.state.windows.keys().copied().collect();
    if window_ids.is_empty() {
      self.state.finalize_shutdown();
      #[cfg(not(target_os = "android"))]
      self.global_menu.borrow_mut().take();
      return;
    }

    for window_id in window_ids {
      self.state.begin_close_window(window_id);
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
      ids.insert(format!("{:?}", window.tao_window_id()), window.id());
    }

    // Track the window so pump_events can dispose it on CloseRequested and
    // resize its webviews on Resized (tao bypasses wry's WM_SIZE subclass proc).
    let wid = window.tao_window_id();
    self.state.windows.insert(wid, Rc::clone(&window.window));
    self.state.webviews.insert(wid, window.webviews_shared());
    self
      .state
      .window_handlers
      .insert(wid, window.event_handler_shared());
    self
      .state
      .window_close_states
      .insert(wid, window.close_state_shared());
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

    let wid = window.tao_window_id();
    self.state.windows.insert(wid, Rc::clone(&window.window));
    self.state.webviews.insert(wid, window.webviews_shared());
    self
      .state
      .window_handlers
      .insert(wid, window.event_handler_shared());
    self
      .state
      .window_close_states
      .insert(wid, window.close_state_shared());
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

  /// Pump the tao event loop once without blocking. Returns `true` while
  /// the app is alive, `false` when it should stop. Drive this from a JS
  /// `setInterval` via the `run()` wrapper in `index.js`.
  #[napi]
  pub fn pump_events(&mut self) -> bool {
    use tao::event::Event;

    #[cfg(target_os = "macos")]
    use tao::platform::macos::{EventLoopExtPumpEvents, PumpStatus};

    #[cfg(not(target_os = "macos"))]
    use tao::platform::run_return::EventLoopExtRunReturn;

    if self.state.should_exit {
      return false;
    }

    // Fire the ready event on the first pump.
    if !self.state.ready {
      self.state.ready = true;
      self.state.fire(ApplicationEvent {
        event: WebviewApplicationEvent::Ready.name().to_owned(),
        custom_menu_event: None,
      });
    }

    // Drain menu events before pumping the window event loop.
    #[cfg(not(target_os = "android"))]
    {
      if let Some(rx) = &self.state.menu_event_receiver {
        while let Ok(ev) = rx.try_recv() {
          self.state.fire(ApplicationEvent {
            event: WebviewApplicationEvent::CustomMenuClick.name().to_owned(),
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

    if self.state.should_exit {
      return false;
    }

    // Split borrows so the event handler can mutate application state.
    let event_loop = match &mut self.event_loop {
      Some(event_loop) => event_loop,
      None => return false,
    };

    let state = &mut self.state;

    /*
     * macOS
     *
     * Use WebviewJS's patched Tao pump API. Returning from one pump does not
     * destroy the event loop or set ControlFlow::Exit.
     */
    #[cfg(target_os = "macos")]
    {
      let status = event_loop.pump_events(|event, _target, control_flow| {
        use tao::event_loop::ControlFlow;

        *control_flow = ControlFlow::Poll;

        if let Event::WindowEvent {
          window_id,
          event: window_event,
          ..
        } = event
        {
          handle_window_event(state, window_id, window_event);
        }

        // ControlFlow::Exit is reserved for an actual application exit.
        if state.should_exit {
          *control_flow = ControlFlow::Exit;
        }
      });

      if let PumpStatus::Exit(_exit_code) = status {
        state.should_exit = true;
      }
    }

    /*
     * Other desktop platforms
     *
     * Continue using Tao's existing run_return implementation.
     */
    #[cfg(not(target_os = "macos"))]
    {
      use tao::{event::StartCause, event_loop::ControlFlow};

      event_loop.run_return(|event, _target, control_flow| {
        *control_flow = ControlFlow::Poll;

        match event {
          Event::WindowEvent {
            window_id,
            event: window_event,
            ..
          } => {
            handle_window_event(state, window_id, window_event);
          }

          // On these platforms run_return still needs Exit to return control
          // to Node.js after the current event-loop iteration.
          Event::MainEventsCleared => {
            *control_flow = ControlFlow::Exit;
          }

          Event::NewEvents(StartCause::Poll) => {}

          _ => {}
        }
      });
    }

    !state.should_exit
  }

  /// Run Tao's native event loop continuously on the current thread.
  ///
  /// This blocks JavaScript until the application exits. Use `run()` when the
  /// Node.js event loop must remain available.
  #[napi]
  pub fn run_sync(&mut self) -> Result<()> {
    use tao::event::Event;
    use tao::event_loop::ControlFlow;
    use tao::platform::run_return::EventLoopExtRunReturn;

    if self.state.should_exit {
      return Ok(());
    }

    if !self.state.ready {
      self.state.ready = true;
      self.state.fire(ApplicationEvent {
        event: WebviewApplicationEvent::Ready.name().to_owned(),
        custom_menu_event: None,
      });
    }

    let event_loop = self.event_loop.as_mut().ok_or_else(|| {
      napi::Error::new(
        napi::Status::GenericFailure,
        "Event loop is not initialized",
      )
    })?;
    let state = &mut self.state;

    event_loop.run_return(|event, _target, control_flow| {
      *control_flow = ControlFlow::Wait;

      if let Event::WindowEvent {
        window_id,
        event: window_event,
        ..
      } = event
      {
        handle_window_event(state, window_id, window_event);
      }

      if state.should_exit {
        *control_flow = ControlFlow::Exit;
      }
    });

    Ok(())
  }

  /// Run the application event loop.
  #[napi]
  pub fn run(&mut self, _options: Option<ApplicationRunOptions>) -> Result<()> {
    // Note: this is intentionally calling pump_events() once
    // the js side overrides this with a setInterval to keep the event loop alive.
    self.pump_events();
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
  use crate::browser_window::CloseRequestState;
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

  #[test]
  fn close_request_state_resets_between_requests() {
    let state = CloseRequestState::new();

    state.begin();
    assert!(state.prevent());
    assert!(state.finish());

    state.begin();
    assert!(!state.finish());
  }

  #[test]
  fn close_request_state_prevention_is_idempotent() {
    let state = CloseRequestState::new();

    state.begin();
    assert!(state.prevent());
    assert!(state.prevent());

    assert!(state.finish());
  }

  #[test]
  fn close_request_state_rejects_prevention_outside_dispatch() {
    let state = CloseRequestState::new();

    assert!(!state.prevent());

    state.begin();
    assert!(state.prevent());
    assert!(state.finish());
    assert!(!state.prevent());
  }
}

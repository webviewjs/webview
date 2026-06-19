#![deny(clippy::all)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::{Arc, Mutex};

use browser_window::{BrowserWindow, BrowserWindowOptions};
#[cfg(not(target_os = "android"))]
use muda::Menu;
use napi::bindgen_prelude::*;
use napi::Result;
use napi_derive::napi;
use winit::{
  event::{Event, WindowEvent},
  event_loop::EventLoop,
  window::{Window, WindowId},
};

pub mod browser_window;
pub mod menu;
pub mod webview;

#[napi]
pub enum WindowCommand {
  Close,
  Show,
  Hide,
}

#[napi]
pub enum WebviewApplicationEvent {
  WindowCloseRequested,
  ApplicationCloseRequested,
  CustomMenuClick,
}

#[napi(object)]
pub struct CustomMenuEvent {
  pub id: String,
  pub window_id: u32,
}

#[napi(object)]
#[derive(Clone)]
pub struct MenuItemOptions {
  pub id: Option<String>,
  pub label: Option<String>,
  pub enabled: Option<bool>,
  pub accelerator: Option<String>,
  pub submenu: Option<MenuOptions>,
  pub role: Option<String>,
}

#[napi(object)]
#[derive(Clone)]
pub struct MenuOptions {
  pub items: Vec<MenuItemOptions>,
}

#[napi(object)]
pub struct HeaderData {
  pub key: String,
  pub value: Option<String>,
}

#[napi(object)]
pub struct IpcMessage {
  pub body: Buffer,
  pub method: String,
  pub headers: Vec<HeaderData>,
  pub uri: String,
}

#[napi]
pub fn get_webview_version() -> Result<String> {
  wry::webview_version().map_err(|e| {
    napi::Error::new(
      napi::Status::GenericFailure,
      format!("Failed to get webview version: {}", e),
    )
  })
}

/// Kept for backward compat; no longer used internally.
#[napi(js_name = "ControlFlow")]
pub enum JsControlFlow {
  Poll,
  Wait,
  WaitUntil,
  Exit,
  ExitWithCode,
}

#[napi(object)]
pub struct ApplicationOptions {
  pub control_flow: Option<JsControlFlow>,
  pub wait_time: Option<i32>,
  pub exit_code: Option<i32>,
}

#[napi(object)]
pub struct ApplicationEvent {
  pub event: WebviewApplicationEvent,
  pub custom_menu_event: Option<CustomMenuEvent>,
}

#[napi(object)]
pub struct ApplicationRunOptions {
  /** The interval in milliseconds to pump events. Defaults to 16 (60 FPS). */
  pub interval: Option<u32>,
  /** Whether to keep the event loop alive. Defaults to true. */
  pub ref_: Option<bool>,
}

// ── Internal state ────────────────────────────────────────────────────────────

struct AppState {
  handler: Rc<RefCell<Option<FunctionRef<ApplicationEvent, ()>>>>,
  env: Env,
  should_exit: bool,
  /// Tracks open windows so we can hide them on close without dropping BrowserWindow.
  windows: HashMap<WindowId, Arc<Window>>,
  /// Shared handle into each BrowserWindow's webview list.  Winit swallows
  /// WM_SIZE without forwarding to wry's subclass proc, so we resize manually
  /// when WindowEvent::Resized arrives.
  webviews: HashMap<WindowId, Rc<RefCell<Vec<Rc<wry::WebView>>>>>,
  #[cfg(not(target_os = "android"))]
  menu_event_receiver: Option<muda::MenuEventReceiver>,
}

impl AppState {
  fn fire(&self, event: ApplicationEvent) {
    let cb = self.handler.borrow();
    if let Some(f) = cb.as_ref() {
      if let Ok(func) = f.borrow_back(&self.env) {
        let _ = func.call(event);
      }
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
    let event_loop = EventLoop::new().map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to create event loop: {}", e),
      )
    })?;

    // Auto-initialise the platform menu system (no-op outside macOS).
    menu::auto_init_platform();

    Ok(Self {
      event_loop: Some(event_loop),
      state: AppState {
        handler: Rc::new(RefCell::new(None)),
        env,
        should_exit: false,
        windows: HashMap::new(),
        webviews: HashMap::new(),
        #[cfg(not(target_os = "android"))]
        menu_event_receiver: None,
      },
      #[cfg(not(target_os = "android"))]
      global_menu: Rc::new(RefCell::new(None)),
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
  pub fn exit(&mut self) {
    // Hide all managed windows so they don't become zombie frames.
    for win in self.state.windows.values() {
      win.set_visible(false);
    }
    self.state.windows.clear();
    self.state.should_exit = true;
  }

  #[napi]
  pub fn create_browser_window(
    &mut self,
    options: Option<BrowserWindowOptions>,
  ) -> Result<BrowserWindow> {
    let event_loop = self.event_loop.as_ref().ok_or_else(|| {
      napi::Error::new(
        napi::Status::GenericFailure,
        "Event loop is not initialized",
      )
    })?;

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

    Ok(window)
  }

  #[napi]
  pub fn create_child_browser_window(
    &mut self,
    options: Option<BrowserWindowOptions>,
  ) -> Result<BrowserWindow> {
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

    Ok(window)
  }

  #[napi]
  pub fn set_menu(&mut self, menu_options: Option<MenuOptions>) -> Result<()> {
    #[cfg(not(target_os = "android"))]
    {
      if let Some(options) = menu_options {
        let m = menu::create_menu_from_options(options)?;
        #[cfg(target_os = "macos")]
        m.init_for_nsapp();
        self.state.menu_event_receiver = Some(muda::MenuEvent::receiver().clone());
        *self.global_menu.borrow_mut() = Some(m);
      } else {
        *self.global_menu.borrow_mut() = None;
        self.state.menu_event_receiver = None;
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

    // Split borrows so the closure can capture &mut state independently.
    let event_loop = match &mut self.event_loop {
      Some(el) => el,
      None => return false,
    };
    let state = &mut self.state;

    // Never call target.exit() — doing so permanently marks the runner as
    // exited until reset_runner() fires, which can cause the next pump to
    // re-emit Init/Resumed and confuse the state machine.  Instead we
    // hide windows and let the JS side stop the interval when we return false.
    event_loop.pump_events(Some(std::time::Duration::ZERO), |event, _target| {
      if state.should_exit {
        return;
      }

      // Winit's WM_SIZE handler returns ProcResult::Value(0) without calling
      // DefSubclassProc, so wry's own resize subclass proc is never reached.
      // We resize all webviews for this window manually here instead.
      if let Event::WindowEvent {
        window_id,
        event: WindowEvent::Resized(new_size),
      } = &event
      {
        if let Some(views) = state.webviews.get(window_id) {
          // wry uses the standalone `dpi` crate; winit has its own dpi module.
          // Convert manually to avoid type-mismatch errors.
          let rect = wry::Rect {
            position: ::dpi::PhysicalPosition::new(0_i32, 0_i32).into(),
            size: ::dpi::PhysicalSize::new(new_size.width, new_size.height).into(),
          };
          for wv in views.borrow().iter() {
            let _ = wv.set_bounds(rect);
          }
        }
      }

      if let Event::WindowEvent {
        window_id,
        event: WindowEvent::CloseRequested,
      } = event
      {
        // Hide and untrack the closing window so it doesn't linger as a
        // zombie frame after the pump stops.
        if let Some(win) = state.windows.remove(&window_id) {
          win.set_visible(false);
        }

        state.fire(ApplicationEvent {
          event: WebviewApplicationEvent::WindowCloseRequested,
          custom_menu_event: None,
        });

        // Exit the app when all windows have been closed.
        if state.windows.is_empty() {
          state.fire(ApplicationEvent {
            event: WebviewApplicationEvent::ApplicationCloseRequested,
            custom_menu_event: None,
          });
          state.should_exit = true;
        }
      }
    });

    !state.should_exit
  }

  /// Run the application event loop.
  #[napi]
  pub fn run(&mut self, _options: Option<ApplicationRunOptions>) -> Result<()> {
    // Note: this is intentionally no-op in rust. The binding loader file patches this to call `pump_events()` in a `setInterval` loop.
    Ok(())
  }
}

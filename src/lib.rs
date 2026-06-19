#![deny(clippy::all)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::{Arc, Mutex};

use browser_window::{BrowserWindow, BrowserWindowOptions};
#[cfg(not(target_os = "android"))]
use muda::{accelerator::Accelerator, Menu, MenuItem, PredefinedMenuItem, Submenu};
use napi::bindgen_prelude::*;
use napi::Result;
use napi_derive::napi;
use winit::{
  event::{Event, WindowEvent},
  event_loop::EventLoop,
  window::{Window, WindowId},
};

pub mod browser_window;
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
  global_menu: Arc<Mutex<Option<Menu>>>,
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

    Ok(Self {
      event_loop: Some(event_loop),
      state: AppState {
        handler: Rc::new(RefCell::new(None)),
        env,
        should_exit: false,
        windows: HashMap::new(),
        #[cfg(not(target_os = "android"))]
        menu_event_receiver: None,
      },
      #[cfg(not(target_os = "android"))]
      global_menu: Arc::new(Mutex::new(None)),
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
    if window_options.menu.is_none() {
      if let Ok(global_menu) = self.global_menu.lock() {
        if global_menu.is_some() {
          window_options.show_menu = Some(true);
        }
      }
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
      Arc::new(Mutex::new(None)),
    )?;

    if let Ok(mut ids) = self.window_ids.lock() {
      ids.insert(format!("{:?}", window.winit_window_id()), window.id());
    }

    // Track the window so pump_events can hide it on CloseRequested.
    self.state.windows.insert(window.winit_window_id(), Arc::clone(&window.window));

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
    let window = BrowserWindow::new(event_loop, options, true, Arc::new(Mutex::new(None)))?;

    self.state.windows.insert(window.winit_window_id(), Arc::clone(&window.window));

    Ok(window)
  }

  #[napi]
  pub fn set_menu(&mut self, menu_options: Option<MenuOptions>) -> Result<()> {
    #[cfg(not(target_os = "android"))]
    {
      if let Some(options) = menu_options {
        let menu = create_menu_from_options(options)?;
        #[cfg(target_os = "macos")]
        {
          menu.init_for_nsapp();
        }
        self.state.menu_event_receiver = Some(muda::MenuEvent::receiver().clone());
        *self.global_menu.lock().unwrap() = Some(menu);
      } else {
        *self.global_menu.lock().unwrap() = None;
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

#[napi]
pub fn init_menu_system() -> Result<()> {
  #[cfg(target_os = "macos")]
  {
    muda::Menu::new().init_for_nsapp();
  }
  Ok(())
}

#[cfg(not(target_os = "android"))]
pub fn create_menu_from_options(options: MenuOptions) -> Result<Menu> {
  let menu = Menu::new();

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
    add_menu_item_to_menu(&menu, item)?;
  }

  Ok(menu)
}

#[cfg(not(target_os = "android"))]
fn add_menu_item_to_menu(menu: &Menu, item: MenuItemOptions) -> Result<()> {
  if let Some(submenu_options) = item.submenu {
    let submenu = Submenu::new(&item.label.unwrap_or_default(), true);
    for sub_item in submenu_options.items {
      add_menu_item_to_submenu(&submenu, sub_item)?;
    }
    menu.append(&submenu).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to append submenu: {}", e),
      )
    })?;
  } else if let Some(role) = &item.role {
    let predefined = role_to_predefined(role)?;
    menu.append(&predefined).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to append predefined item: {}", e),
      )
    })?;
  } else if item.id.is_some() || item.label.is_some() {
    let menu_item = make_menu_item(&item)?;
    menu.append(&menu_item).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to append menu item: {}", e),
      )
    })?;
  }
  Ok(())
}

#[cfg(not(target_os = "android"))]
fn add_menu_item_to_submenu(submenu: &Submenu, item: MenuItemOptions) -> Result<()> {
  if let Some(nested_options) = item.submenu {
    let nested = Submenu::new(&item.label.unwrap_or_default(), true);
    for sub_item in nested_options.items {
      add_menu_item_to_submenu(&nested, sub_item)?;
    }
    submenu.append(&nested).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to append nested submenu: {}", e),
      )
    })?;
  } else if let Some(role) = &item.role {
    let predefined = role_to_predefined(role)?;
    submenu.append(&predefined).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to append predefined item to submenu: {}", e),
      )
    })?;
  } else if item.id.is_some() || item.label.is_some() {
    let menu_item = make_menu_item(&item)?;
    submenu.append(&menu_item).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to append menu item to submenu: {}", e),
      )
    })?;
  }
  Ok(())
}

#[cfg(not(target_os = "android"))]
fn role_to_predefined(role: &str) -> Result<PredefinedMenuItem> {
  Ok(match role {
    "copy" => PredefinedMenuItem::copy(None),
    "paste" => PredefinedMenuItem::paste(None),
    "cut" => PredefinedMenuItem::cut(None),
    "selectall" => PredefinedMenuItem::select_all(None),
    "separator" => PredefinedMenuItem::separator(),
    _ => {
      return Err(napi::Error::new(
        napi::Status::InvalidArg,
        format!("Unknown menu role: {}", role),
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
    &item.label.clone().unwrap_or_default(),
    item.enabled.unwrap_or(true),
    item
      .accelerator
      .as_ref()
      .and_then(|acc| acc.parse::<Accelerator>().ok()),
  ))
}

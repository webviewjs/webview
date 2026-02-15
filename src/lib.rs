#![deny(clippy::all)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::cell::RefCell;
use std::rc::Rc;
use std::sync::{Arc, Mutex};

use browser_window::{BrowserWindow, BrowserWindowOptions};
use napi::bindgen_prelude::*;
use napi::Result;
use napi_derive::napi;
use tao::{
  event::{Event, WindowEvent},
  event_loop::{ControlFlow, EventLoop},
};
use std::collections::HashMap;
use muda::{
  accelerator::Accelerator,
  Menu, MenuItem, PredefinedMenuItem, Submenu,
};

pub mod browser_window;
pub mod webview;

/// Window commands that can be sent from JavaScript
#[napi]
pub enum WindowCommand {
  /// Close the window
  Close,
  /// Show the window
  Show,
  /// Hide the window
  Hide,
}

#[napi]
/// Represents application events
pub enum WebviewApplicationEvent {
  /// Window close event.
  WindowCloseRequested,
  /// Application close event.
  ApplicationCloseRequested,
  /// Custom menu click event.
  CustomMenuClick,
}

#[napi(object)]
pub struct CustomMenuEvent {
  /// The menu item identifier
  pub id: String,
  /// The window identifier
  pub window_id: u32,
}

#[napi(object)]
/// Represents menu item options from JavaScript
#[derive(Clone)]
pub struct MenuItemOptions {
  pub id: Option<String>,
  pub label: Option<String>,
  pub enabled: Option<bool>,
  pub accelerator: Option<String>,
  pub submenu: Option<MenuOptions>,
  pub role: Option<String>, // For predefined roles like copy, paste, etc
}

#[napi(object)]
/// Represents menu options from JavaScript
#[derive(Clone)]
pub struct MenuOptions {
  pub items: Vec<MenuItemOptions>,
}

#[napi(object)]
pub struct HeaderData {
  /// The key of the header.
  pub key: String,
  /// The value of the header.
  pub value: Option<String>,
}

#[napi(object)]
pub struct IpcMessage {
  /// The body of the message.
  pub body: Buffer,
  /// The HTTP method of the message.
  pub method: String,
  /// The http headers of the message.
  pub headers: Vec<HeaderData>,
  /// The URI of the message.
  pub uri: String,
}

#[napi]
/// Returns the version of the webview.
pub fn get_webview_version() -> Result<String> {
  wry::webview_version().map_err(|e| {
    napi::Error::new(
      napi::Status::GenericFailure,
      format!("Failed to get webview version: {}", e),
    )
  })
}

#[napi(js_name = "ControlFlow")]
/// Represents the control flow of the application.
pub enum JsControlFlow {
  /// The application will continue running.
  Poll,
  /// The application will wait until the specified time.
  WaitUntil,
  /// The application will exit.
  Exit,
  /// The application will exit with the given exit code.
  ExitWithCode,
}

#[napi(object)]
/// Represents the options for creating an application.
pub struct ApplicationOptions {
  /// The control flow of the application. Default is `Poll`.
  pub control_flow: Option<JsControlFlow>,
  /// The waiting time in ms for the application (only applicable if control flow is set to `WaitUntil`).
  pub wait_time: Option<i32>,
  /// The exit code of the application. Only applicable if control flow is set to `ExitWithCode`.
  pub exit_code: Option<i32>,
}

#[napi(object)]
/// Represents an event for the application.
pub struct ApplicationEvent {
  /// The event type.
  pub event: WebviewApplicationEvent,
  /// Custom menu event data
  pub custom_menu_event: Option<CustomMenuEvent>,
}

#[napi]
/// Represents an application.
pub struct Application {
  /// The event loop.
  event_loop: Option<EventLoop<()>>,
  /// The options for creating the application.
  options: ApplicationOptions,
  /// The event handler for the application.
  handler: Rc<RefCell<Option<FunctionRef<ApplicationEvent, ()>>>>,
  /// The env
  env: Env,
  /// Whether the application should exit
  should_exit: Rc<RefCell<bool>>,
  /// The global menu
  global_menu: Arc<Mutex<Option<Menu>>>,
  /// Menu event receiver
  menu_event_receiver: Arc<Mutex<Option<muda::MenuEventReceiver>>>,
  /// Window ID mapping (using string for simplicity)
  window_ids: Arc<Mutex<HashMap<String, u32>>>,
}

#[napi]
impl Application {
  #[napi(constructor)]
  /// Creates a new application.
  pub fn new(env: Env, options: Option<ApplicationOptions>) -> Result<Self> {
    let event_loop = EventLoop::new();

    Ok(Self {
      event_loop: Some(event_loop),
      options: options.unwrap_or(ApplicationOptions {
        control_flow: Some(JsControlFlow::Poll),
        wait_time: None,
        exit_code: None,
      }),
      handler: Rc::new(RefCell::new(None::<FunctionRef<ApplicationEvent, ()>>)),
      env,
      should_exit: Rc::new(RefCell::new(false)),
      global_menu: Arc::new(Mutex::new(None)),
      menu_event_receiver: Arc::new(Mutex::new(None)),
      window_ids: Arc::new(Mutex::new(HashMap::new())),
    })
  }

  #[napi]
  /// Sets the event handler callback.
  pub fn on_event(&mut self, handler: Option<FunctionRef<ApplicationEvent, ()>>) {
    *self.handler.borrow_mut() = handler;
  }

  #[napi]
  /// Alias for on_event() - binds an event handler callback.
  pub fn bind(&mut self, handler: Option<FunctionRef<ApplicationEvent, ()>>) {
    *self.handler.borrow_mut() = handler;
  }

  #[napi]
  /// Exits the application gracefully. This will trigger the close event and clean up resources.
  pub fn exit(&self) {
    *self.should_exit.borrow_mut() = true;
  }

  #[napi]
  /// Creates a new browser window.
  pub fn create_browser_window(
    &'static mut self,
    options: Option<BrowserWindowOptions>,
  ) -> Result<BrowserWindow> {
    let event_loop = self.event_loop.as_ref();

    if event_loop.is_none() {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "Event loop is not initialized",
      ));
    }

    // Pass the global menu to the window if no custom menu is provided
    let mut window_options = options.unwrap_or_default();
    if window_options.menu.is_none() {
      if let Ok(global_menu) = self.global_menu.lock() {
        if global_menu.as_ref().is_some() {
          window_options.show_menu = Some(true);
        }
      }
    }

    let window = BrowserWindow::new(event_loop.unwrap(), Some(window_options), false, self.global_menu.clone())?;

    // Store window ID for menu events
    if let Ok(mut ids) = self.window_ids.lock() {
      let window_id = window.id();
      let tao_id = window.tao_window_id();
      ids.insert(format!("{:?}", tao_id), window_id);
    }

    Ok(window)
  }

  #[napi]
  /// Creates a new browser window as a child window.
  pub fn create_child_browser_window(
    &'static mut self,
    options: Option<BrowserWindowOptions>,
  ) -> Result<BrowserWindow> {
    let event_loop = self.event_loop.as_ref();

    if event_loop.is_none() {
      return Err(napi::Error::new(
        napi::Status::GenericFailure,
        "Event loop is not initialized",
      ));
    }

    let window = BrowserWindow::new(event_loop.unwrap(), options, true, self.global_menu.clone())?;

    Ok(window)
  }

  #[napi]
  /// Sets the global menu for the application (cross-platform)
  pub fn set_menu(&mut self, menu_options: Option<MenuOptions>) -> Result<()> {
    if let Some(options) = menu_options {
      let menu = create_menu_from_options(options)?;
      
      #[cfg(target_os = "macos")]
      {
        // On macOS, set as application menu
        menu.init_for_nsapp();
      }
      
      // Set up menu event receiver
      if let Ok(mut receiver) = self.menu_event_receiver.lock() {
        *receiver = Some(muda::MenuEvent::receiver().clone());
      }
      
      // Store the menu for use with new windows on other platforms
      *self.global_menu.lock().unwrap() = Some(menu);
    } else {
      *self.global_menu.lock().unwrap() = None;
      *self.menu_event_receiver.lock().unwrap() = None;
    }
    
    Ok(())
  }

  #[napi]
  /// Runs the application. This method will block the current thread.
  pub fn run(&mut self) -> Result<()> {
    let ctrl = match self.options.control_flow {
      None => ControlFlow::Poll,
      Some(JsControlFlow::Poll) => ControlFlow::Poll,
      Some(JsControlFlow::WaitUntil) => {
        let wait_time = self.options.wait_time.unwrap_or(0);
        ControlFlow::WaitUntil(
          std::time::Instant::now() + std::time::Duration::from_millis(wait_time as u64),
        )
      }
      Some(JsControlFlow::Exit) => ControlFlow::Exit,
      Some(JsControlFlow::ExitWithCode) => {
        let exit_code = self.options.exit_code.unwrap_or(0);
        ControlFlow::ExitWithCode(exit_code)
      }
    };

    if let Some(event_loop) = self.event_loop.take() {
      let handler = self.handler.clone();
      let env = self.env;
      let should_exit = self.should_exit.clone();
      let menu_event_receiver = self.menu_event_receiver.clone();
      let _window_ids = self.window_ids.clone();

      event_loop.run(move |event, _, control_flow| {
        *control_flow = ctrl;

        // Check for menu events
        if let Ok(receiver) = menu_event_receiver.lock() {
          if let Some(receiver) = receiver.as_ref() {
            if let Ok(menu_event) = receiver.try_recv() {
              let callback = handler.borrow();
              if let Some(callback) = callback.as_ref() {
                if let Ok(on_event) = callback.borrow_back(&env) {
                  // Get window ID for the menu event
                  let window_id = 0; // Menu events are global, window ID not directly available

                  let _ = on_event.call(ApplicationEvent {
                    event: WebviewApplicationEvent::CustomMenuClick,
                    custom_menu_event: Some(CustomMenuEvent {
                      id: menu_event.id().0.clone(),
                      window_id,
                    }),
                  });
                }
              }
            }
          }
        }

        // Check if exit was requested
        if *should_exit.borrow() {
          let callback = handler.borrow();
          if let Some(callback) = callback.as_ref() {
            if let Ok(on_exit) = callback.borrow_back(&env) {
              let _ = on_exit.call(ApplicationEvent {
                event: WebviewApplicationEvent::ApplicationCloseRequested,
                custom_menu_event: None,
              });
            }
          }
          *control_flow = ControlFlow::Exit;
          return;
        }

        if let Event::WindowEvent {
          event: WindowEvent::CloseRequested,
          ..
        } = event
        {
          let callback = handler.borrow();
          if let Some(callback) = callback.as_ref() {
            if let Ok(on_ipc_msg) = callback.borrow_back(&env) {
              let _ = on_ipc_msg.call(ApplicationEvent {
                event: WebviewApplicationEvent::WindowCloseRequested,
                custom_menu_event: None,
              });
            }
          }

          *control_flow = ControlFlow::Exit
        }
      });
    }

    Ok(())
  }
}

#[napi]
/// Initialize menu system from worker thread (cross-platform)
pub fn init_menu_system() -> Result<()> {
  #[cfg(target_os = "macos")]
  {
    // Initialize the menu system for macOS
    // This can be called from a worker thread
    muda::Menu::new().init_for_nsapp();
  }
  Ok(())
}

/// Creates a menu from JavaScript options
pub fn create_menu_from_options(options: MenuOptions) -> Result<Menu> {
  let menu = Menu::new();

  // -------- App Menu --------
    let app = Submenu::new("App", true);

    let about = PredefinedMenuItem::about(None, None);
    let hide = PredefinedMenuItem::hide(None);
    let hide_others = PredefinedMenuItem::hide_others(None);
    let show_all = PredefinedMenuItem::show_all(None);
    let quit = PredefinedMenuItem::quit(None);

    app.append_items(&[
        &about,
        &PredefinedMenuItem::separator(),
        &hide,
        &hide_others,
        &show_all,
        &PredefinedMenuItem::separator(),
        &quit,
    ])
    .ok();

  menu.append(&app).ok();
  
  for item in options.items {
    add_menu_item_to_menu(&menu, item)?;
  }
  
  Ok(menu)
}

/// Adds a menu item to a menu or submenu
fn add_menu_item_to_menu(menu: &Menu, item: MenuItemOptions) -> Result<()> {
  if let Some(submenu_options) = item.submenu {
    // Create submenu
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
    // Handle predefined menu items
    let predefined_item = match role.as_str() {
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
    };
    menu.append(&predefined_item).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to append predefined item: {}", e),
      )
    })?;
  } else if item.id.is_some() || item.label.is_some() {
    // Create custom menu item
    let menu_item = MenuItem::with_id(
      muda::MenuId(item.id.clone().unwrap_or_else(|| {
        item.label.clone().unwrap_or("item".to_string())
      })),
      &item.label.unwrap_or_default(),
      item.enabled.unwrap_or(true),
      item.accelerator
        .as_ref()
        .and_then(|acc| acc.parse::<Accelerator>().ok()),
    );
    menu.append(&menu_item).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to append menu item: {}", e),
      )
    })?;
  }
  
  Ok(())
}

/// Adds a menu item to a submenu
fn add_menu_item_to_submenu(submenu: &Submenu, item: MenuItemOptions) -> Result<()> {
  if let Some(nested_submenu_options) = item.submenu {
    // Create nested submenu
    let nested_submenu = Submenu::new(&item.label.unwrap_or_default(), true);
    for sub_item in nested_submenu_options.items {
      add_menu_item_to_submenu(&nested_submenu, sub_item)?;
    }
    submenu.append(&nested_submenu).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to append nested submenu: {}", e),
      )
    })?;
  } else if let Some(role) = &item.role {
    // Handle predefined menu items in submenu
    let predefined_item = match role.as_str() {
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
    };
    submenu.append(&predefined_item).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to append predefined item to submenu: {}", e),
      )
    })?;
  } else if item.id.is_some() || item.label.is_some() {
    // Create custom menu item in submenu
    let menu_item = MenuItem::with_id(
      muda::MenuId(item.id.clone().unwrap_or_else(|| {
        item.label.clone().unwrap_or("item".to_string())
      })),
      &item.label.unwrap_or_default(),
      item.enabled.unwrap_or(true),
      item.accelerator
        .as_ref()
        .and_then(|acc| acc.parse::<Accelerator>().ok()),
    );
    submenu.append(&menu_item).map_err(|e| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Failed to append menu item to submenu: {}", e),
      )
    })?;
  }
  
  Ok(())
}

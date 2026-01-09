#![deny(clippy::all)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::cell::RefCell;
use std::collections::HashSet;
use std::rc::Rc;
use std::sync::atomic::{AtomicU32, Ordering};

use browser_window::{BrowserWindow, BrowserWindowOptions};
use napi::bindgen_prelude::*;
use napi::Result;
use napi_derive::napi;
use tao::{
  event::{Event, WindowEvent},
  event_loop::{ControlFlow, EventLoop},
};

pub mod browser_window;
pub mod webview;

/// Global counter for window IDs
static WINDOW_ID_COUNTER: AtomicU32 = AtomicU32::new(1);

#[napi]
/// Represents application events
pub enum WebviewApplicationEvent {
  /// Window close event.
  WindowCloseRequested,
  /// Application close event.
  ApplicationCloseRequested,
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
  /// Whether to prevent the application from closing when all windows are closed.
  /// Default is `false`, meaning the application will exit when all windows are closed.
  /// When `true`, you must explicitly call `app.exit()` to close the application.
  pub prevent_close: Option<bool>,
}

#[napi(object)]
/// Represents an event for the application.
pub struct ApplicationEvent {
  /// The event type.
  pub event: WebviewApplicationEvent,
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
  /// Set of open window IDs
  open_windows: Rc<RefCell<HashSet<u32>>>,
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
        prevent_close: Some(false),
      }),
      handler: Rc::new(RefCell::new(None::<FunctionRef<ApplicationEvent, ()>>)),
      env,
      should_exit: Rc::new(RefCell::new(false)),
      open_windows: Rc::new(RefCell::new(HashSet::new())),
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

    let window_id = WINDOW_ID_COUNTER.fetch_add(1, Ordering::SeqCst);
    let window = BrowserWindow::new(event_loop.unwrap(), options, false, window_id)?;

    // Register window in open_windows set
    self.open_windows.borrow_mut().insert(window_id);

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

    let window_id = WINDOW_ID_COUNTER.fetch_add(1, Ordering::SeqCst);
    let window = BrowserWindow::new(event_loop.unwrap(), options, true, window_id)?;

    // Register window in open_windows set
    self.open_windows.borrow_mut().insert(window_id);

    Ok(window)
  }

  #[napi]
  /// Closes a specific window by ID.
  pub fn close_window(&self, window_id: u32) {
    self.open_windows.borrow_mut().remove(&window_id);
  }

  #[napi]
  /// Exits the application gracefully. This will trigger the close event and clean up resources.
  pub fn exit(&self) {
    *self.should_exit.borrow_mut() = true;
  }

  #[napi]
  /// Runs the application. This method will block the current thread.
  /// IMPORTANT: This method is BLOCKING and will prevent JavaScript from executing.
  /// All setTimeout/setInterval callbacks must be scheduled BEFORE calling this method.
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

    let prevent_close = self.options.prevent_close.unwrap_or(false);
    let open_windows = self.open_windows.clone();

    if let Some(event_loop) = self.event_loop.take() {
      let handler = self.handler.clone();
      let env = self.env;
      let should_exit = self.should_exit.clone();

      event_loop.run(move |event, _, control_flow| {
        *control_flow = ctrl;

        // Check if exit was requested
        if *should_exit.borrow() {
          let callback = handler.borrow();
          if let Some(callback) = callback.as_ref() {
            if let Ok(on_exit) = callback.borrow_back(&env) {
              let _ = on_exit.call(ApplicationEvent {
                event: WebviewApplicationEvent::ApplicationCloseRequested,
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
              });
            }
          }

          // Check if all windows are closed and prevent_close is false
          if !prevent_close && open_windows.borrow().is_empty() {
            *control_flow = ControlFlow::Exit;
          }
        }
      });
    }

    Ok(())
  }
}

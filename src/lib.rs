#![deny(clippy::all)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::cell::RefCell;
use std::rc::Rc;

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

#[napi]
/// TODO
pub enum WebviewApplicationEvent {
  /// Window close event.
  WindowCloseRequested,
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
    })
  }

  #[napi]
  /// Sets the event handler callback.
  pub fn on_event(&mut self, handler: Option<FunctionRef<ApplicationEvent, ()>>) {
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

    let window = BrowserWindow::new(event_loop.unwrap(), options, false)?;

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

    let window = BrowserWindow::new(event_loop.unwrap(), options, true)?;

    Ok(window)
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
      let env = self.env.clone();

      event_loop.run(move |event, _, control_flow| {
        *control_flow = ctrl;

        match event {
          Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
          } => {
            let callback = handler.borrow();
            if callback.is_some() {
              let callback = callback.as_ref().unwrap().borrow_back(&env);

              if callback.is_ok() {
                let callback = callback.unwrap();
                match callback.call(ApplicationEvent {
                  event: WebviewApplicationEvent::WindowCloseRequested,
                }) {
                  _ => (),
                };
              }
            }

            *control_flow = ControlFlow::Exit
          }
          _ => (),
        }
      });
    }

    Ok(())
  }
}

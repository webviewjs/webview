#![deny(clippy::all)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use browser_window::{BrowserWindow, BrowserWindowOptions};
use napi::bindgen_prelude::*;
use napi::Result;
use napi_derive::napi;
use tao::{
  event::{Event, WindowEvent},
  event_loop::{ControlFlow, EventLoop},
};
use wry::http::Request;

pub mod browser_window;

#[napi(object)]
pub struct HeaderData {
  pub key: String,
  pub value: Option<String>,
}

#[napi(object)]
pub struct IpcMessage {
  /// The unique identifier of the window that sent the message.
  pub window_id: u32,
  /// The body of the message.
  pub body: Vec<u8>,
  /// The HTTP method of the message.
  pub method: String,
  /// The headers of the message.
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

#[napi]
/// Represents an application.
pub struct Application {
  /// The event loop.
  event_loop: Option<EventLoop<()>>,
  /// The options for creating the application.
  options: ApplicationOptions,
  /// The unique identifier of the webviews created by this application.
  id_ref: u32,
  /// The ipc handler callback
  ipc_handler: Option<JsFunction>,
}

#[napi]
impl Application {
  #[napi(constructor)]
  /// Creates a new application.
  pub fn new(options: Option<ApplicationOptions>) -> Result<Self> {
    let event_loop = EventLoop::new();

    Ok(Self {
      event_loop: Some(event_loop),
      options: options.unwrap_or(ApplicationOptions {
        control_flow: Some(JsControlFlow::Poll),
        wait_time: None,
        exit_code: None,
      }),
      id_ref: 0,
      ipc_handler: None,
    })
  }

  #[napi]
  /// Sets the IPC handler callback.
  pub fn on_ipc_message(&mut self, handler: Option<JsFunction>) {
    self.ipc_handler = handler;
  }

  fn handle_ipc_message(&self, req: Request<String>, id: &u32) {
    let func = &self.ipc_handler.as_ref();

    if func.is_none() {
      return;
    }

    let on_ipc_msg = func.unwrap();

    println!("Received IPC message: {:?}", req);

    let body = req.body().as_bytes().to_vec();
    let headers = req
      .headers()
      .iter()
      .map(|(k, v)| HeaderData {
        key: k.as_str().to_string(),
        value: match v.to_str() {
          Ok(v) => Some(v.to_string()),
          Err(_) => None,
        },
      })
      .collect::<Vec<_>>();

    let msg = IpcMessage {
      window_id: id.clone(),
      body,
      method: req.method().to_string(),
      headers,
      uri: req.uri().to_string(),
    };

    match on_ipc_msg.call1::<IpcMessage, ()>(msg) {
      Ok(_) => {
        println!("onIpcMessage called successfully");
      }
      Err(e) => {
        println!("onIpcMessage error: {:?}", e);
      }
    };
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

    self.id_ref += 1;

    let next_id = &self.id_ref;

    let cb = |req: Request<String>| {
      self.handle_ipc_message(req, next_id);
    };

    let window = BrowserWindow::new(event_loop.unwrap(), options, self.id_ref, false, cb)?;

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

    self.id_ref += 1;

    let next_id = &self.id_ref;

    let cb = |req: Request<String>| {
      self.handle_ipc_message(req, next_id);
    };

    let window = BrowserWindow::new(event_loop.unwrap(), options, self.id_ref, true, cb)?;

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
      event_loop.run(move |event, _, control_flow| {
        *control_flow = ctrl;

        match event {
          Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
          } => *control_flow = ControlFlow::Exit,
          _ => (),
        }
      });
    }

    Ok(())
  }
}

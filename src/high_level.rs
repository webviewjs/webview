use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use std::sync::{Arc, Mutex};

#[napi]
pub type IpcHandler = ThreadsafeFunction<String>;

/// Represents a pending action to be applied to a webview once it's initialized.
pub(crate) enum PendingWebviewAction {
  LoadUrl(String),
  LoadHtml(String),
  EvaluateScript(String),
  OpenDevtools,
  CloseDevtools,
  Reload,
  Print,
}

#[allow(unused_imports)]
use crate::tao::enums::{TaoControlFlow, TaoFullscreenType, TaoTheme};
use crate::tao::structs::Position;
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

#[napi]
pub enum WebviewApplicationEvent {
  WindowCloseRequested,
  ApplicationCloseRequested,
}

#[napi(object)]
pub struct ApplicationEvent {
  pub event: WebviewApplicationEvent,
}

#[napi(object)]
pub struct ApplicationOptions {
  pub control_flow: Option<ControlFlow>,
  pub wait_time: Option<u32>,
  pub exit_code: Option<i32>,
}

#[napi]
pub enum ControlFlow {
  Poll = 0,
  WaitUntil = 1,
  Exit = 2,
  ExitWithCode = 3,
}

#[napi(object)]
pub struct Dimensions {
  pub width: f64,
  pub height: f64,
}

#[napi]
pub enum FullscreenType {
  Exclusive = 0,
  Borderless = 1,
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
pub enum ProgressBarStatus {
  None = 0,
  Normal = 1,
  Indeterminate = 2,
  Paused = 3,
  Error = 4,
}

#[napi(object)]
pub struct ProgressBarState {
  /// The progress status.
  pub status: ProgressBarStatus,
  /// The progress value (0-100).
  pub progress: f64,
}

#[napi]
pub enum Theme {
  Light = 0,
  Dark = 1,
  System = 2,
}

#[napi(object)]
pub struct VideoMode {
  pub size: Dimensions,
  pub bit_depth: u32,
  pub refresh_rate: u32,
}

#[napi(object)]
pub struct Monitor {
  pub name: Option<String>,
  pub scale_factor: f64,
  pub size: Dimensions,
  pub position: Position,
  pub video_modes: Vec<VideoMode>,
}

#[napi(object)]
pub struct BrowserWindowOptions {
  pub resizable: Option<bool>,
  pub title: Option<String>,
  pub width: Option<f64>,
  pub height: Option<f64>,
  pub x: Option<f64>,
  pub y: Option<f64>,
  pub content_protection: Option<bool>,
  pub always_on_top: Option<bool>,
  pub always_on_bottom: Option<bool>,
  pub visible: Option<bool>,
  pub decorations: Option<bool>,
  pub visible_on_all_workspaces: Option<bool>,
  pub maximized: Option<bool>,
  pub maximizable: Option<bool>,
  pub minimizable: Option<bool>,
  pub focused: Option<bool>,
  pub transparent: Option<bool>,
  pub fullscreen: Option<FullscreenType>,
}

#[napi(object)]
pub struct WebviewOptions {
  pub url: Option<String>,
  pub html: Option<String>,
  pub width: Option<f64>,
  pub height: Option<f64>,
  pub x: Option<f64>,
  pub y: Option<f64>,
  pub enable_devtools: Option<bool>,
  pub incognito: Option<bool>,
  pub user_agent: Option<String>,
  pub child: Option<bool>,
  pub preload: Option<String>,
  pub transparent: Option<bool>,
  pub theme: Option<Theme>,
  pub hotkeys_zoom: Option<bool>,
  pub clipboard: Option<bool>,
  pub autoplay: Option<bool>,
  pub back_forward_navigation_gestures: Option<bool>,
}

type PendingWindow = (
  BrowserWindowOptions,
  Arc<Mutex<Option<crate::tao::structs::Window>>>,
  Arc<Mutex<Vec<PendingWebview>>>,
);

type PendingWebview = (
  WebviewOptions,
  Arc<Mutex<Option<crate::wry::structs::WebView>>>,
  Arc<Mutex<Vec<crate::wry::structs::IpcHandler>>>,
  Arc<Mutex<Vec<PendingWebviewAction>>>,
);

#[napi]
pub struct Application {
  #[allow(clippy::arc_with_non_send_sync)]
  event_loop: Arc<Mutex<Option<tao::event_loop::EventLoop<()>>>>,
  event_loop_proxy: tao::event_loop::EventLoopProxy<()>,
  handler: Arc<Mutex<Option<ThreadsafeFunction<ApplicationEvent>>>>,
  #[allow(clippy::arc_with_non_send_sync)]
  windows_to_create: Arc<Mutex<Vec<PendingWindow>>>,
  exit_requested: Arc<Mutex<bool>>,
}

#[napi]
impl Application {
  #[napi(constructor)]
  pub fn new(_options: Option<ApplicationOptions>) -> Self {
    let event_loop = tao::event_loop::EventLoop::new();
    let event_loop_proxy = event_loop.create_proxy();
    Self {
      #[allow(clippy::arc_with_non_send_sync)]
      event_loop: Arc::new(Mutex::new(Some(event_loop))),
      event_loop_proxy,
      handler: Arc::new(Mutex::new(None)),
      #[allow(clippy::arc_with_non_send_sync)]
      windows_to_create: Arc::new(Mutex::new(Vec::new())),
      exit_requested: Arc::new(Mutex::new(false)),
    }
  }

  #[napi]
  pub fn on_event(&self, handler: Option<ThreadsafeFunction<ApplicationEvent>>) {
    *self.handler.lock().unwrap() = handler;
  }

  #[napi]
  pub fn bind(&self, handler: Option<ThreadsafeFunction<ApplicationEvent>>) {
    self.on_event(handler);
  }

  #[napi]
  pub fn create_browser_window(&self, options: Option<BrowserWindowOptions>) -> BrowserWindow {
    #[allow(clippy::arc_with_non_send_sync)]
    let inner = Arc::new(Mutex::new(None));
    #[allow(clippy::arc_with_non_send_sync)]
    let webviews_to_create = Arc::new(Mutex::new(Vec::new()));
    let options = options.unwrap_or(BrowserWindowOptions {
      resizable: Some(true),
      title: Some("Webview".to_string()),
      width: Some(800.0),
      height: Some(600.0),
      x: None,
      y: None,
      content_protection: None,
      always_on_top: None,
      always_on_bottom: None,
      visible: Some(true),
      decorations: Some(true),
      visible_on_all_workspaces: None,
      maximized: None,
      maximizable: None,
      minimizable: None,
      focused: None,
      transparent: None,
      fullscreen: None,
    });

    self.windows_to_create.lock().unwrap().push((
      options,
      inner.clone(),
      webviews_to_create.clone(),
    ));

    BrowserWindow {
      inner,
      webviews_to_create,
    }
  }

  #[napi]
  pub fn exit(&self) {
    *self.exit_requested.lock().unwrap() = true;
    let _ = self.event_loop_proxy.send_event(());
  }

  fn process_pending_items(&self, event_loop_target: &tao::event_loop::EventLoopWindowTarget<()>) {
    let mut pending = self.windows_to_create.lock().unwrap();
    for (opts, win_handle, webviews_to_create) in pending.drain(..) {
      let mut builder = tao::window::WindowBuilder::new()
        .with_title(opts.title.clone().unwrap_or_default())
        .with_inner_size(tao::dpi::LogicalSize::new(
          opts.width.unwrap_or(800.0),
          opts.height.unwrap_or(600.0),
        ))
        .with_resizable(opts.resizable.unwrap_or(true))
        .with_decorations(opts.decorations.unwrap_or(true))
        .with_always_on_top(opts.always_on_top.unwrap_or(false))
        .with_maximized(opts.maximized.unwrap_or(false))
        .with_focused(opts.focused.unwrap_or(true))
        .with_transparent(opts.transparent.unwrap_or(false))
        .with_visible(opts.visible.unwrap_or(true));

      if opts.transparent.unwrap_or(false) {
        #[cfg(target_os = "windows")]
        {
          builder = builder.with_undecorated_shadow(false);
        }
        #[cfg(target_os = "macos")]
        {
          builder = builder
            .with_titlebar_transparent(true)
            .with_fullsize_content_view(true);
        }
        #[cfg(any(
          target_os = "linux",
          target_os = "dragonfly",
          target_os = "freebsd",
          target_os = "netbsd",
          target_os = "openbsd"
        ))]
        {
          builder = builder.with_rgba_visual(true);
        }
      }

      if let Some(x) = opts.x {
        if let Some(y) = opts.y {
          builder = builder.with_position(tao::dpi::LogicalPosition::new(x, y));
        }
      }

      if let Ok(window) = builder.build(event_loop_target) {
        let mut handle = win_handle.lock().unwrap();
        *handle = Some(crate::tao::structs::Window {
          #[allow(clippy::arc_with_non_send_sync)]
          inner: Some(Arc::new(Mutex::new(window))),
        });

        // Create pending webviews for this window
        let mut pending_webviews = webviews_to_create.lock().unwrap();
        for (webview_opts, webview_handle, ipc_listeners, pending_actions) in
          pending_webviews.drain(..)
        {
          if let Ok(mut builder) = crate::wry::structs::WebViewBuilder::new() {
            if let Some(url) = webview_opts.url {
              let _ = builder.with_url(url);
            }
            if let Some(html) = webview_opts.html {
              let _ = builder.with_html(html);
            }
            if let Some(width) = webview_opts.width {
              let _ = builder.with_width(width as u32);
            }
            if let Some(height) = webview_opts.height {
              let _ = builder.with_height(height as u32);
            }
            if let Some(x) = webview_opts.x {
              let _ = builder.with_x(x as i32);
            }
            if let Some(y) = webview_opts.y {
              let _ = builder.with_y(y as i32);
            }
            if let Some(user_agent) = webview_opts.user_agent {
              let _ = builder.with_user_agent(user_agent);
            }
            if let Some(transparent) = webview_opts.transparent {
              let _ = builder.with_transparent(transparent);
            }
            if let Some(devtools) = webview_opts.enable_devtools {
              let _ = builder.with_devtools(devtools);
            }
            if let Some(incognito) = webview_opts.incognito {
              let _ = builder.with_incognito(incognito);
            }
            if let Some(hotkeys_zoom) = webview_opts.hotkeys_zoom {
              let _ = builder.with_hotkeys_zoom(hotkeys_zoom);
            }
            if let Some(clipboard) = webview_opts.clipboard {
              let _ = builder.with_clipboard(clipboard);
            }
            if let Some(autoplay) = webview_opts.autoplay {
              let _ = builder.with_autoplay(autoplay);
            }
            if let Some(back_forward_navigation_gestures) =
              webview_opts.back_forward_navigation_gestures
            {
              let _ =
                builder.with_back_forward_navigation_gestures(back_forward_navigation_gestures);
            }
            // Apply preload script as initialization script
            if let Some(preload) = webview_opts.preload {
              let init_script = crate::wry::structs::InitializationScript {
                js: preload,
                once: false,
              };
              let _ = builder.with_initialization_script(init_script);
            }
            // Build the webview - pass the ipc_listeners Arc directly to setup_ipc_handler
            if let Ok(webview) = builder.build_on_window(
              handle.as_ref().unwrap(),
              "webview".to_string(),
              Some(ipc_listeners.clone()),
            ) {
              let mut wv_handle = webview_handle.lock().unwrap();
              *wv_handle = Some(webview);

              // Apply any pending actions that were called before the webview was initialized
              apply_pending_actions(wv_handle.as_ref().unwrap(), &pending_actions);
            }
          }
        }
      }
    }
  }

  #[napi]
  pub fn run(&mut self) {
    let event_loop = self.event_loop.lock().unwrap().take();
    if let Some(event_loop) = event_loop {
      let handler_clone = self.handler.clone();
      let exit_requested = self.exit_requested.clone();
      #[allow(clippy::arc_with_non_send_sync)]
      let app_ref = Arc::new(self.clone_internal());

      event_loop.run(move |event, event_loop_target, control_flow| {
        *control_flow = tao::event_loop::ControlFlow::Wait;

        if *exit_requested.lock().unwrap() {
          *control_flow = tao::event_loop::ControlFlow::Exit;
          return;
        }

        app_ref.process_pending_items(event_loop_target);

        if let tao::event::Event::WindowEvent {
          event: tao::event::WindowEvent::CloseRequested,
          ..
        } = event
        {
          let mut h = handler_clone.lock().unwrap();
          if let Some(handler) = h.as_mut() {
            let _ = handler.call(
              Ok(ApplicationEvent {
                event: WebviewApplicationEvent::WindowCloseRequested,
              }),
              ThreadsafeFunctionCallMode::NonBlocking,
            );
          }
          *control_flow = tao::event_loop::ControlFlow::Exit;
        }
      });
    }
  }

  fn clone_internal(&self) -> Self {
    Self {
      event_loop: self.event_loop.clone(),
      event_loop_proxy: self.event_loop_proxy.clone(),
      handler: self.handler.clone(),
      windows_to_create: self.windows_to_create.clone(),
      exit_requested: self.exit_requested.clone(),
    }
  }

  #[napi]
  pub fn run_iteration(&mut self) -> bool {
    let mut keep_running = true;
    let mut event_loop_lock = self.event_loop.lock().unwrap();

    if let Some(event_loop) = event_loop_lock.as_mut() {
      use tao::platform::run_return::EventLoopExtRunReturn;

      let handler_clone = self.handler.clone();
      let exit_requested = self.exit_requested.clone();
      #[allow(clippy::arc_with_non_send_sync)]
      let app_ref = Arc::new(self.clone_internal());

      if *exit_requested.lock().unwrap() {
        return false;
      }

      event_loop.run_return(|event, event_loop_target, control_flow| {
        *control_flow = tao::event_loop::ControlFlow::Poll;

        app_ref.process_pending_items(event_loop_target);

        match event {
          tao::event::Event::WindowEvent {
            event: tao::event::WindowEvent::CloseRequested,
            ..
          } => {
            let mut h = handler_clone.lock().unwrap();
            if let Some(handler) = h.as_mut() {
              let _ = handler.call(
                Ok(ApplicationEvent {
                  event: WebviewApplicationEvent::WindowCloseRequested,
                }),
                ThreadsafeFunctionCallMode::NonBlocking,
              );
            }
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
    keep_running
  }
}

#[napi]
pub struct BrowserWindow {
  pub(crate) inner: Arc<Mutex<Option<crate::tao::structs::Window>>>,
  pub(crate) webviews_to_create: Arc<Mutex<Vec<PendingWebview>>>,
}

#[napi]
impl BrowserWindow {
  #[napi(getter)]
  pub fn id(&self) -> String {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      format!("{:?}", win.id())
    } else {
      "uninitialized".to_string()
    }
  }

  #[napi]
  pub fn create_webview(&self, options: Option<WebviewOptions>) -> Result<Webview> {
    #[allow(clippy::arc_with_non_send_sync)]
    let inner = Arc::new(Mutex::new(None));
    let ipc_listeners = Arc::new(Mutex::new(Vec::new()));
    let pending_actions = Arc::new(Mutex::new(Vec::new()));
    let options = options.unwrap_or(WebviewOptions {
      url: None,
      html: None,
      width: None,
      height: None,
      x: None,
      y: None,
      enable_devtools: None,
      incognito: None,
      user_agent: None,
      child: None,
      preload: None,
      transparent: None,
      theme: None,
      hotkeys_zoom: None,
      clipboard: None,
      autoplay: None,
      back_forward_navigation_gestures: None,
    });

    self.webviews_to_create.lock().unwrap().push((
      options,
      inner.clone(),
      ipc_listeners.clone(),
      pending_actions.clone(),
    ));

    Ok(Webview {
      inner,
      ipc_listeners,
      pending_actions,
    })
  }

  #[napi(getter)]
  pub fn is_child(&self) -> bool {
    false
  }

  #[napi]
  pub fn is_focused(&self) -> bool {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      win.is_focused().unwrap_or(false)
    } else {
      false
    }
  }

  #[napi]
  pub fn is_visible(&self) -> bool {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      win.is_visible().unwrap_or(false)
    } else {
      true
    }
  }

  #[napi]
  pub fn is_decorated(&self) -> bool {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      win.is_decorated().unwrap_or(true)
    } else {
      true
    }
  }

  #[napi]
  pub fn is_minimizable(&self) -> bool {
    true
  }

  #[napi]
  pub fn is_maximized(&self) -> bool {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      win.is_maximized().unwrap_or(false)
    } else {
      false
    }
  }

  #[napi]
  pub fn is_minimized(&self) -> bool {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      win.is_minimized().unwrap_or(false)
    } else {
      false
    }
  }

  #[napi]
  pub fn is_resizable(&self) -> bool {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      win.is_resizable().unwrap_or(true)
    } else {
      true
    }
  }

  #[napi]
  pub fn set_closable(&self, _closable: bool) {}

  #[napi]
  pub fn set_maximizable(&self, _maximizable: bool) {}

  #[napi]
  pub fn set_minimizable(&self, _minimizable: bool) {}

  #[napi]
  pub fn set_title(&self, title: String) {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      let _ = win.set_title(title);
    }
  }

  #[napi(getter)]
  pub fn title(&self) -> String {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      win.title().unwrap_or_default()
    } else {
      String::new()
    }
  }

  #[napi(getter)]
  pub fn theme(&self) -> Theme {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      match win.theme() {
        Ok(Some(crate::tao::enums::TaoTheme::Dark)) => Theme::Dark,
        _ => Theme::Light,
      }
    } else {
      Theme::Light
    }
  }

  #[napi(setter)]
  pub fn set_theme(&self, theme: Theme) {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      let t = match theme {
        Theme::Dark => crate::tao::enums::TaoTheme::Dark,
        _ => crate::tao::enums::TaoTheme::Light,
      };
      let _ = win.set_theme(t);
    }
  }

  #[napi]
  pub fn set_window_icon(&self, icon: Either<Buffer, String>, width: u32, height: u32) {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      let buf = match icon {
        Either::A(b) => b,
        Either::B(_) => return, // Skipping path-based for now
      };
      let _ = win.set_window_icon(width, height, buf);
    }
  }

  #[napi]
  pub fn remove_window_icon(&self) {}

  #[napi]
  pub fn set_visible(&self, visible: bool) {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      let _ = win.set_visible(visible);
    }
  }

  #[napi]
  pub fn set_progress_bar(&self, _state: ProgressBarState) {}

  #[napi]
  pub fn set_maximized(&self, value: bool) {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      let _ = win.set_maximized(value);
    }
  }

  #[napi]
  pub fn set_minimized(&self, value: bool) {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      let _ = win.set_minimized(value);
    }
  }

  #[napi]
  pub fn focus(&self) {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      let _ = win.request_focus();
    }
  }

  #[napi]
  pub fn get_available_monitors(&self) -> Vec<Monitor> {
    let mut monitors = Vec::new();
    for m in crate::tao::functions::available_monitors() {
      monitors.push(Monitor {
        name: m.name,
        scale_factor: m.scale_factor,
        size: Dimensions {
          width: m.size.width,
          height: m.size.height,
        },
        position: m.position,
        video_modes: Vec::new(),
      });
    }
    monitors
  }

  #[napi]
  pub fn get_primary_monitor(&self) -> Option<Monitor> {
    let m = crate::tao::functions::primary_monitor();
    Some(Monitor {
      name: m.name,
      scale_factor: m.scale_factor,
      size: Dimensions {
        width: m.size.width,
        height: m.size.height,
      },
      position: m.position,
      video_modes: Vec::new(),
    })
  }

  #[napi]
  pub fn set_content_protection(&self, _enabled: bool) {}

  #[napi]
  pub fn set_always_on_top(&self, enabled: bool) {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      let _ = win.set_always_on_top(enabled);
    }
  }

  #[napi]
  pub fn set_always_on_bottom(&self, _enabled: bool) {}

  #[napi]
  pub fn set_decorations(&self, enabled: bool) {
    if let Some(win) = self.inner.lock().unwrap().as_ref() {
      let _ = win.set_decorated(enabled);
    }
  }

  #[napi(getter)]
  pub fn fullscreen(&self) -> Option<FullscreenType> {
    None
  }

  #[napi]
  pub fn show(&self) {
    self.set_visible(true);
  }
}

#[napi]
pub struct Webview {
  #[allow(clippy::arc_with_non_send_sync)]
  inner: Arc<Mutex<Option<crate::wry::structs::WebView>>>,
  ipc_listeners: Arc<Mutex<Vec<crate::wry::structs::IpcHandler>>>,
  #[allow(clippy::arc_with_non_send_sync)]
  pending_actions: Arc<Mutex<Vec<PendingWebviewAction>>>,
}

/// Applies all pending actions to the webview after it's been initialized.
fn apply_pending_actions(
  webview: &crate::wry::structs::WebView,
  pending_actions: &Arc<Mutex<Vec<PendingWebviewAction>>>,
) {
  let mut actions = pending_actions.lock().unwrap();
  let actions_vec = std::mem::take(&mut *actions);
  drop(actions);
  for action in actions_vec {
    match action {
      PendingWebviewAction::LoadUrl(url) => {
        let _ = webview.load_url(url);
      }
      PendingWebviewAction::LoadHtml(html) => {
        let _ = webview.load_html(html);
      }
      PendingWebviewAction::EvaluateScript(js) => {
        let _ = webview.evaluate_script(js);
      }
      PendingWebviewAction::OpenDevtools => {
        let _ = webview.open_devtools();
      }
      PendingWebviewAction::CloseDevtools => {
        let _ = webview.close_devtools();
      }
      PendingWebviewAction::Reload => {
        let _ = webview.reload();
      }
      PendingWebviewAction::Print => {
        let _ = webview.print();
      }
    }
  }
}

#[napi]
impl Webview {
  #[napi(getter)]
  pub fn id(&self) -> String {
    if let Some(webview) = self.inner.lock().unwrap().as_ref() {
      webview.id().unwrap_or_default()
    } else {
      "uninitialized".to_string()
    }
  }

  #[napi(getter)]
  pub fn label(&self) -> String {
    if let Some(webview) = self.inner.lock().unwrap().as_ref() {
      webview.label().unwrap_or_default()
    } else {
      "uninitialized".to_string()
    }
  }

  #[napi]
  pub fn on_ipc_message(&self, handler: Option<crate::wry::structs::IpcHandler>) {
    if let Some(h) = handler {
      self.ipc_listeners.lock().unwrap().push(h);
    }
  }

  #[napi]
  pub fn on(&self, handler: crate::wry::structs::IpcHandler) {
    self.ipc_listeners.lock().unwrap().push(handler);
  }

  #[napi]
  pub fn send(&self, message: String) -> Result<()> {
    if let Some(webview) = self.inner.lock().unwrap().as_ref() {
      webview.send(message)
    } else {
      Ok(())
    }
  }

  #[napi]
  pub fn load_url(&self, url: String) -> Result<()> {
    if let Some(webview) = self.inner.lock().unwrap().as_ref() {
      webview.load_url(url)
    } else {
      // Queue the action to be applied when the webview is initialized
      self
        .pending_actions
        .lock()
        .unwrap()
        .push(PendingWebviewAction::LoadUrl(url));
      Ok(())
    }
  }

  #[napi]
  pub fn load_html(&self, html: String) -> Result<()> {
    if let Some(webview) = self.inner.lock().unwrap().as_ref() {
      webview.load_html(html)
    } else {
      // Queue the action to be applied when the webview is initialized
      self
        .pending_actions
        .lock()
        .unwrap()
        .push(PendingWebviewAction::LoadHtml(html));
      Ok(())
    }
  }

  #[napi]
  pub fn evaluate_script(&self, js: String) -> Result<()> {
    if let Some(webview) = self.inner.lock().unwrap().as_ref() {
      webview.evaluate_script(js)
    } else {
      // Queue the action to be applied when the webview is initialized
      self
        .pending_actions
        .lock()
        .unwrap()
        .push(PendingWebviewAction::EvaluateScript(js));
      Ok(())
    }
  }

  #[napi]
  pub fn open_devtools(&self) {
    if let Some(webview) = self.inner.lock().unwrap().as_ref() {
      let _ = webview.open_devtools();
    } else {
      // Queue the action to be applied when the webview is initialized
      self
        .pending_actions
        .lock()
        .unwrap()
        .push(PendingWebviewAction::OpenDevtools);
    }
  }

  #[napi]
  pub fn close_devtools(&self) {
    if let Some(webview) = self.inner.lock().unwrap().as_ref() {
      let _ = webview.close_devtools();
    } else {
      // Queue the action to be applied when the webview is initialized
      self
        .pending_actions
        .lock()
        .unwrap()
        .push(PendingWebviewAction::CloseDevtools);
    }
  }

  #[napi]
  pub fn is_devtools_open(&self) -> bool {
    if let Some(webview) = self.inner.lock().unwrap().as_ref() {
      webview.is_devtools_open().unwrap_or(false)
    } else {
      // Check if we have a pending OpenDevtools action
      let pending = self.pending_actions.lock().unwrap();
      pending
        .iter()
        .any(|action| matches!(action, PendingWebviewAction::OpenDevtools))
    }
  }

  #[napi]
  pub fn reload(&self) {
    if let Some(webview) = self.inner.lock().unwrap().as_ref() {
      let _ = webview.reload();
    } else {
      // Queue the action to be applied when the webview is initialized
      self
        .pending_actions
        .lock()
        .unwrap()
        .push(PendingWebviewAction::Reload);
    }
  }

  #[napi]
  pub fn print(&self) {
    if let Some(webview) = self.inner.lock().unwrap().as_ref() {
      let _ = webview.print();
    } else {
      // Queue the action to be applied when the webview is initialized
      self
        .pending_actions
        .lock()
        .unwrap()
        .push(PendingWebviewAction::Print);
    }
  }
}

#[napi]
pub fn get_webview_version() -> String {
  wry::webview_version().unwrap_or("unknown".to_string())
}

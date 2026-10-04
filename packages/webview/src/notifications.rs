use napi::{bindgen_prelude::Buffer, threadsafe_function::ThreadsafeFunction, Result};
use napi_derive::napi;

type NotificationEventThreadsafeFunction = ThreadsafeFunction<
  NotificationEventPayload,
  (),
  NotificationEventPayload,
  napi::Status,
  true, // CalleeHandled
  true, // Weak
>;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use napi::threadsafe_function::ThreadsafeFunctionCallMode;

#[cfg(all(
  unix,
  not(any(target_os = "macos", target_os = "android", target_os = "ios"))
))]
use std::sync::{Arc, Mutex};

#[napi(object)]
pub struct NativeNotificationAction {
  pub action: String,
  pub title: String,
  pub icon: Option<String>,
}

#[napi(object)]
pub struct NativeNotificationOptions {
  pub title: String,
  pub body: Option<String>,
  pub icon: Option<String>,
  pub image_path: Option<String>,
  pub image_data: Option<Buffer>,
  pub require_interaction: Option<bool>,
  pub persistent: bool,
  pub actions: Vec<NativeNotificationAction>,
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
struct TemporaryNotificationImage(tempfile::NamedTempFile);

#[cfg(any(target_os = "windows", target_os = "macos"))]
impl TemporaryNotificationImage {
  fn from_image(image: &image::DynamicImage) -> std::result::Result<Self, String> {
    let mut file = tempfile::Builder::new()
      .prefix("webviewjs-notification-")
      .suffix(".png")
      .tempfile()
      .map_err(|error| format!("Failed to create temporary notification image: {error}"))?;
    image
      .write_to(file.as_file_mut(), image::ImageFormat::Png)
      .map_err(|error| format!("Failed to encode notification image: {error}"))?;
    Ok(Self(file))
  }

  fn path(&self) -> &std::path::Path {
    self.0.path()
  }
}

#[napi(object)]
pub struct NotificationEventPayload {
  pub event: String,
  pub action: Option<String>,
  pub error: Option<String>,
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn emit(
  callback: &NotificationEventThreadsafeFunction,
  event: &str,
  action: Option<String>,
  error: Option<String>,
) {
  let _ = callback.call(
    Ok(NotificationEventPayload {
      event: event.to_string(),
      action,
      error,
    }),
    ThreadsafeFunctionCallMode::NonBlocking,
  );
}

#[cfg(target_os = "windows")]
fn windows_notifications_enabled() -> bool {
  use std::{ffi::c_void, ptr};
  use windows_sys::Win32::{
    Foundation::ERROR_SUCCESS,
    System::Registry::{RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_DWORD},
  };

  let subkey: Vec<u16> = "Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications\0"
    .encode_utf16()
    .collect();
  let value_name: Vec<u16> = "ToastEnabled\0".encode_utf16().collect();
  let mut enabled = 1_u32;
  let mut size = std::mem::size_of::<u32>() as u32;
  let status = unsafe {
    RegGetValueW(
      HKEY_CURRENT_USER,
      subkey.as_ptr(),
      value_name.as_ptr(),
      RRF_RT_REG_DWORD,
      ptr::null_mut(),
      (&mut enabled as *mut u32).cast::<c_void>(),
      &mut size,
    )
  };

  status != ERROR_SUCCESS || enabled != 0
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn response_payload(
  response: &notify_rust::NotificationResponse,
) -> (&'static str, Option<String>) {
  use notify_rust::NotificationResponse;

  match response {
    NotificationResponse::Default => ("click", Some(String::new())),
    NotificationResponse::Action(action) => ("click", Some(action.clone())),
    NotificationResponse::Reply(reply) => ("click", Some(reply.clone())),
    NotificationResponse::Closed(_) => ("close", None),
  }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn emit_response(
  callback: &NotificationEventThreadsafeFunction,
  response: &notify_rust::NotificationResponse,
) {
  let (event, action) = response_payload(response);
  emit(callback, event, action, None);
}

#[napi(js_name = "NativeNotification")]
pub struct JsNotification {
  #[cfg(all(
    unix,
    not(any(target_os = "macos", target_os = "android", target_os = "ios"))
  ))]
  handle: Arc<Mutex<Option<Arc<notify_rust::NotificationHandle>>>>,
}

#[napi]
impl JsNotification {
  #[napi(constructor)]
  pub fn new(
    options: NativeNotificationOptions,
    callback: NotificationEventThreadsafeFunction,
  ) -> Result<Self> {
    #[cfg(target_os = "windows")]
    if !windows_notifications_enabled() {
      emit(
        &callback,
        "error",
        None,
        Some("Windows notifications are disabled in system settings".to_string()),
      );
      return Ok(Self {});
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
      use notify_rust::{Notification, Timeout};

      let mut notification = Notification::new();
      #[cfg(any(target_os = "windows", target_os = "macos"))]
      let mut temporary_image: Option<TemporaryNotificationImage> = None;
      #[cfg(not(any(target_os = "windows", target_os = "macos")))]
      let temporary_image = None::<()>;
      notification.summary(&options.title);
      for action in &options.actions {
        notification.action(&action.action, &action.title);
      }
      if let Some(body) = options.body.as_deref() {
        notification.body(body);
      }
      if let Some(icon) = options.icon.as_deref() {
        notification.icon(icon);
      }
      if let Some(image_path) = options.image_path.as_deref() {
        notification.image_path(image_path);
      } else if let Some(image_data) = options.image_data.as_deref() {
        let decoded_image = match image::load_from_memory(image_data) {
          Ok(image) => image,
          Err(error) => {
            emit(
              &callback,
              "error",
              None,
              Some(format!("Failed to decode notification image: {error}")),
            );
            return Ok(Self {
              #[cfg(all(
                unix,
                not(any(target_os = "macos", target_os = "android", target_os = "ios"))
              ))]
              handle: Arc::new(Mutex::new(None)),
            });
          }
        };

        #[cfg(all(unix, not(target_os = "macos")))]
        {
          let rgba = decoded_image.to_rgba8();
          let (width, height) = rgba.dimensions();
          match notify_rust::Image::from_rgba(width as i32, height as i32, rgba.into_raw()) {
            Ok(image) => {
              notification.image_data(image);
            }
            Err(error) => {
              emit(&callback, "error", None, Some(error.to_string()));
              return Ok(Self {
                #[cfg(all(
                  unix,
                  not(any(target_os = "macos", target_os = "android", target_os = "ios"))
                ))]
                handle: Arc::new(Mutex::new(None)),
              });
            }
          }
        }

        #[cfg(any(target_os = "windows", target_os = "macos"))]
        {
          match TemporaryNotificationImage::from_image(&decoded_image) {
            Ok(image) => {
              notification.image_path(&image.path().to_string_lossy());
              temporary_image = Some(image);
            }
            Err(error) => {
              emit(&callback, "error", None, Some(error));
              return Ok(Self {
                #[cfg(all(
                  unix,
                  not(any(target_os = "macos", target_os = "android", target_os = "ios"))
                ))]
                handle: Arc::new(Mutex::new(None)),
              });
            }
          }
        }
      }
      if options.require_interaction == Some(true) {
        notification.timeout(Timeout::Never);
      }

      match notification.show() {
        Ok(handle) => {
          emit(&callback, "show", None, None);

          #[cfg(all(
            unix,
            not(any(target_os = "macos", target_os = "android", target_os = "ios"))
          ))]
          {
            let handle = Arc::new(handle);
            let stored_handle = Arc::new(Mutex::new(Some(Arc::clone(&handle))));
            let event_callback = callback;
            std::thread::spawn(move || {
              let _temporary_image = temporary_image;
              futures_lite::future::block_on(handle.wait_for_action_async(|response| {
                emit_response(&event_callback, response);
              }));
            });
            return Ok(Self {
              handle: stored_handle,
            });
          }

          #[cfg(not(all(
            unix,
            not(any(target_os = "macos", target_os = "android", target_os = "ios"))
          )))]
          {
            std::thread::spawn(move || {
              let _temporary_image = temporary_image;
              if let Err(error) =
                handle.wait_for_response(|response: &notify_rust::NotificationResponse| {
                  emit_response(&callback, response);
                })
              {
                emit(&callback, "error", None, Some(error.to_string()));
              }
            });
            return Ok(Self {});
          }
        }
        Err(error) => {
          emit(&callback, "error", None, Some(error.to_string()));
        }
      }
    }

    #[cfg(target_os = "ios")]
    {
      let _ = (options, callback);
      return Err(crate::mobile::unsupported_feature_error(
        "native notifications",
      ));
    }

    #[cfg(not(target_os = "ios"))]
    {
      #[cfg(target_os = "android")]
      let _ = (options, callback);

      Ok(Self {
        #[cfg(all(
          unix,
          not(any(target_os = "macos", target_os = "android", target_os = "ios"))
        ))]
        handle: Arc::new(Mutex::new(None)),
      })
    }
  }

  #[napi]
  pub fn close(&self) {
    #[cfg(all(
      unix,
      not(any(target_os = "macos", target_os = "android", target_os = "ios"))
    ))]
    {
      let handle = self.handle.lock().ok().and_then(|mut slot| slot.take());
      if let Some(handle) = handle {
        futures_lite::future::block_on(handle.close_async());
      }
    }
  }
}

#[cfg(all(test, not(any(target_os = "android", target_os = "ios"))))]
mod tests {
  use super::response_payload;
  use notify_rust::{CloseReason, NotificationResponse};

  #[test]
  fn native_notification_responses_map_to_click_and_close_events() {
    assert_eq!(
      response_payload(&NotificationResponse::Default),
      ("click", Some(String::new()))
    );
    assert_eq!(
      response_payload(&NotificationResponse::Action("open".to_owned())),
      ("click", Some("open".to_owned()))
    );
    assert_eq!(
      response_payload(&NotificationResponse::Reply("hello".to_owned())),
      ("click", Some("hello".to_owned()))
    );
    assert_eq!(
      response_payload(&NotificationResponse::Closed(CloseReason::Dismissed)),
      ("close", None)
    );
  }
}

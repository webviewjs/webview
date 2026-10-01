use napi::Result;
use napi_derive::napi;

use crate::types::TrayIconOptions;

#[napi(js_name = "TrayIcon")]
pub struct JsTrayIcon;

impl JsTrayIcon {
  pub(crate) fn create(_options: TrayIconOptions) -> Result<Self> {
    Err(napi::Error::new(
      napi::Status::GenericFailure,
      "System tray icons are not supported on Android",
    ))
  }
}

#[napi]
impl JsTrayIcon {
  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Self::create(TrayIconOptions {
      id: None,
      icon: None,
      tooltip: None,
      title: None,
      menu: None,
      icon_is_template: None,
      menu_on_left_click: None,
      menu_on_right_click: None,
    })
  }

  #[napi]
  pub fn dispose(&self) {}

  #[napi]
  pub fn is_disposed(&self) -> bool {
    true
  }
}

use napi::bindgen_prelude::FunctionRef;
use napi::Result;
use napi_derive::napi;

use crate::types::{TrayEventPayload, TrayIconOptions};

#[napi(js_name = "TrayIcon")]
pub struct JsTrayIcon {
  id: String,
}

impl JsTrayIcon {
  pub(crate) fn create(_options: TrayIconOptions) -> Result<Self> {
    Err(crate::mobile::unsupported_feature_error(
      "system tray icons",
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

  #[napi(getter)]
  pub fn id(&self) -> String {
    self.id.clone()
  }

  /// Keeps the unsupported tray binding's generated type compatible with the JS wrapper.
  #[napi(js_name = "_onTrayEvent")]
  pub fn on_tray_event(&self, _handler: Option<FunctionRef<TrayEventPayload, ()>>) {}

  #[napi]
  pub fn set_icon(
    &self,
    _icon: napi::Either<&[u8], Vec<u8>>,
    _width: Option<u32>,
    _height: Option<u32>,
  ) -> Result<()> {
    Err(crate::mobile::unsupported_feature_error(
      "system tray icon updates",
    ))
  }

  #[napi]
  pub fn remove_icon(&self) -> Result<()> {
    Err(crate::mobile::unsupported_feature_error(
      "system tray icon updates",
    ))
  }

  #[napi]
  pub fn set_menu(&self, _menu: Option<crate::types::MenuOptions>) -> Result<()> {
    Err(crate::mobile::unsupported_feature_error(
      "system tray menus",
    ))
  }

  #[napi]
  pub fn set_tooltip(&self, _tooltip: Option<String>) -> Result<()> {
    Err(crate::mobile::unsupported_feature_error(
      "system tray icon updates",
    ))
  }

  #[napi]
  pub fn set_title(&self, _title: Option<String>) -> Result<()> {
    Err(crate::mobile::unsupported_feature_error(
      "system tray icon updates",
    ))
  }

  #[napi]
  pub fn set_visible(&self, _visible: bool) -> Result<()> {
    Err(crate::mobile::unsupported_feature_error(
      "system tray icon updates",
    ))
  }

  #[napi]
  pub fn set_icon_as_template(&self, _value: bool) -> Result<()> {
    Err(crate::mobile::unsupported_feature_error(
      "system tray icon updates",
    ))
  }

  #[napi]
  pub fn set_show_menu_on_left_click(&self, _value: bool) -> Result<()> {
    Err(crate::mobile::unsupported_feature_error(
      "system tray icon updates",
    ))
  }

  #[napi]
  pub fn set_show_menu_on_right_click(&self, _value: bool) -> Result<()> {
    Err(crate::mobile::unsupported_feature_error(
      "system tray icon updates",
    ))
  }

  #[napi]
  pub fn show_menu(&self) -> Result<()> {
    Err(crate::mobile::unsupported_feature_error(
      "system tray menus",
    ))
  }

  #[napi]
  pub fn rect(&self) -> Option<crate::types::TrayRect> {
    None
  }

  #[napi]
  pub fn dispose(&self) {}

  #[napi]
  pub fn is_disposed(&self) -> bool {
    true
  }
}

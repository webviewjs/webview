use std::{cell::RefCell, rc::Rc};

use image::GenericImageView;
use napi::{bindgen_prelude::FunctionRef, Either, Result};
use napi_derive::napi;
use tray_icon::{MouseButton, MouseButtonState, TrayIcon as NativeTrayIcon, TrayIconBuilder};

use crate::{
  menu::create_menu_from_options,
  types::{MenuOptions, TrayEventPayload, TrayIconImage, TrayIconOptions, TrayRect},
};

pub(crate) type TrayEventHandler = Rc<RefCell<Option<FunctionRef<TrayEventPayload, ()>>>>;
pub(crate) type TrayResource = Rc<RefCell<Option<NativeTrayIcon>>>;

fn decode_icon(bytes: &[u8], width: Option<u32>, height: Option<u32>) -> Result<tray_icon::Icon> {
  let (rgba, width, height) = match (width, height) {
    (Some(width), Some(height)) => (bytes.to_vec(), width, height),
    (Some(width), None) => (bytes.to_vec(), width, width),
    (None, None) => {
      let image = image::load_from_memory(bytes)
        .map_err(|e| napi::Error::new(napi::Status::InvalidArg, e.to_string()))?;
      let (width, height) = image.dimensions();
      (image.to_rgba8().into_raw(), width, height)
    }
    _ => {
      return Err(napi::Error::new(
        napi::Status::InvalidArg,
        "height requires width",
      ))
    }
  };
  tray_icon::Icon::from_rgba(rgba, width, height)
    .map_err(|e| napi::Error::new(napi::Status::InvalidArg, e.to_string()))
}

fn image_icon(image: TrayIconImage) -> Result<tray_icon::Icon> {
  decode_icon(image.data.as_ref(), image.width, image.height)
}

#[napi(js_name = "TrayIcon")]
pub struct JsTrayIcon {
  id: String,
  inner: TrayResource,
  handler: TrayEventHandler,
}

impl JsTrayIcon {
  pub(crate) fn create(options: TrayIconOptions) -> Result<Self> {
    let mut builder = TrayIconBuilder::new();
    if let Some(id) = options.id {
      builder = builder.with_id(id);
    }
    if let Some(image) = options.icon {
      builder = builder.with_icon(image_icon(image)?);
    }
    if let Some(tooltip) = options.tooltip {
      builder = builder.with_tooltip(tooltip);
    }
    if let Some(title) = options.title {
      builder = builder.with_title(title);
    }
    if let Some(menu) = options.menu {
      builder = builder.with_menu(Box::new(create_menu_from_options(menu)?));
    }
    if let Some(value) = options.icon_is_template {
      builder = builder.with_icon_as_template(value);
    }
    if let Some(value) = options.menu_on_left_click {
      builder = builder.with_menu_on_left_click(value);
    }
    if let Some(value) = options.menu_on_right_click {
      builder = builder.with_menu_on_right_click(value);
    }
    let inner = builder
      .build()
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))?;
    let id = inner.id().0.clone();
    Ok(Self {
      id,
      inner: Rc::new(RefCell::new(Some(inner))),
      handler: Rc::new(RefCell::new(None)),
    })
  }

  pub(crate) fn event_handler(&self) -> TrayEventHandler {
    Rc::clone(&self.handler)
  }

  pub(crate) fn resource(&self) -> TrayResource {
    Rc::clone(&self.inner)
  }

  fn with_inner<T>(&self, operation: impl FnOnce(&NativeTrayIcon) -> Result<T>) -> Result<T> {
    let inner = self.inner.borrow();
    let inner = inner.as_ref().ok_or_else(|| {
      napi::Error::new(napi::Status::GenericFailure, "TrayIcon has been disposed")
    })?;
    operation(inner)
  }
}

#[napi]
impl JsTrayIcon {
  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Err(napi::Error::new(
      napi::Status::GenericFailure,
      "TrayIcon must be created with app.createTrayIcon(options)",
    ))
  }

  #[napi(getter)]
  pub fn id(&self) -> String {
    self.id.clone()
  }

  #[napi(js_name = "_onTrayEvent")]
  pub fn on_tray_event(&self, handler: Option<FunctionRef<TrayEventPayload, ()>>) {
    *self.handler.borrow_mut() = handler;
  }

  #[napi]
  pub fn set_icon(
    &self,
    icon: Either<&[u8], Vec<u8>>,
    width: Option<u32>,
    height: Option<u32>,
  ) -> Result<()> {
    let bytes = match &icon {
      Either::A(bytes) => *bytes,
      Either::B(bytes) => bytes.as_slice(),
    };
    let icon = decode_icon(bytes, width, height)?;
    self.with_inner(|inner| {
      inner
        .set_icon(Some(icon))
        .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
    })
  }

  #[napi]
  pub fn remove_icon(&self) -> Result<()> {
    self.with_inner(|inner| {
      inner
        .set_icon(None)
        .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
    })
  }

  #[napi]
  pub fn set_menu(&self, menu: Option<MenuOptions>) -> Result<()> {
    let menu = menu
      .map(create_menu_from_options)
      .transpose()?
      .map(|menu| Box::new(menu) as Box<dyn tray_icon::menu::ContextMenu>);
    self.with_inner(|inner| {
      inner.set_menu(menu);
      Ok(())
    })
  }

  #[napi]
  pub fn set_tooltip(&self, tooltip: Option<String>) -> Result<()> {
    self.with_inner(|inner| {
      inner
        .set_tooltip(tooltip)
        .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
    })
  }

  #[napi]
  pub fn set_title(&self, title: Option<String>) -> Result<()> {
    self.with_inner(|inner| {
      inner.set_title(title);
      Ok(())
    })
  }

  #[napi]
  pub fn set_visible(&self, visible: bool) -> Result<()> {
    self.with_inner(|inner| {
      inner
        .set_visible(visible)
        .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))
    })
  }

  #[napi]
  pub fn set_icon_as_template(&self, value: bool) -> Result<()> {
    self.with_inner(|inner| {
      inner.set_icon_as_template(value);
      Ok(())
    })
  }

  #[napi]
  pub fn set_show_menu_on_left_click(&self, value: bool) -> Result<()> {
    self.with_inner(|inner| {
      inner.set_show_menu_on_left_click(value);
      Ok(())
    })
  }

  #[napi]
  pub fn set_show_menu_on_right_click(&self, value: bool) -> Result<()> {
    self.with_inner(|inner| {
      inner.set_show_menu_on_right_click(value);
      Ok(())
    })
  }

  #[napi]
  pub fn show_menu(&self) -> Result<()> {
    self.with_inner(|inner| {
      inner.show_menu();
      Ok(())
    })
  }

  #[napi]
  pub fn rect(&self) -> Option<TrayRect> {
    self
      .inner
      .borrow()
      .as_ref()
      .and_then(|inner| inner.rect().map(Into::into))
  }

  #[napi]
  pub fn dispose(&self) {
    self.handler.borrow_mut().take();
    self.inner.borrow_mut().take();
  }

  #[napi]
  pub fn is_disposed(&self) -> bool {
    self.inner.borrow().is_none()
  }
}

impl From<tray_icon::Rect> for TrayRect {
  fn from(rect: tray_icon::Rect) -> Self {
    Self {
      x: rect.position.x,
      y: rect.position.y,
      width: rect.size.width,
      height: rect.size.height,
    }
  }
}

pub(crate) fn event_payload(event: tray_icon::TrayIconEvent) -> Option<TrayEventPayload> {
  let (event_name, id, position, rect, button, button_state) = match event {
    tray_icon::TrayIconEvent::Click {
      id,
      position,
      rect,
      button,
      button_state,
    } => (
      "click",
      id,
      position,
      rect,
      Some(button),
      Some(button_state),
    ),
    tray_icon::TrayIconEvent::DoubleClick {
      id,
      position,
      rect,
      button,
    } => ("double-click", id, position, rect, Some(button), None),
    tray_icon::TrayIconEvent::Enter { id, position, rect } => {
      ("enter", id, position, rect, None, None)
    }
    tray_icon::TrayIconEvent::Move { id, position, rect } => {
      ("move", id, position, rect, None, None)
    }
    tray_icon::TrayIconEvent::Leave { id, position, rect } => {
      ("leave", id, position, rect, None, None)
    }
    _ => return None,
  };
  Some(TrayEventPayload {
    event: event_name.to_string(),
    id: id.0,
    x: position.x,
    y: position.y,
    rect: rect.into(),
    button: button.map(|value| {
      match value {
        MouseButton::Left => "left",
        MouseButton::Right => "right",
        MouseButton::Middle => "middle",
      }
      .to_string()
    }),
    button_state: button_state.map(|value| {
      match value {
        MouseButtonState::Up => "up",
        MouseButtonState::Down => "down",
      }
      .to_string()
    }),
  })
}

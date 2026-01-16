//! Tao enums
//!
//! This module contains all enums from the tao crate.

use napi_derive::napi;

use crate::tao::structs::MonitorInfo;

/// Control flow of the application event loop.
#[napi]
pub enum TaoControlFlow {
  /// The application will continue running normally.
  Poll,
  /// The application will wait until the specified time.
  WaitUntil,
  /// The application will exit.
  Exit,
  /// The application will exit with the given exit code.
  ExitWithCode,
}

/// Window event type.
#[napi]
pub enum WindowEvent {
  /// The window has been created.
  Created,
  /// The window is about to be closed.
  CloseRequested,
  /// The window has been destroyed.
  Destroyed,
  /// The window gained focus.
  Focused,
  /// The window lost focus.
  Unfocused,
  /// The window was moved.
  Moved,
  /// The window was resized.
  Resized,
  /// The window scale factor changed.
  ScaleFactorChanged,
  /// The window theme changed.
  ThemeChanged,
  /// The window was minimized.
  Minimized,
  /// The window was maximized.
  Maximized,
  /// The window was restored from minimized state.
  Restored,
  /// The window became visible.
  Visible,
  /// The window became invisible.
  Invisible,
}

/// Mouse button event.
#[napi]
pub enum MouseButton {
  /// Left mouse button.
  Left,
  /// Right mouse button.
  Right,
  /// Middle mouse button.
  Middle,
  /// Other mouse button.
  Other(u16),
}

/// Mouse button state.
#[napi]
pub enum MouseButtonState {
  /// The button was pressed.
  Pressed,
  /// The button was released.
  Released,
}

/// Keyboard key.
#[napi]
pub enum Key {
  /// The '1' key.
  Key1,
  /// The '2' key.
  Key2,
  /// The '3' key.
  Key3,
  /// The '4' key.
  Key4,
  /// The '5' key.
  Key5,
  /// The '6' key.
  Key6,
  /// The '7' key.
  Key7,
  /// The '8' key.
  Key8,
  /// The '9' key.
  Key9,
  /// The '0' key.
  Key0,
  /// The 'A' key.
  KeyA,
  /// The 'B' key.
  KeyB,
  /// The 'C' key.
  KeyC,
  /// The 'D' key.
  KeyD,
  /// The 'E' key.
  KeyE,
  /// The 'F' key.
  KeyF,
  /// The 'G' key.
  KeyG,
  /// The 'H' key.
  KeyH,
  /// The 'I' key.
  KeyI,
  /// The 'J' key.
  KeyJ,
  /// The 'K' key.
  KeyK,
  /// The 'L' key.
  KeyL,
  /// The 'M' key.
  KeyM,
  /// The 'N' key.
  KeyN,
  /// The 'O' key.
  KeyO,
  /// The 'P' key.
  KeyP,
  /// The 'Q' key.
  KeyQ,
  /// The 'R' key.
  KeyR,
  /// The 'S' key.
  KeyS,
  /// The 'T' key.
  KeyT,
  /// The 'U' key.
  KeyU,
  /// The 'V' key.
  KeyV,
  /// The 'W' key.
  KeyW,
  /// The 'X' key.
  KeyX,
  /// The 'Y' key.
  KeyY,
  /// The 'Z' key.
  KeyZ,
  /// The Escape key.
  Escape,
  /// The F1 key.
  F1,
  /// The F2 key.
  F2,
  /// The F3 key.
  F3,
  /// The F4 key.
  F4,
  /// The F5 key.
  F5,
  /// The F6 key.
  F6,
  /// The F7 key.
  F7,
  /// The F8 key.
  F8,
  /// The F9 key.
  F9,
  /// The F10 key.
  F10,
  /// The F11 key.
  F11,
  /// The F12 key.
  F12,
  /// The Snapshot key.
  Snapshot,
  /// The Scroll key.
  Scroll,
  /// The Pause key.
  Pause,
  /// The Insert key.
  Insert,
  /// The Home key.
  Home,
  /// The Delete key.
  Delete,
  /// The End key.
  End,
  /// The PageDown key.
  PageDown,
  /// The PageUp key.
  PageUp,
  /// The Left arrow key.
  Left,
  /// The Up arrow key.
  Up,
  /// The Right arrow key.
  Right,
  /// The Down arrow key.
  Down,
  /// The Backspace key.
  Backspace,
  /// The Enter key.
  Enter,
  /// The Space key.
  Space,
  /// The Compose key.
  Compose,
  /// The Numlock key.
  Numlock,
  /// The Numpad '0' key.
  Numpad0,
  /// The Numpad '1' key.
  Numpad1,
  /// The Numpad '2' key.
  Numpad2,
  /// The Numpad '3' key.
  Numpad3,
  /// The Numpad '4' key.
  Numpad4,
  /// The Numpad '5' key.
  Numpad5,
  /// The Numpad '6' key.
  Numpad6,
  /// The Numpad '7' key.
  Numpad7,
  /// The Numpad '8' key.
  Numpad8,
  /// The Numpad '9' key.
  Numpad9,
  /// The Numpad Add key.
  NumpadAdd,
  /// The Numpad Divide key.
  NumpadDivide,
  /// The Numpad Decimal key.
  NumpadDecimal,
  /// The Numpad Enter key.
  NumpadEnter,
  /// The Numpad Equals key.
  NumpadEquals,
  /// The Numpad Multiply key.
  NumpadMultiply,
  /// The Numpad Subtract key.
  NumpadSubtract,
  /// The Apostrophe key.
  Apostrophe,
  /// The CapsLock key.
  CapsLock,
  /// The Comma key.
  Comma,
  /// The Convert key.
  Convert,
  /// The Equal key.
  Equal,
  /// The Grave key.
  Grave,
  /// The LAlt key.
  LAlt,
  /// The LBracket key.
  LBracket,
  /// The LControl key.
  LControl,
  /// The LShift key.
  LShift,
  /// The LWin key.
  LWin,
  /// The NonConvert key.
  NonConvert,
  /// The Period key.
  Period,
  /// The RAlt key.
  RAlt,
  /// The RBracket key.
  RBracket,
  /// The RControl key.
  RControl,
  /// The RShift key.
  RShift,
  /// The RWin key.
  RWin,
  /// The Semicolon key.
  Semicolon,
  /// The Slash key.
  Slash,
  /// The Alt key (mapped).
  Alt,
  /// The Control key (mapped).
  Control,
  /// The Shift key (mapped).
  Shift,
  /// The Backslash key.
  Backslash,
  /// The NonUS# key.
  NonUsBackslash,
  /// The Tab key.
  Tab,
}

/// Modifier key state.
#[napi]
pub enum ModifiersState {
  /// The Shift key is pressed.
  Shift,
  /// The Control key is pressed.
  Control,
  /// The Alt key is pressed.
  Alt,
  /// The Super key is pressed.
  Super,
}

/// Cursor icon.
#[napi]
pub enum CursorIcon {
  Default,
  Crosshair,
  Hand,
  Arrow,
  Move,
  Text,
  Wait,
  Help,
  Progress,
  NotAllowed,
  EastResize,
  NorthResize,
  NortheastResize,
  NorthwestResize,
  SouthResize,
  SoutheastResize,
  SouthwestResize,
  WestResize,
  NorthSouthResize,
  EastWestResize,
  NortheastSouthwestResize,
  NorthwestSoutheastResize,
  ColumnResize,
  RowResize,
  AllScroll,
  ZoomIn,
  ZoomOut,
}

/// Window theme.
#[napi]
pub enum TaoTheme {
  /// Light theme.
  Light,
  /// Dark theme.
  Dark,
}

/// Fullscreen type.
#[napi]
pub enum TaoFullscreenType {
  /// Exclusive fullscreen.
  Exclusive,
  /// Borderless fullscreen.
  Borderless,
}

/// Window level.
#[napi]
pub enum WindowLevel {
  /// Normal window level.
  Normal,
  /// Always on top level.
  AlwaysOnTop,
  /// Always on bottom level.
  AlwaysOnBottom,
}

/// Ime state.
#[napi]
pub enum ImeState {
  /// IME is disabled.
  Disabled,
  /// IME is enabled.
  Enabled,
}

/// External error type.
#[napi]
pub enum ExternalError {
  /// Not supported error.
  NotSupported,
  /// OS error.
  Os(String),
}

/// Device event type.
#[napi]
pub enum DeviceEvent {
  /// Mouse motion.
  MouseMotion { delta_x: f64, delta_y: f64 },
  /// Mouse button event.
  MouseButton {
    button: u16,
    state: MouseButtonState,
  },
  /// Key event.
  Key {
    key_code: u32,
    state: MouseButtonState,
  },
}

/// Element state for input devices.
#[napi]
pub enum ElementState {
  Pressed,
  Released,
}

/// Force touch/pen pressure.
#[napi]
pub enum Force {
  Calibrated { force: f64, stage: u32 },
  Normalized(f64),
}

/// Mouse scroll delta.
#[napi]
pub enum MouseScrollDelta {
  LineDelta(u32, u32),
  PixelDelta(f64, f64),
}

/// Start cause of the event loop.
#[napi]
pub enum StartCause {
  Wait,
  WaitCancelled,
  Poll,
  ResumeCancelled,
  Init,
}

/// Touch phase.
#[napi]
pub enum TouchPhase {
  Started,
  Moved,
  Ended,
  Cancelled,
}

/// Device event filter.
#[napi]
pub enum DeviceEventFilter {
  Allow,
  AllowRepeated,
  Ignore,
}

/// Key code.
#[napi]
pub enum KeyCode {
  Key1,
  Key2,
  Key3,
  Key4,
  Key5,
  Key6,
  Key7,
  Key8,
  Key9,
  Key0,
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
  Escape,
  F1,
  F2,
  F3,
  F4,
  F5,
  F6,
  F7,
  F8,
  F9,
  F10,
  F11,
  F12,
  F13,
  F14,
  F15,
  F16,
  F17,
  F18,
  F19,
  F20,
  F21,
  F22,
  F23,
  F24,
  Snapshot,
  Scroll,
  Pause,
  Insert,
  Home,
  Delete,
  End,
  PageDown,
  PageUp,
  Left,
  Up,
  Right,
  Down,
  Backspace,
  Enter,
  Space,
  Compose,
  CapsLock,
  Numlock,
  Numpad0,
  Numpad1,
  Numpad2,
  Numpad3,
  Numpad4,
  Numpad5,
  Numpad6,
  Numpad7,
  Numpad8,
  Numpad9,
  NumpadAdd,
  NumpadDivide,
  NumpadDecimal,
  NumpadEnter,
  NumpadEquals,
  NumpadMultiply,
  NumpadSubtract,
  Apostrophe,
  Comma,
  Equal,
  Grave,
  LAlt,
  LBracket,
  LControl,
  LShift,
  LWin,
  Period,
  RAlt,
  RBracket,
  RControl,
  RShift,
  RWin,
  Semicolon,
  Slash,
  Backslash,
  NonUsBackslash,
  Tab,
}

/// Key location on the keyboard.
#[napi]
pub enum KeyLocation {
  Standard,
  Left,
  Right,
  Numpad,
}

/// Bad icon error.
#[napi]
pub enum BadIcon {
  /// No icon data provided.
  NoData,
  /// Icon data is too large.
  TooLarge,
  /// Icon format is invalid.
  Format,
}

/// Fullscreen mode.
#[napi]
pub enum Fullscreen {
  Exclusive(MonitorInfo),
  Borderless(Option<MonitorInfo>),
}

/// Progress state for progress bar.
#[napi]
pub enum ProgressState {
  None,
  Normal,
  Indeterminate,
  Paused,
  Error,
}

/// Resize direction for window resizing.
#[napi]
pub enum ResizeDirection {
  East,
  North,
  Northeast,
  Northwest,
  South,
  Southeast,
  Southwest,
  West,
}

/// User attention type.
#[napi]
pub enum UserAttentionType {
  Critical,
  Informational,
}

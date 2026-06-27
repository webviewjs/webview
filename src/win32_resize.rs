use windows_sys::Win32::{
  Foundation::{BOOL, HWND, LPARAM, LRESULT, WPARAM},
  UI::WindowsAndMessaging::{
    GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_STYLE, SWP_FRAMECHANGED, SWP_NOMOVE,
    SWP_NOSIZE, SWP_NOZORDER, WM_NCCALCSIZE, WS_THICKFRAME,
  },
};
use winit::raw_window_handle::{HasWindowHandle, RawWindowHandle};

type SUBCLASSPROC = unsafe extern "system" fn(
  hwnd: HWND,
  umsg: u32,
  wparam: WPARAM,
  lparam: LPARAM,
  uid_subclass: usize,
  dw_ref_data: usize,
) -> LRESULT;

#[link(name = "comctl32")]
extern "system" {
  fn SetWindowSubclass(
    hwnd: HWND,
    pfn_subclass: SUBCLASSPROC,
    uid_subclass: usize,
    dw_ref_data: usize,
  ) -> BOOL;

  fn DefSubclassProc(hwnd: HWND, umsg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT;
}

unsafe extern "system" fn subclass_proc(
  hwnd: HWND,
  msg: u32,
  wparam: WPARAM,
  lparam: LPARAM,
  _uid: usize,
  _dw_ref_data: usize,
) -> LRESULT {
  // WM_NCCALCSIZE: collapse the non-client area so the client rect fills the
  // entire window.  This keeps the window visually borderless while
  // WS_THICKFRAME remains in the style (required for drag_resize_window).
  if msg == WM_NCCALCSIZE && wparam != 0 {
    return 0;
  }

  DefSubclassProc(hwnd, msg, wparam, lparam)
}

/// Prepare an undecorated+resizable window for JS-driven resize:
/// - Adds WS_THICKFRAME so winit's `drag_resize_window` can start an OS resize loop.
/// - Installs a subclass to return 0 from WM_NCCALCSIZE, keeping the window
///   visually borderless despite having WS_THICKFRAME.
pub fn install_resize_border(window: &winit::window::Window) {
  let Ok(handle) = window.window_handle() else {
    return;
  };
  let RawWindowHandle::Win32(h) = handle.as_raw() else {
    return;
  };
  let hwnd = h.hwnd.get() as HWND;

  unsafe {
    let style = GetWindowLongPtrW(hwnd, GWL_STYLE);
    // LONG_PTR is i32 on 32-bit and isize on 64-bit; use usize as a
    // common intermediary for the bit-OR, then let `as _` coerce back.
    SetWindowLongPtrW(
      hwnd,
      GWL_STYLE,
      (style as usize | WS_THICKFRAME as usize) as _,
    );
    // Force a frame recalculation so WS_THICKFRAME takes effect immediately.
    SetWindowPos(
      hwnd,
      0,
      0,
      0,
      0,
      0,
      SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED,
    );
    SetWindowSubclass(hwnd, subclass_proc, 1, 0);
  }
}

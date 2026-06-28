use windows_sys::Win32::{
  Foundation::{BOOL, HWND, LPARAM, LRESULT, WPARAM},
  UI::WindowsAndMessaging::{
    GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_STYLE, SWP_FRAMECHANGED, SWP_NOMOVE,
    SWP_NOSIZE, SWP_NOZORDER, WM_NCCALCSIZE, WS_THICKFRAME,
  },
};
use winit::raw_window_handle::{HasWindowHandle, RawWindowHandle};

type SubclassProc = unsafe extern "system" fn(
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
    pfn_subclass: SubclassProc,
    uid_subclass: usize,
    dw_ref_data: usize,
  ) -> BOOL;

  fn RemoveWindowSubclass(
    hwnd: HWND,
    pfn_subclass: SubclassProc,
    uid_subclass: usize,
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
  // WM_NCCALCSIZE: collapse the non-client area but keep 1px border for system shadow.
  // This keeps WS_THICKFRAME in the style (required for drag_resize_window) while
  // maintaining the drop shadow around the window.
  if msg == WM_NCCALCSIZE && wparam != 0 {
    use windows_sys::Win32::UI::WindowsAndMessaging::NCCALCSIZE_PARAMS;
    let params = &mut *(lparam as *mut NCCALCSIZE_PARAMS);
    
    // Keep 1px on all sides for shadow, but remove the rest of the non-client area
    params.rgrc[0].left += 1;
    params.rgrc[0].top += 1;
    params.rgrc[0].right -= 1;
    params.rgrc[0].bottom -= 1;
    
    return 0; // Use our calculated client area
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
    
    // Only add WS_THICKFRAME if not already present
    if (style as usize & WS_THICKFRAME as usize) == 0 {
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
    }
    
    // Always ensure the subclass is installed (SetWindowSubclass is idempotent with same uid)
    SetWindowSubclass(hwnd, subclass_proc, 1, 0);
  }
}

/// Remove the resize border subclass and WS_THICKFRAME when window becomes non-resizable.
pub fn uninstall_resize_border(window: &winit::window::Window) {
  let Ok(handle) = window.window_handle() else {
    return;
  };
  let RawWindowHandle::Win32(h) = handle.as_raw() else {
    return;
  };
  let hwnd = h.hwnd.get() as HWND;

  unsafe {
    // Remove the subclass
    RemoveWindowSubclass(hwnd, subclass_proc, 1);
    
    // Remove WS_THICKFRAME
    let style = GetWindowLongPtrW(hwnd, GWL_STYLE);
    SetWindowLongPtrW(
      hwnd,
      GWL_STYLE,
      (style as usize & !(WS_THICKFRAME as usize)) as _,
    );
    // Force a frame recalculation
    SetWindowPos(
      hwnd,
      0,
      0,
      0,
      0,
      0,
      SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED,
    );
  }
}

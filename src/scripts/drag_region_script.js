// Adapted from Tauri's window drag-region script:
// https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/window/scripts/drag.js
// Copyright 2019-2024 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT
(() => {
  const DRAG_REGION_ATTRIBUTE = 'data-webview-drag-region';
  const DRAG_REGION_MESSAGE = '__WEBVIEWJS_DRAG_REGION_MESSAGE__';
  const TOGGLE_MAXIMIZE_MESSAGE = '__WEBVIEWJS_TOGGLE_MAXIMIZE_MESSAGE__';
  const osName = __WEBVIEWJS_OS_NAME__;
  const CLICKABLE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'SUMMARY']);
  const INTERACTIVE_ROLES = new Set(['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'switch', 'option']);

  function isClickableElement(element) {
    return (
      CLICKABLE_TAGS.has(element.tagName) ||
      (element.hasAttribute('contenteditable') && element.getAttribute('contenteditable') !== 'false') ||
      (element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1') ||
      INTERACTIVE_ROLES.has(element.getAttribute('role'))
    );
  }

  function isDragRegion(composedPath) {
    for (const element of composedPath) {
      if (!(element instanceof HTMLElement)) continue;

      const attribute = element.getAttribute(DRAG_REGION_ATTRIBUTE);
      if (isClickableElement(element) && attribute === null) return false;
      if (attribute === null) continue;
      if (attribute === 'false') return false;
      if (attribute === 'deep') return true;
      if (attribute === '' || attribute === 'true') return element === composedPath[0];
    }

    return false;
  }

  let initialX = 0;
  let initialY = 0;

  document.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || (event.detail !== 1 && event.detail !== 2) || !isDragRegion(event.composedPath())) {
      return;
    }

    if (osName === 'macos' && event.detail === 2) {
      initialX = event.clientX;
      initialY = event.clientY;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    const message = event.detail === 2 ? TOGGLE_MAXIMIZE_MESSAGE : DRAG_REGION_MESSAGE;
    window.ipc.postMessage(message);
  });

  if (osName === 'macos') {
    document.addEventListener('mouseup', (event) => {
      if (
        event.button === 0 &&
        event.detail === 2 &&
        event.clientX === initialX &&
        event.clientY === initialY &&
        isDragRegion(event.composedPath())
      ) {
        window.ipc.postMessage(TOGGLE_MAXIMIZE_MESSAGE);
      }
    });
  }

  // Keep the page API's button-state check in capture phase, before page handlers run.
  let primaryDown = false;
  for (const type of ['mousedown', 'mousemove', 'mouseup']) {
    window.addEventListener(
      type,
      (event) => {
        if (!event.isTrusted) return;
        primaryDown = (event.buttons & 1) === 1;
      },
      true,
    );
  }

  // Leave an existing global alone, for example one defined by a preload script.
  if (!('webviewjs' in window)) {
    Object.defineProperty(window, 'webviewjs', {
      value: Object.freeze({
        startDragging() {
          if (primaryDown) window.ipc.postMessage(DRAG_REGION_MESSAGE);
        },
      }),
    });
  }
})();

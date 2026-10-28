(() => {
  const DRAG_REGION_SELECTOR = '[data-webview-drag-region]';
  const DRAG_REGION_ATTRIBUTE = 'data-webview-drag-region';
  const INTERACTIVE_SELECTOR =
    'a[href], area[href], button, input, select, textarea, label, summary, [contenteditable]:not([contenteditable="false"])';
  const DRAG_THRESHOLD = 4;
  let press = null;
  window.addEventListener('mousedown', (event) => {
    press = null;
    if (!event.isTrusted || event.button !== 0 || event.defaultPrevented) return;
    // composedPath() also reaches regions inside open shadow roots. It runs from the target outwards.
    const path = event.composedPath();
    const regionIndex = path.findIndex((node) => node instanceof Element && node.matches(DRAG_REGION_SELECTOR));
    if (regionIndex === -1) return;
    const region = path[regionIndex];
    if (region.getAttribute(DRAG_REGION_ATTRIBUTE) === 'false') return;
    const controlIndex = path.findIndex((node) => node instanceof Element && node.matches(INTERACTIVE_SELECTOR));
    if (controlIndex !== -1 && controlIndex <= regionIndex) return;
    event.preventDefault();
    press = { x: event.clientX, y: event.clientY };
  });
  window.addEventListener('mousemove', (event) => {
    if (!event.isTrusted || press === null || (event.buttons & 1) === 0) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_THRESHOLD) return;
    press = null;
    window.ipc.postMessage('__WEBVIEWJS_DRAG_REGION_MESSAGE__');
  });
  window.addEventListener('mouseup', () => {
    press = null;
  });
  // Track the primary button in the capture phase, so the API sees the state before page handlers run.
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
          if (primaryDown) window.ipc.postMessage('__WEBVIEWJS_DRAG_REGION_MESSAGE__');
        },
      }),
    });
  }
})();

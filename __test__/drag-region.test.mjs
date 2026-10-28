import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const DRAG_REGION_SELECTOR = '[data-webview-drag-region]';
const INTERACTIVE_SELECTOR =
  'a[href], area[href], button, input, select, textarea, label, summary, [contenteditable]:not([contenteditable="false"])';
const DRAG_REGION_MESSAGE = '__webviewjs_start_dragging__';
const DRAG_REGION_SCRIPT = readFileSync(new URL('../src/drag_region_script.js', import.meta.url), 'utf8').replaceAll(
  '__WEBVIEWJS_DRAG_REGION_MESSAGE__',
  DRAG_REGION_MESSAGE,
);

class FakeElement {
  constructor({ dragRegion, interactive = false } = {}) {
    this.dragRegion = dragRegion;
    this.interactive = interactive;
  }

  matches(selector) {
    if (selector === DRAG_REGION_SELECTOR) return this.dragRegion !== undefined;
    if (selector === INTERACTIVE_SELECTOR) return this.interactive;
    return false;
  }

  getAttribute(name) {
    return name === 'data-webview-drag-region' ? (this.dragRegion ?? null) : null;
  }
}

class FakeWindow {
  constructor() {
    this.listeners = new Map();
    this.messages = [];
    this.ipc = { postMessage: (message) => this.messages.push(message) };
  }

  addEventListener(type, callback, capture = false) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push({ callback, capture });
    this.listeners.set(type, listeners);
  }

  dispatch(type, { path = [], ...options } = {}) {
    const event = {
      isTrusted: options.isTrusted ?? true,
      button: options.button ?? 0,
      buttons: options.buttons ?? 0,
      defaultPrevented: options.defaultPrevented ?? false,
      clientX: options.clientX ?? 0,
      clientY: options.clientY ?? 0,
      composedPath: () => path,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };

    const listeners = [...(this.listeners.get(type) ?? [])].sort(
      (left, right) => Number(right.capture) - Number(left.capture),
    );
    for (const { callback } of listeners) callback(event);
    return event;
  }
}

function createDragRegionWindow() {
  const window = new FakeWindow();
  runInNewContext(DRAG_REGION_SCRIPT, { window, Element: FakeElement });
  return window;
}

test('the nearest nested drag region marker overrides its parent', () => {
  const window = createDragRegionWindow();
  const target = new FakeElement();
  const outerDraggable = new FakeElement({ dragRegion: '' });
  const innerOptOut = new FakeElement({ dragRegion: 'false' });

  const optedOutPress = window.dispatch('mousedown', {
    path: [target, innerOptOut, outerDraggable],
    buttons: 1,
  });
  assert.equal(optedOutPress.defaultPrevented, false);
  window.dispatch('mousemove', { buttons: 1, clientX: 8 });
  assert.deepEqual(window.messages, []);

  const innerDraggable = new FakeElement({ dragRegion: '' });
  const disabledParent = new FakeElement({ dragRegion: 'false' });
  const nestedDragPress = window.dispatch('mousedown', {
    path: [target, innerDraggable, disabledParent],
    buttons: 1,
  });
  assert.equal(nestedDragPress.defaultPrevented, true);
  window.dispatch('mousemove', { buttons: 1, clientX: 8 });
  assert.deepEqual(window.messages, [DRAG_REGION_MESSAGE]);
});

test('interactive children remain excluded from automatic dragging', () => {
  const window = createDragRegionWindow();
  const target = new FakeElement();
  const button = new FakeElement({ interactive: true });
  const region = new FakeElement({ dragRegion: '' });

  const buttonPress = window.dispatch('mousedown', {
    path: [target, button, region],
    buttons: 1,
  });
  assert.equal(buttonPress.defaultPrevented, false);
  window.dispatch('mousemove', { buttons: 1, clientX: 8 });
  assert.deepEqual(window.messages, []);

  const regionPress = window.dispatch('mousedown', { path: [target, region], buttons: 1 });
  assert.equal(regionPress.defaultPrevented, true);
  window.dispatch('mousemove', { buttons: 1, clientX: 8 });
  assert.deepEqual(window.messages, [DRAG_REGION_MESSAGE]);
});

test('untrusted mouse events do not change primary button tracking', () => {
  const window = createDragRegionWindow();

  window.dispatch('mousedown', { isTrusted: false, buttons: 1 });
  window.webviewjs.startDragging();
  assert.deepEqual(window.messages, []);

  window.dispatch('mousedown', { buttons: 1 });
  window.dispatch('mouseup', { isTrusted: false, buttons: 0 });
  window.webviewjs.startDragging();
  assert.deepEqual(window.messages, [DRAG_REGION_MESSAGE]);
});

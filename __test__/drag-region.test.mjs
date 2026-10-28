import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const DRAG_REGION_ATTRIBUTE = 'data-webview-drag-region';
const DRAG_REGION_MESSAGE = '__webviewjs_start_dragging__';
const TOGGLE_MAXIMIZE_MESSAGE = '__webviewjs_toggle_maximize__';
const SCRIPT_TEMPLATE = readFileSync(new URL('../src/drag_region_script.js', import.meta.url), 'utf8');

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, callback, capture = false) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push({ callback, capture });
    this.listeners.set(type, listeners);
  }
}

class FakeWindow extends FakeEventTarget {
  constructor() {
    super();
    this.messages = [];
    this.ipc = { postMessage: (message) => this.messages.push(message) };
  }
}

class FakeHTMLElement {
  constructor({ tagName = 'DIV', dragRegion, attributes = {} } = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(Object.entries(attributes));
    if (dragRegion !== undefined) this.attributes.set(DRAG_REGION_ATTRIBUTE, dragRegion);
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

function createEnvironment(osName = 'linux') {
  const window = new FakeWindow();
  const document = new FakeEventTarget();
  const script = SCRIPT_TEMPLATE.replaceAll('__WEBVIEWJS_DRAG_REGION_MESSAGE__', DRAG_REGION_MESSAGE)
    .replaceAll('__WEBVIEWJS_TOGGLE_MAXIMIZE_MESSAGE__', TOGGLE_MAXIMIZE_MESSAGE)
    .replace('__WEBVIEWJS_OS_NAME__', JSON.stringify(osName));

  runInNewContext(script, { window, document, HTMLElement: FakeHTMLElement });
  return { document, window };
}

function dispatchMouseEvent(environment, type, options = {}) {
  const event = {
    isTrusted: options.isTrusted ?? true,
    button: options.button ?? 0,
    buttons: options.buttons ?? (type === 'mousedown' ? 1 : 0),
    detail: options.detail ?? 1,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
    defaultPrevented: false,
    immediatePropagationStopped: false,
    composedPath: () => options.path ?? [],
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true;
    },
  };

  dispatchListeners(environment.window, type, event, true);
  if (!event.immediatePropagationStopped) dispatchListeners(environment.document, type, event, true);
  if (!event.immediatePropagationStopped) dispatchListeners(environment.document, type, event, false);
  if (!event.immediatePropagationStopped) dispatchListeners(environment.window, type, event, false);
  return event;
}

function dispatchListeners(target, type, event, capture) {
  for (const listener of target.listeners.get(type) ?? []) {
    if (listener.capture !== capture) continue;
    listener.callback(event);
    if (event.immediatePropagationStopped) return;
  }
}

test('bare and true regions are self-only while deep regions include descendants', () => {
  const { document, window } = createEnvironment();
  const bare = new FakeHTMLElement({ dragRegion: '' });

  const directBarePress = dispatchMouseEvent({ document, window }, 'mousedown', { path: [bare] });
  assert.equal(directBarePress.defaultPrevented, true);
  assert.equal(directBarePress.immediatePropagationStopped, true);
  assert.deepEqual(window.messages, [DRAG_REGION_MESSAGE]);

  const childPress = dispatchMouseEvent({ document, window }, 'mousedown', {
    path: [new FakeHTMLElement(), bare],
  });
  assert.equal(childPress.defaultPrevented, false);
  assert.deepEqual(window.messages, [DRAG_REGION_MESSAGE]);

  const trueRegion = new FakeHTMLElement({ dragRegion: 'true' });
  dispatchMouseEvent({ document, window }, 'mousedown', { path: [trueRegion] });
  assert.deepEqual(window.messages, [DRAG_REGION_MESSAGE, DRAG_REGION_MESSAGE]);

  const trueAncestorPress = dispatchMouseEvent({ document, window }, 'mousedown', {
    path: [new FakeHTMLElement(), trueRegion],
  });
  assert.equal(trueAncestorPress.defaultPrevented, false);
  assert.deepEqual(window.messages, [DRAG_REGION_MESSAGE, DRAG_REGION_MESSAGE]);

  const deepRegion = new FakeHTMLElement({ dragRegion: 'deep' });
  dispatchMouseEvent({ document, window }, 'mousedown', {
    path: [new FakeHTMLElement(), deepRegion],
  });
  assert.deepEqual(window.messages, [DRAG_REGION_MESSAGE, DRAG_REGION_MESSAGE, DRAG_REGION_MESSAGE]);

  const outerDeep = new FakeHTMLElement({ dragRegion: 'deep' });
  const innerDisabled = new FakeHTMLElement({ dragRegion: 'false' });
  const disabledPress = dispatchMouseEvent({ document, window }, 'mousedown', {
    path: [new FakeHTMLElement(), innerDisabled, outerDeep],
  });
  assert.equal(disabledPress.defaultPrevented, false);
  assert.deepEqual(window.messages, [DRAG_REGION_MESSAGE, DRAG_REGION_MESSAGE, DRAG_REGION_MESSAGE]);

  const innerDeep = new FakeHTMLElement({ dragRegion: 'deep' });
  const outerDisabled = new FakeHTMLElement({ dragRegion: 'false' });
  dispatchMouseEvent({ document, window }, 'mousedown', {
    path: [new FakeHTMLElement(), innerDeep, outerDisabled],
  });
  assert.deepEqual(window.messages, [
    DRAG_REGION_MESSAGE,
    DRAG_REGION_MESSAGE,
    DRAG_REGION_MESSAGE,
    DRAG_REGION_MESSAGE,
  ]);
});

test('unmarked interactive elements block inherited drag regions', () => {
  const interactiveElements = [
    { tagName: 'A' },
    { tagName: 'BUTTON' },
    { tagName: 'INPUT' },
    { tagName: 'SELECT' },
    { tagName: 'TEXTAREA' },
    { tagName: 'LABEL' },
    { tagName: 'SUMMARY' },
    { attributes: { contenteditable: '' } },
    { attributes: { contenteditable: 'true' } },
    { attributes: { tabindex: '0' } },
    { attributes: { role: 'menuitem' } },
  ];

  for (const elementOptions of interactiveElements) {
    const environment = createEnvironment();
    const interactive = new FakeHTMLElement(elementOptions);
    const region = new FakeHTMLElement({ dragRegion: 'deep' });
    const press = dispatchMouseEvent(environment, 'mousedown', { path: [interactive, region] });

    assert.equal(press.defaultPrevented, false, JSON.stringify(elementOptions));
    assert.deepEqual(environment.window.messages, [], JSON.stringify(elementOptions));
  }

  const environment = createEnvironment();
  const markedButton = new FakeHTMLElement({ tagName: 'BUTTON', dragRegion: 'deep' });
  dispatchMouseEvent(environment, 'mousedown', { path: [markedButton] });
  assert.deepEqual(environment.window.messages, [DRAG_REGION_MESSAGE]);
});

test('drag starts on mousedown and desktop double-click sends the maximize message', () => {
  const environment = createEnvironment('linux');
  const region = new FakeHTMLElement({ dragRegion: 'deep' });
  const path = [new FakeHTMLElement(), region];

  const press = dispatchMouseEvent(environment, 'mousedown', { path, detail: 1 });
  assert.equal(press.defaultPrevented, true);
  assert.deepEqual(environment.window.messages, [DRAG_REGION_MESSAGE]);

  const doubleClick = dispatchMouseEvent(environment, 'mousedown', { path, detail: 2 });
  assert.equal(doubleClick.defaultPrevented, true);
  assert.deepEqual(environment.window.messages, [DRAG_REGION_MESSAGE, TOGGLE_MAXIMIZE_MESSAGE]);
});

test('macOS double-click toggles on matching mouseup and cancels after pointer movement', () => {
  const path = [new FakeHTMLElement({ dragRegion: 'deep' })];
  const environment = createEnvironment('macos');
  const press = dispatchMouseEvent(environment, 'mousedown', {
    path,
    detail: 2,
    clientX: 20,
    clientY: 30,
  });
  assert.equal(press.defaultPrevented, false);
  assert.deepEqual(environment.window.messages, []);

  dispatchMouseEvent(environment, 'mouseup', { path, detail: 2, clientX: 20, clientY: 30 });
  assert.deepEqual(environment.window.messages, [TOGGLE_MAXIMIZE_MESSAGE]);

  const movedEnvironment = createEnvironment('macos');
  dispatchMouseEvent(movedEnvironment, 'mousedown', {
    path,
    detail: 2,
    clientX: 20,
    clientY: 30,
  });
  dispatchMouseEvent(movedEnvironment, 'mouseup', { path, detail: 2, clientX: 21, clientY: 30 });
  assert.deepEqual(movedEnvironment.window.messages, []);

  const outsideEnvironment = createEnvironment('macos');
  dispatchMouseEvent(outsideEnvironment, 'mousedown', {
    path,
    detail: 2,
    clientX: 20,
    clientY: 30,
  });
  dispatchMouseEvent(outsideEnvironment, 'mouseup', {
    path: [new FakeHTMLElement()],
    detail: 2,
    clientX: 20,
    clientY: 30,
  });
  assert.deepEqual(outsideEnvironment.window.messages, []);
});

test('untrusted mouse events do not change startDragging primary-button tracking', () => {
  const environment = createEnvironment();

  dispatchMouseEvent(environment, 'mousedown', { isTrusted: false, buttons: 1 });
  environment.window.webviewjs.startDragging();
  assert.deepEqual(environment.window.messages, []);

  dispatchMouseEvent(environment, 'mousedown', { buttons: 1 });
  dispatchMouseEvent(environment, 'mouseup', { isTrusted: false, buttons: 0 });
  environment.window.webviewjs.startDragging();
  assert.deepEqual(environment.window.messages, [DRAG_REGION_MESSAGE]);
});

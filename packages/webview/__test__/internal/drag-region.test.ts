import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, test } from 'bun:test';

const DRAG_REGION_MESSAGE = '__webviewjs_start_dragging__';
const TOGGLE_MAXIMIZE_MESSAGE = '__webviewjs_toggle_maximize__';
const SCRIPT_TEMPLATE = readFileSync(new URL('../../src/scripts/drag_region_script.js', import.meta.url), 'utf8');

class FakeEventTarget {
  listeners = new Map<string, Array<{ callback: (event: any) => void; capture: boolean }>>();

  addEventListener(type: string, callback: (event: any) => void, capture = false): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push({ callback, capture });
    this.listeners.set(type, listeners);
  }
}

class FakeWindow extends FakeEventTarget {
  messages: string[] = [];
  ipc = { postMessage: (message: string) => this.messages.push(message) };
}

class FakeHTMLElement {
  tagName: string;
  attributes: Map<string, string>;

  constructor({
    tagName = 'DIV',
    dragRegion,
    attributes = {},
  }: { tagName?: string; dragRegion?: string; attributes?: Record<string, string> } = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(Object.entries(attributes));
    if (dragRegion !== undefined) this.attributes.set('data-webview-drag-region', dragRegion);
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  getAttribute(name: string): string | null {
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

function dispatchMouseEvent(
  environment: ReturnType<typeof createEnvironment>,
  type: string,
  options: {
    isTrusted?: boolean;
    button?: number;
    buttons?: number;
    detail?: number;
    clientX?: number;
    clientY?: number;
    path?: FakeHTMLElement[];
  } = {},
) {
  const event = {
    isTrusted: options.isTrusted ?? true,
    button: options.button ?? 0,
    buttons: options.buttons ?? (type === 'mousedown' ? 1 : 0),
    detail: options.detail ?? 1,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
    immediatePropagationStopped: false,
    composedPath: () => options.path ?? [],
    preventDefault() {},
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

function dispatchListeners(
  target: FakeEventTarget,
  type: string,
  event: { immediatePropagationStopped: boolean },
  capture: boolean,
): void {
  for (const listener of target.listeners.get(type) ?? []) {
    if (listener.capture !== capture) continue;
    listener.callback(event);
    if (event.immediatePropagationStopped) return;
  }
}

test('drag regions support self-only, nested deep, false opt-outs, and interactive exclusions', () => {
  const environment = createEnvironment();
  const bare = new FakeHTMLElement({ dragRegion: '' });
  const direct = dispatchMouseEvent(environment, 'mousedown', { path: [bare] });
  expect(direct.immediatePropagationStopped).toBe(true);
  expect(environment.window.messages).toEqual([DRAG_REGION_MESSAGE]);

  const deep = new FakeHTMLElement({ dragRegion: 'deep' });
  dispatchMouseEvent(environment, 'mousedown', { path: [new FakeHTMLElement(), deep] });
  expect(environment.window.messages).toEqual([DRAG_REGION_MESSAGE, DRAG_REGION_MESSAGE]);

  const optedOut = new FakeHTMLElement({ dragRegion: 'false' });
  dispatchMouseEvent(environment, 'mousedown', { path: [new FakeHTMLElement(), optedOut, deep] });
  expect(environment.window.messages).toHaveLength(2);

  for (const interactive of [
    new FakeHTMLElement({ tagName: 'BUTTON' }),
    new FakeHTMLElement({ tagName: 'A' }),
    new FakeHTMLElement({ attributes: { contenteditable: 'true' } }),
    new FakeHTMLElement({ attributes: { tabindex: '0' } }),
    new FakeHTMLElement({ attributes: { role: 'menuitem' } }),
  ]) {
    dispatchMouseEvent(environment, 'mousedown', { path: [interactive, deep] });
  }
  expect(environment.window.messages).toHaveLength(2);
});

test('desktop double-click toggles maximization and macOS cancels a moved double-click', () => {
  const region = new FakeHTMLElement({ dragRegion: 'deep' });
  const linux = createEnvironment('linux');
  dispatchMouseEvent(linux, 'mousedown', { detail: 2, path: [region] });
  expect(linux.window.messages).toEqual([TOGGLE_MAXIMIZE_MESSAGE]);

  const macos = createEnvironment('macos');
  dispatchMouseEvent(macos, 'mousedown', { detail: 2, clientX: 12, clientY: 25, path: [region] });
  expect(macos.window.messages).toEqual([]);
  dispatchMouseEvent(macos, 'mouseup', { detail: 2, clientX: 12, clientY: 25, path: [region] });
  expect(macos.window.messages).toEqual([TOGGLE_MAXIMIZE_MESSAGE]);

  const moved = createEnvironment('macos');
  dispatchMouseEvent(moved, 'mousedown', { detail: 2, clientX: 12, clientY: 25, path: [region] });
  dispatchMouseEvent(moved, 'mouseup', { detail: 2, clientX: 13, clientY: 25, path: [region] });
  expect(moved.window.messages).toEqual([]);
});

test('page startDragging requires a trusted primary-button press and preserves existing globals', () => {
  const environment = createEnvironment();
  dispatchMouseEvent(environment, 'mousedown', { isTrusted: false, buttons: 1 });
  environment.window.webviewjs.startDragging();
  expect(environment.window.messages).toEqual([]);

  dispatchMouseEvent(environment, 'mousedown', { buttons: 1 });
  environment.window.webviewjs.startDragging();
  expect(environment.window.messages).toEqual([DRAG_REGION_MESSAGE]);

  const window = new FakeWindow();
  const previous = { startDragging() {} };
  window.webviewjs = previous;
  const script = SCRIPT_TEMPLATE.replaceAll('__WEBVIEWJS_DRAG_REGION_MESSAGE__', DRAG_REGION_MESSAGE)
    .replaceAll('__WEBVIEWJS_TOGGLE_MAXIMIZE_MESSAGE__', TOGGLE_MAXIMIZE_MESSAGE)
    .replace('__WEBVIEWJS_OS_NAME__', JSON.stringify('linux'));
  runInNewContext(script, { window, document: new FakeEventTarget(), HTMLElement: FakeHTMLElement });
  expect(window.webviewjs).toBe(previous);
});

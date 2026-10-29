import {
  Application,
  BrowserWindow,
  Notification,
  Theme,
  TrayIcon,
  WebContext,
  Webview,
  type BrowserWindowCloseEvent,
  type NotificationEventThreadsafeFunction,
  type WebviewDragEvent,
  type WebviewEventThreadsafeFunction,
  type WebviewNewWindowEvent,
  type WebviewScriptThreadsafeFunction,
} from '../../dist/index';

const app = new Application({ waitTime: 5 });
const window: BrowserWindow = app.createBrowserWindow({
  title: 'typed window',
  width: 800,
  height: 600,
  macosTitlebarTransparent: true,
  windowsDragAndDrop: false,
});
const context: WebContext = app.createWebContext({ dataDirectory: './profile' });
const view: Webview = window.createWebview({
  url: 'app://localhost/index.html',
  theme: Theme.Dark,
  webContext: context,
  navigationHandler: (url) => url.startsWith('app://'),
  newWindowHandler: (event: WebviewNewWindowEvent) => event.target === 'new-window',
  nativeFileDrop: true,
});
const tray: TrayIcon = app.createTrayIcon({ title: 'WebviewJS', tooltip: 'Open' });
const notification = new Notification('Ready', {
  persistent: true,
  actions: [{ action: 'open', title: 'Open' }],
});

app.on('ready', (event) => event.event);
app.onEvent((event) => event.event);
app.bind(null);
app.run({ interval: 16, ref: false });
app.stop();
void app.whenReady({ autoRun: false });
void app.whenReady({ interval: 16, ref: true });
window.on('close', (event: BrowserWindowCloseEvent) => event.preventDefault());
window.on('resize', (event) => event.width);
window.registerProtocol('app', async (request) => new Response(await request.text()));
view.on('navigation', (event) => event.target);
view.on('drag-enter', (event: WebviewDragEvent) => event.paths?.join(','));
view.on('drag-over', (event) => event.position?.x);
view.on('drag-drop', (event) => event.paths?.length);
view.on('drag-leave', (event) => event.event);
window.getCursorPosition(true);
app.setDockIcon(Buffer.from('image bytes'));
app.removeDockIcon();
view.setTheme(Theme.Dark);
view.onIpcMessage((message) => message.body);
view.expose('host', {
  answer: 42,
  greet(name: string) {
    return `hello ${name}`;
  },
});
tray.on('click', (event) => event.id);
notification.on('click', (event) => event.target);
app[Symbol.dispose]();
window[Symbol.dispose]();
view[Symbol.dispose]();
context[Symbol.dispose]();
tray[Symbol.dispose]();

const eventCallback: WebviewEventThreadsafeFunction = (_error, payload) => payload.event;
const scriptCallback: WebviewScriptThreadsafeFunction = (_error, value) => value;
const notificationCallback: NotificationEventThreadsafeFunction = (_error, payload) => payload.event;
void eventCallback;
void scriptCallback;
void notificationCallback;

// @ts-expect-error autoRun:false cannot accept interval
app.whenReady({ autoRun: false, interval: 1 });
// @ts-expect-error autoRun:false cannot accept ref
app.whenReady({ autoRun: false, ref: true });
// @ts-expect-error unsupported native BrowserWindow option
app.createBrowserWindow({ windowsSystemBackdrop: true });
// @ts-expect-error webContext must be a native WebContext
window.createWebview({ webContext: app });
// @ts-expect-error nativeFileDrop is boolean
window.createWebview({ nativeFileDrop: 'yes' });
view.on('drag-enter', (event) => {
  const path: string | undefined = event.paths?.[0];
  const x: number | undefined = event.position?.x;
  return { path, x };
});
window.on('resize', (event) => {
  // @ts-expect-error resize widths are numbers
  const width: string = event.width;
  return width;
});
// @ts-expect-error notification images accept only a path string or Buffer
new Notification('Invalid', { image: new Uint8Array(1) });

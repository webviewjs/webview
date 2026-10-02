import {
  Application,
  BrowserWindow,
  Notification,
  Theme,
  TrayIcon,
  WebContext,
  Webview,
  type BrowserWindowCloseEvent,
  type WebviewNewWindowEvent,
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

// @ts-expect-error autoRun:false cannot accept interval
app.whenReady({ autoRun: false, interval: 1 });
// @ts-expect-error autoRun:false cannot accept ref
app.whenReady({ autoRun: false, ref: true });
// @ts-expect-error unsupported native BrowserWindow option
app.createBrowserWindow({ windowsSystemBackdrop: true });
// @ts-expect-error webContext must be a native WebContext
window.createWebview({ webContext: app });
window.on('resize', (event) => {
  // @ts-expect-error resize widths are numbers
  const width: string = event.width;
  return width;
});
// @ts-expect-error notification images accept only a path string or Buffer
new Notification('Invalid', { image: new Uint8Array(1) });

const { Application } = require('../dist/index.js') as typeof import('../dist/index.js');

const delay = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main(): Promise<void> {
  const app = new Application();

  try {
    const window = app.createBrowserWindow({
      title: 'WebviewJS FreeBSD smoke test',
      width: 640,
      height: 480,
      menu: { items: [{ id: 'smoke', label: 'Smoke' }] },
    });
    if (!window.hasMenu()) {
      throw new Error('GTK menu was not attached to the native window');
    }

    const webview = window.createWebview({
      html: '<!doctype html><html><head><title>FreeBSD smoke</title></head><body>GTK WebKitGTK smoke test</body></html>',
    });
    if (!webview) {
      throw new Error('Wry did not create a webview');
    }

    let readyTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        app.whenReady({ interval: 16 }),
        new Promise<void>((_, reject) => {
          readyTimeout = setTimeout(() => reject(new Error('Application event loop did not become ready')), 10_000);
        }),
      ]);
    } finally {
      if (readyTimeout) clearTimeout(readyTimeout);
    }
    await delay(250);

    console.log('FreeBSD GTK/WebKitGTK smoke test passed');
  } finally {
    app.stop();
    app.exit();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

const WV = require('../index.js');
let app = new WV.Application();
(async function () {
  await app.whenReady();
  let win = app.createBrowserWindow({
    width: 400,
    height: 300,
  });
  win.createWebview({
    html: '<div data-webview-drag-region style="background:yellow;">bar</div>',
  });
})();

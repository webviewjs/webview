Object.defineProperty(window, __WEBVIEWJS_IPC_ALIAS_NAME__, {
  get: () => window.ipc,
  configurable: true,
  enumerable: true,
});

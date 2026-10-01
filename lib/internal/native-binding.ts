const nativeBinding: typeof import('../../js-bindings') = require('../../js-bindings.js');

export { nativeBinding };

export type NativeApplication = InstanceType<typeof nativeBinding.Application>;
export type NativeBrowserWindow = InstanceType<typeof nativeBinding.BrowserWindow>;
export type NativeWebview = InstanceType<typeof nativeBinding.Webview>;
export type NativeWebContext = InstanceType<typeof nativeBinding.WebContext>;
export type NativeTrayIcon = InstanceType<typeof nativeBinding.TrayIcon>;

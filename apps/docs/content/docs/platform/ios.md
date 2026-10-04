---
title: 'iOS'
description: 'Experimental iOS cross-build output for apps with an embedded Node-API host.'
---

WebviewJS has experimental Rust binding code for iOS, but it does not publish an iOS N-API package. The generated package loader and the locked `@napi-rs/cli` target list do not select iOS artifacts, so the regular npm installation path is not available on iOS.

## Build an experimental XCFramework

On macOS with Xcode and the stable Rust toolchain installed, run this from the repository root:

```sh
bun install
bun --filter @webviewjs/webview build:ios
```

The build compiles an iOS device library for `aarch64-apple-ios`, plus simulator libraries for `aarch64-apple-ios-sim` and `x86_64-apple-ios`. It combines the simulator architectures and creates:

```text
packages/webview/target/ios/release/Webview.xcframework
```

Use `bun --filter @webviewjs/webview build:ios -- --debug` for a debug build. The output is an app-embedding artifact, not an npm package. It is not included in `@webviewjs/webview`'s published files or N-API target list.

## Host requirements

The XCFramework contains the WebviewJS N-API addon only. Its framework executable is `Webview`, with the install name `@rpath/Webview.framework/Webview`. Apple's framework rules require the `CFBundleExecutable` value and executable filename to match the framework name without `.framework`; the executable therefore does not have a `.node` suffix. See [Apple's `CFBundleExecutable` reference](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleexecutable).

Your iOS app must supply a JavaScript host with a compatible Node-API runtime, embed and sign `Webview.xcframework`, and provide a loader for the addon's framework binary. The generated package loader uses `require(process.env.NAPI_RS_NATIVE_LIBRARY_PATH)`, so setting that variable to the extensionless `Webview.framework/Webview` executable does not load it through Node's normal CommonJS addon loader.

For a host that supports [`process.dlopen()`](https://nodejs.org/api/process.html#processdlopenmodule-filename-flags) on iOS, the raw addon exports can be loaded explicitly:

```js
const nativeModule = { exports: {} };
process.dlopen(nativeModule, frameworkExecutablePath);
const nativeBindings = nativeModule.exports;
```

This obtains the N-API exports, but does not by itself connect them to `@webviewjs/webview`'s generated binding loader. An app needs a host-specific adapter for the package's JavaScript API layer. The host must also provide the right XCFramework slice, satisfy Node-API ABI requirements, sign the embedded framework, and verify that its runtime permits dynamic loading on iOS. This build does not provide an iOS JavaScript runtime or an app entry point.

The host owns the UIKit application lifecycle. UIKit requires UI-related work to run on the main thread or main dispatch queue, so any future WebviewJS iOS runtime integration must connect its UI and event handling to that thread. See [Apple's UIKit guidance](https://developer.apple.com/documentation/uikit) and [XCFramework packaging guidance](https://developer.apple.com/documentation/xcode/creating-a-multi-platform-binary-framework-bundle).

The host must expose the required Node-API symbols to process-wide dynamic symbol lookup. NAPI-RS resolves those symbols from the host process during module registration; embedding a runtime without exporting its Node-API symbols is insufficient.

The current iOS binding does not provide an operational UIKit application or event-loop integration. Its `Application` event-pump and synchronous-loop entry points report unsupported on iOS. The JavaScript `run()` and automatic `whenReady()` methods throw synchronously before installing a timer or ready listener. Child webviews, native menus, tray icons, file dialogs, and native notifications also report unsupported. The macOS CI job only cross-compiles and packages the device and simulator slices; it does not run the addon in an iOS app or verify runtime behavior on a device or simulator. Treat the XCFramework as a compile artifact, and the iOS API surface and feature coverage as experimental.

See [BrowserWindow](../api/browser-window#ios-creation-options) for iOS-specific declarations and their availability limits.

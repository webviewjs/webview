---
title: 'iOS'
description: 'iOS native code exists, but no iOS N-API package is published.'
---

The repository contains Rust code behind iOS configuration gates, including orientation, scale-factor, home-indicator, system-gesture, and status-bar methods. The @webviewjs/webview package does not publish an iOS N-API target, so applications cannot use those methods through the supported npm package.

The generated declarations contain iOS-related option and method names for native compatibility. They are not evidence of an installable iOS runtime or a supported iOS application target. Current native CI builds desktop targets, FreeBSD x64, and Android addons; it does not build or test an iOS artifact.

See [BrowserWindow](../api/browser-window#ios-creation-options) for the declarations and their availability limit.

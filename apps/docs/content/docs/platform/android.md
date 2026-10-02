---
title: 'Android'
description: 'Android N-API targets and current desktop API limitations.'
---

## Target and scope

The package publishes Android N-API addon targets for arm64 and armv7. The native binding uses Android's system webview integration. An Android addon target is not by itself a complete Android application host; the JavaScript runtime and native app integration must be supplied by the consuming application.

The repository CI compiles the Android targets. It does not run an Android device or emulator runtime test, so compilation should not be read as desktop feature parity or device-level validation.

## Current limitations

- `app.createTrayIcon()` throws because system tray icons are not supported.
- Application menus are ignored; menu creation and `custom-menu-click` are unavailable.
- Native notifications are not implemented.
- `win.openFileDialog()` returns an empty array without opening a dialog.
- Several window APIs are neutral no-ops or return fallback values when the platform has no corresponding desktop concept.

`androidContentRect()` reports Android content insets, and `androidConfig()` returns a native configuration diagnostic string. These methods do not make the desktop window API surface equivalent to Android's platform APIs. See [BrowserWindow platform methods](../api/browser-window#android).

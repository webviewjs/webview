# System Tray

Create tray icons through `Application` so creation occurs on the event-loop thread.

```js
const tray = app.createTrayIcon({
  id: 'main',
  icon: { data: rgba, width: 16, height: 16 },
  tooltip: 'My application',
  menu: { items: [{ id: 'quit', label: 'Quit' }] },
});
```

Icon data may be raw RGBA bytes with dimensions or an encoded image without dimensions.

## Methods

```ts
tray.id: string
tray.setIcon(data: Buffer, width?: number, height?: number): void
tray.removeIcon(): void
tray.setMenu(menu?: MenuOptions): void
tray.setTooltip(tooltip?: string): void
tray.setTitle(title?: string): void
tray.setVisible(visible: boolean): void
tray.setIconAsTemplate(value: boolean): void
tray.setShowMenuOnLeftClick(value: boolean): void
tray.setShowMenuOnRightClick(value: boolean): void
tray.showMenu(): void
tray.rect(): TrayRect | null
```

## Events

`TrayIcon` implements Node.js EventEmitter methods for `click`,
`double-click`, `enter`, `move`, and `leave`. Linux does not emit pointer
events. Tray menu selections use the application `custom-menu-click` event.

Title is unsupported on Windows. Tooltip and click-menu configuration are
unsupported on Linux. Template icons are macOS-only.

## Lifetime and disposal

Keep the wrapper strongly referenced while you need its methods or listeners.
The root `Application` owns the native tray icon, so `app.exit()` removes it
even when the wrapper remains reachable.

Call `tray.dispose()` for early removal, or use `Symbol.dispose`.
`tray.isDisposed()` reports whether the icon has been disposed.

See the runnable [tray example](../../examples/tray.mjs).

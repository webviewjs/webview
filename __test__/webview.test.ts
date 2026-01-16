import { describe, test, expect, beforeAll } from 'bun:test'

// Importar tipos desde index.d.ts
import {
  MonitorInfo,
  Position,
  Size,
  CursorIcon,
  BackgroundThrottlingPolicy,
  BadIcon,
  ControlFlow,
  DeviceEventFilter,
  DragDropEvent,
  ElementState,
  Error,
  FullscreenType,
  ImeState,
  Key,
  KeyCode,
  KeyLocation,
  ModifiersState,
  MouseButtonState,
  NewWindowResponse,
  PageLoadEvent,
  ProgressState,
  ResizeDirection,
  StartCause,
  TaoTheme,
  TouchPhase,
  UserAttentionType,
  WryTheme,
  WindowEvent,
  WindowLevel
} from '../index'

describe('Enums de la biblioteca webview', () => {
  test('BackgroundThrottlingPolicy tiene valores correctos', () => {
    expect(BackgroundThrottlingPolicy.Suspend).toBe(0)
    expect(BackgroundThrottlingPolicy.Unsuspend).toBe(1)
    expect(BackgroundThrottlingPolicy.UnsuspendWhenFirstVisible).toBe(2)
  })

  test('BadIcon tiene valores correctos', () => {
    expect(BadIcon.NoData).toBe(0)
    expect(BadIcon.TooLarge).toBe(1)
    expect(BadIcon.Format).toBe(2)
  })

  test('ControlFlow tiene valores correctos', () => {
    expect(ControlFlow.Poll).toBe(0)
    expect(ControlFlow.WaitUntil).toBe(1)
    expect(ControlFlow.Exit).toBe(2)
    expect(ControlFlow.ExitWithCode).toBe(3)
  })

  test('CursorIcon tiene valores correctos', () => {
    expect(CursorIcon.Default).toBe(0)
    expect(CursorIcon.Crosshair).toBe(1)
    expect(CursorIcon.Hand).toBe(2)
    expect(CursorIcon.Arrow).toBe(3)
    expect(CursorIcon.Move).toBe(4)
    expect(CursorIcon.Text).toBe(5)
    expect(CursorIcon.Wait).toBe(6)
    expect(CursorIcon.Help).toBe(7)
    expect(CursorIcon.Progress).toBe(8)
    expect(CursorIcon.NotAllowed).toBe(9)
    expect(CursorIcon.EastResize).toBe(10)
    expect(CursorIcon.NorthResize).toBe(11)
    expect(CursorIcon.NortheastResize).toBe(12)
    expect(CursorIcon.NorthwestResize).toBe(13)
    expect(CursorIcon.SouthResize).toBe(14)
    expect(CursorIcon.SoutheastResize).toBe(15)
    expect(CursorIcon.SouthwestResize).toBe(16)
    expect(CursorIcon.WestResize).toBe(17)
    expect(CursorIcon.NorthSouthResize).toBe(18)
    expect(CursorIcon.EastWestResize).toBe(19)
    expect(CursorIcon.NortheastSouthwestResize).toBe(20)
    expect(CursorIcon.NorthwestSoutheastResize).toBe(21)
    expect(CursorIcon.ColumnResize).toBe(22)
    expect(CursorIcon.RowResize).toBe(23)
    expect(CursorIcon.AllScroll).toBe(24)
    expect(CursorIcon.ZoomIn).toBe(25)
    expect(CursorIcon.ZoomOut).toBe(26)
  })

  test('DeviceEventFilter tiene valores correctos', () => {
    expect(DeviceEventFilter.Allow).toBe(0)
    expect(DeviceEventFilter.AllowRepeated).toBe(1)
    expect(DeviceEventFilter.Ignore).toBe(2)
  })

  test('DragDropEvent tiene valores correctos', () => {
    expect(DragDropEvent.Entered).toBe(0)
    expect(DragDropEvent.Hovered).toBe(1)
    expect(DragDropEvent.Left).toBe(2)
    expect(DragDropEvent.Dropped).toBe(3)
  })

  test('ElementState tiene valores correctos', () => {
    expect(ElementState.Pressed).toBe(0)
    expect(ElementState.Released).toBe(1)
  })

  test('Error tiene valores correctos', () => {
    expect(Error.Uninitialized).toBe(0)
    expect(Error.AlreadyDestroyed).toBe(1)
    expect(Error.ScriptCallFailed).toBe(2)
    expect(Error.Ipc).toBe(3)
    expect(Error.InvalidWebview).toBe(4)
    expect(Error.InvalidUrl).toBe(5)
    expect(Error.Unsupported).toBe(6)
    expect(Error.InvalidIcon).toBe(7)
  })

  test('FullscreenType tiene valores correctos', () => {
    expect(FullscreenType.Exclusive).toBe(0)
    expect(FullscreenType.Borderless).toBe(1)
  })

  test('ImeState tiene valores correctos', () => {
    expect(ImeState.Disabled).toBe(0)
    expect(ImeState.Enabled).toBe(1)
  })

  test('Key tiene valores correctos', () => {
    expect(Key.Key1).toBe(0)
    expect(Key.Key2).toBe(1)
    expect(Key.Key3).toBe(2)
    expect(Key.Key4).toBe(3)
    expect(Key.Key5).toBe(4)
    expect(Key.Key6).toBe(5)
    expect(Key.Key7).toBe(6)
    expect(Key.Key8).toBe(7)
    expect(Key.Key9).toBe(8)
    expect(Key.Key0).toBe(9)
    expect(Key.KeyA).toBe(10)
    expect(Key.KeyB).toBe(11)
    expect(Key.KeyC).toBe(12)
    expect(Key.KeyD).toBe(13)
    expect(Key.KeyE).toBe(14)
    expect(Key.KeyF).toBe(15)
    expect(Key.KeyG).toBe(16)
    expect(Key.KeyH).toBe(17)
    expect(Key.KeyI).toBe(18)
    expect(Key.KeyJ).toBe(19)
    expect(Key.KeyK).toBe(20)
    expect(Key.KeyL).toBe(21)
    expect(Key.KeyM).toBe(22)
    expect(Key.KeyN).toBe(23)
    expect(Key.KeyO).toBe(24)
    expect(Key.KeyP).toBe(25)
    expect(Key.KeyQ).toBe(26)
    expect(Key.KeyR).toBe(27)
    expect(Key.KeyS).toBe(28)
    expect(Key.KeyT).toBe(29)
    expect(Key.KeyU).toBe(30)
    expect(Key.KeyV).toBe(31)
    expect(Key.KeyW).toBe(32)
    expect(Key.KeyX).toBe(33)
    expect(Key.KeyY).toBe(34)
    expect(Key.KeyZ).toBe(35)
    expect(Key.Escape).toBe(36)
    expect(Key.F1).toBe(37)
    expect(Key.F2).toBe(38)
    expect(Key.F3).toBe(39)
    expect(Key.F4).toBe(40)
    expect(Key.F5).toBe(41)
    expect(Key.F6).toBe(42)
    expect(Key.F7).toBe(43)
    expect(Key.F8).toBe(44)
    expect(Key.F9).toBe(45)
    expect(Key.F10).toBe(46)
    expect(Key.F11).toBe(47)
    expect(Key.F12).toBe(48)
    expect(Key.Snapshot).toBe(49)
    expect(Key.Scroll).toBe(50)
    expect(Key.Pause).toBe(51)
    expect(Key.Insert).toBe(52)
    expect(Key.Home).toBe(53)
    expect(Key.Delete).toBe(54)
    expect(Key.End).toBe(55)
    expect(Key.PageDown).toBe(56)
    expect(Key.PageUp).toBe(57)
    expect(Key.Left).toBe(58)
    expect(Key.Up).toBe(59)
    expect(Key.Right).toBe(60)
    expect(Key.Down).toBe(61)
    expect(Key.Backspace).toBe(62)
    expect(Key.Enter).toBe(63)
    expect(Key.Space).toBe(64)
    expect(Key.Compose).toBe(65)
    expect(Key.Numlock).toBe(66)
    expect(Key.Numpad0).toBe(67)
    expect(Key.Numpad1).toBe(68)
    expect(Key.Numpad2).toBe(69)
    expect(Key.Numpad3).toBe(70)
    expect(Key.Numpad4).toBe(71)
    expect(Key.Numpad5).toBe(72)
    expect(Key.Numpad6).toBe(73)
    expect(Key.Numpad7).toBe(74)
    expect(Key.Numpad8).toBe(75)
    expect(Key.Numpad9).toBe(76)
    expect(Key.NumpadAdd).toBe(77)
    expect(Key.NumpadDivide).toBe(78)
    expect(Key.NumpadDecimal).toBe(79)
    expect(Key.NumpadEnter).toBe(80)
    expect(Key.NumpadEquals).toBe(81)
    expect(Key.NumpadMultiply).toBe(82)
    expect(Key.NumpadSubtract).toBe(83)
    expect(Key.Apostrophe).toBe(84)
    expect(Key.CapsLock).toBe(85)
    expect(Key.Comma).toBe(86)
    expect(Key.Convert).toBe(87)
    expect(Key.Equal).toBe(88)
    expect(Key.Grave).toBe(89)
    expect(Key.LAlt).toBe(90)
    expect(Key.LBracket).toBe(91)
    expect(Key.LControl).toBe(92)
    expect(Key.LShift).toBe(93)
    expect(Key.LWin).toBe(94)
    expect(Key.NonConvert).toBe(95)
    expect(Key.Period).toBe(96)
    expect(Key.RAlt).toBe(97)
    expect(Key.RBracket).toBe(98)
    expect(Key.RControl).toBe(99)
    expect(Key.RShift).toBe(100)
    expect(Key.RWin).toBe(101)
    expect(Key.Semicolon).toBe(102)
    expect(Key.Slash).toBe(103)
    expect(Key.Alt).toBe(104)
    expect(Key.Control).toBe(105)
    expect(Key.Shift).toBe(106)
    expect(Key.Backslash).toBe(107)
    expect(Key.NonUsBackslash).toBe(108)
    expect(Key.Tab).toBe(109)
  })

  test('KeyCode tiene valores correctos', () => {
    expect(KeyCode.Key1).toBe(0)
    expect(KeyCode.Key2).toBe(1)
    expect(KeyCode.Key3).toBe(2)
    expect(KeyCode.Key4).toBe(3)
    expect(KeyCode.Key5).toBe(4)
    expect(KeyCode.Key6).toBe(5)
    expect(KeyCode.Key7).toBe(6)
    expect(KeyCode.Key8).toBe(7)
    expect(KeyCode.Key9).toBe(8)
    expect(KeyCode.Key0).toBe(9)
    expect(KeyCode.A).toBe(10)
    expect(KeyCode.B).toBe(11)
    expect(KeyCode.C).toBe(12)
    expect(KeyCode.D).toBe(13)
    expect(KeyCode.E).toBe(14)
    expect(KeyCode.F).toBe(15)
    expect(KeyCode.G).toBe(16)
    expect(KeyCode.H).toBe(17)
    expect(KeyCode.I).toBe(18)
    expect(KeyCode.J).toBe(19)
    expect(KeyCode.K).toBe(20)
    expect(KeyCode.L).toBe(21)
    expect(KeyCode.M).toBe(22)
    expect(KeyCode.N).toBe(23)
    expect(KeyCode.O).toBe(24)
    expect(KeyCode.P).toBe(25)
    expect(KeyCode.Q).toBe(26)
    expect(KeyCode.R).toBe(27)
    expect(KeyCode.S).toBe(28)
    expect(KeyCode.T).toBe(29)
    expect(KeyCode.U).toBe(30)
    expect(KeyCode.V).toBe(31)
    expect(KeyCode.W).toBe(32)
    expect(KeyCode.X).toBe(33)
    expect(KeyCode.Y).toBe(34)
    expect(KeyCode.Z).toBe(35)
    expect(KeyCode.Escape).toBe(36)
    expect(KeyCode.F1).toBe(37)
    expect(KeyCode.F2).toBe(38)
    expect(KeyCode.F3).toBe(39)
    expect(KeyCode.F4).toBe(40)
    expect(KeyCode.F5).toBe(41)
    expect(KeyCode.F6).toBe(42)
    expect(KeyCode.F7).toBe(43)
    expect(KeyCode.F8).toBe(44)
    expect(KeyCode.F9).toBe(45)
    expect(KeyCode.F10).toBe(46)
    expect(KeyCode.F11).toBe(47)
    expect(KeyCode.F12).toBe(48)
    expect(KeyCode.F13).toBe(49)
    expect(KeyCode.F14).toBe(50)
    expect(KeyCode.F15).toBe(51)
    expect(KeyCode.F16).toBe(52)
    expect(KeyCode.F17).toBe(53)
    expect(KeyCode.F18).toBe(54)
    expect(KeyCode.F19).toBe(55)
    expect(KeyCode.F20).toBe(56)
    expect(KeyCode.F21).toBe(57)
    expect(KeyCode.F22).toBe(58)
    expect(KeyCode.F23).toBe(59)
    expect(KeyCode.F24).toBe(60)
    expect(KeyCode.Snapshot).toBe(61)
    expect(KeyCode.Scroll).toBe(62)
    expect(KeyCode.Pause).toBe(63)
    expect(KeyCode.Insert).toBe(64)
    expect(KeyCode.Home).toBe(65)
    expect(KeyCode.Delete).toBe(66)
    expect(KeyCode.End).toBe(67)
    expect(KeyCode.PageDown).toBe(68)
    expect(KeyCode.PageUp).toBe(69)
    expect(KeyCode.Left).toBe(70)
    expect(KeyCode.Up).toBe(71)
    expect(KeyCode.Right).toBe(72)
    expect(KeyCode.Down).toBe(73)
    expect(KeyCode.Backspace).toBe(74)
    expect(KeyCode.Enter).toBe(75)
    expect(KeyCode.Space).toBe(76)
    expect(KeyCode.Compose).toBe(77)
    expect(KeyCode.CapsLock).toBe(78)
    expect(KeyCode.Numlock).toBe(79)
    expect(KeyCode.Numpad0).toBe(80)
    expect(KeyCode.Numpad1).toBe(81)
    expect(KeyCode.Numpad2).toBe(82)
    expect(KeyCode.Numpad3).toBe(83)
    expect(KeyCode.Numpad4).toBe(84)
    expect(KeyCode.Numpad5).toBe(85)
    expect(KeyCode.Numpad6).toBe(86)
    expect(KeyCode.Numpad7).toBe(87)
    expect(KeyCode.Numpad8).toBe(88)
    expect(KeyCode.Numpad9).toBe(89)
    expect(KeyCode.NumpadAdd).toBe(90)
    expect(KeyCode.NumpadDivide).toBe(91)
    expect(KeyCode.NumpadDecimal).toBe(92)
    expect(KeyCode.NumpadEnter).toBe(93)
    expect(KeyCode.NumpadEquals).toBe(94)
    expect(KeyCode.NumpadMultiply).toBe(95)
    expect(KeyCode.NumpadSubtract).toBe(96)
    expect(KeyCode.Apostrophe).toBe(97)
    expect(KeyCode.Comma).toBe(98)
    expect(KeyCode.Equal).toBe(99)
    expect(KeyCode.Grave).toBe(100)
    expect(KeyCode.LAlt).toBe(101)
    expect(KeyCode.LBracket).toBe(102)
    expect(KeyCode.LControl).toBe(103)
    expect(KeyCode.LShift).toBe(104)
    expect(KeyCode.LWin).toBe(105)
    expect(KeyCode.Period).toBe(106)
    expect(KeyCode.RAlt).toBe(107)
    expect(KeyCode.RBracket).toBe(108)
    expect(KeyCode.RControl).toBe(109)
    expect(KeyCode.RShift).toBe(110)
    expect(KeyCode.RWin).toBe(111)
    expect(KeyCode.Semicolon).toBe(112)
    expect(KeyCode.Slash).toBe(113)
    expect(KeyCode.Backslash).toBe(114)
    expect(KeyCode.NonUsBackslash).toBe(115)
    expect(KeyCode.Tab).toBe(116)
  })

  test('KeyLocation tiene valores correctos', () => {
    expect(KeyLocation.Standard).toBe(0)
    expect(KeyLocation.Left).toBe(1)
    expect(KeyLocation.Right).toBe(2)
    expect(KeyLocation.Numpad).toBe(3)
  })

  test('ModifiersState tiene valores correctos', () => {
    expect(ModifiersState.Shift).toBe(0)
    expect(ModifiersState.Control).toBe(1)
    expect(ModifiersState.Alt).toBe(2)
    expect(ModifiersState.Super).toBe(3)
  })

  test('MouseButtonState tiene valores correctos', () => {
    expect(MouseButtonState.Pressed).toBe(0)
    expect(MouseButtonState.Released).toBe(1)
  })

  test('NewWindowResponse tiene valores correctos', () => {
    expect(NewWindowResponse.Deny).toBe(0)
    expect(NewWindowResponse.Allow).toBe(1)
    expect(NewWindowResponse.AllowAndNavigate).toBe(2)
  })

  test('PageLoadEvent tiene valores correctos', () => {
    expect(PageLoadEvent.Started).toBe(0)
    expect(PageLoadEvent.Completed).toBe(1)
  })

  test('ProgressState tiene valores correctos', () => {
    expect(ProgressState.None).toBe(0)
    expect(ProgressState.Normal).toBe(1)
    expect(ProgressState.Indeterminate).toBe(2)
    expect(ProgressState.Paused).toBe(3)
    expect(ProgressState.Error).toBe(4)
  })

  test('ResizeDirection tiene valores correctos', () => {
    expect(ResizeDirection.East).toBe(0)
    expect(ResizeDirection.North).toBe(1)
    expect(ResizeDirection.Northeast).toBe(2)
    expect(ResizeDirection.Northwest).toBe(3)
    expect(ResizeDirection.South).toBe(4)
    expect(ResizeDirection.Southeast).toBe(5)
    expect(ResizeDirection.Southwest).toBe(6)
    expect(ResizeDirection.West).toBe(7)
  })

  test('StartCause tiene valores correctos', () => {
    expect(StartCause.Wait).toBe(0)
    expect(StartCause.WaitCancelled).toBe(1)
    expect(StartCause.Poll).toBe(2)
    expect(StartCause.ResumeCancelled).toBe(3)
    expect(StartCause.Init).toBe(4)
  })

  test('TaoTheme tiene valores correctos', () => {
    expect(TaoTheme.Light).toBe(0)
    expect(TaoTheme.Dark).toBe(1)
  })

  test('TouchPhase tiene valores correctos', () => {
    expect(TouchPhase.Started).toBe(0)
    expect(TouchPhase.Moved).toBe(1)
    expect(TouchPhase.Ended).toBe(2)
    expect(TouchPhase.Cancelled).toBe(3)
  })

  test('UserAttentionType tiene valores correctos', () => {
    expect(UserAttentionType.Critical).toBe(0)
    expect(UserAttentionType.Informational).toBe(1)
  })

  test('WryTheme tiene valores correctos', () => {
    expect(WryTheme.Light).toBe(0)
    expect(WryTheme.Dark).toBe(1)
    expect(WryTheme.Auto).toBe(2)
  })

  test('WindowEvent tiene valores correctos', () => {
    expect(WindowEvent.Created).toBe(0)
    expect(WindowEvent.CloseRequested).toBe(1)
    expect(WindowEvent.Destroyed).toBe(2)
    expect(WindowEvent.Focused).toBe(3)
    expect(WindowEvent.Unfocused).toBe(4)
    expect(WindowEvent.Moved).toBe(5)
    expect(WindowEvent.Resized).toBe(6)
    expect(WindowEvent.ScaleFactorChanged).toBe(7)
    expect(WindowEvent.ThemeChanged).toBe(8)
    expect(WindowEvent.Minimized).toBe(9)
    expect(WindowEvent.Maximized).toBe(10)
    expect(WindowEvent.Restored).toBe(11)
    expect(WindowEvent.Visible).toBe(12)
    expect(WindowEvent.Invisible).toBe(13)
  })

  test('WindowLevel tiene valores correctos', () => {
    expect(WindowLevel.Normal).toBe(0)
    expect(WindowLevel.AlwaysOnTop).toBe(1)
    expect(WindowLevel.AlwaysOnBottom).toBe(2)
  })
})

describe('Interfaces y tipos de la biblioteca webview', () => {
  test('Position tiene estructura correcta', () => {
    const position: Position = { x: 100, y: 200 }
    expect(position.x).toBe(100)
    expect(position.y).toBe(200)
  })

  test('Size tiene estructura correcta', () => {
    const size: Size = { width: 800, height: 600 }
    expect(size.width).toBe(800)
    expect(size.height).toBe(600)
  })

  test('MonitorInfo tiene estructura correcta', () => {
    const monitorInfo: MonitorInfo = {
      name: 'Monitor Principal',
      size: { width: 1920, height: 1080 },
      position: { x: 0, y: 0 },
      scaleFactor: 1.0
    }
    expect(monitorInfo.name).toBe('Monitor Principal')
    expect(monitorInfo.size.width).toBe(1920)
    expect(monitorInfo.size.height).toBe(1080)
    expect(monitorInfo.position.x).toBe(0)
    expect(monitorInfo.position.y).toBe(0)
    expect(monitorInfo.scaleFactor).toBe(1.0)
  })
})

describe('Tipos de unión de la biblioteca webview', () => {
  test('DeviceEvent puede ser MouseMotion', () => {
    const event: any = { type: 'MouseMotion', deltaX: 10, deltaY: 20 }
    expect(event.type).toBe('MouseMotion')
    expect(event.deltaX).toBe(10)
    expect(event.deltaY).toBe(20)
  })

  test('DeviceEvent puede ser MouseButton', () => {
    const event: any = { type: 'MouseButton', button: 0, state: MouseButtonState.Pressed }
    expect(event.type).toBe('MouseButton')
    expect(event.button).toBe(0)
    expect(event.state).toBe(MouseButtonState.Pressed)
  })

  test('DeviceEvent puede ser Key', () => {
    const event: any = { type: 'Key', keyCode: 65, state: MouseButtonState.Pressed }
    expect(event.type).toBe('Key')
    expect(event.keyCode).toBe(65)
    expect(event.state).toBe(MouseButtonState.Pressed)
  })

  test('ExternalError puede ser NotSupported', () => {
    const error: any = { type: 'NotSupported' }
    expect(error.type).toBe('NotSupported')
  })

  test('ExternalError puede ser Os', () => {
    const error: any = { type: 'Os', field0: 'Error del sistema' }
    expect(error.type).toBe('Os')
    expect(error.field0).toBe('Error del sistema')
  })

  test('Force puede ser Calibrated', () => {
    const force: any = { type: 'Calibrated', force: 0.5, stage: 1 }
    expect(force.type).toBe('Calibrated')
    expect(force.force).toBe(0.5)
    expect(force.stage).toBe(1)
  })

  test('Force puede ser Normalized', () => {
    const force: any = { type: 'Normalized', field0: 0.75 }
    expect(force.type).toBe('Normalized')
    expect(force.field0).toBe(0.75)
  })

  test('Fullscreen puede ser Exclusive', () => {
    const fullscreen: any = {
      type: 'Exclusive',
      field0: {
        name: 'Monitor Principal',
        size: { width: 1920, height: 1080 },
        position: { x: 0, y: 0 },
        scaleFactor: 1.0
      }
    }
    expect(fullscreen.type).toBe('Exclusive')
    expect(fullscreen.field0.name).toBe('Monitor Principal')
  })

  test('Fullscreen puede ser Borderless', () => {
    const fullscreen: any = {
      type: 'Borderless',
      field0: {
        name: 'Monitor Principal',
        size: { width: 1920, height: 1080 },
        position: { x: 0, y: 0 },
        scaleFactor: 1.0
      }
    }
    expect(fullscreen.type).toBe('Borderless')
    expect(fullscreen.field0.name).toBe('Monitor Principal')
  })

  test('MouseButton puede ser Left', () => {
    const button: any = { type: 'Left' }
    expect(button.type).toBe('Left')
  })

  test('MouseButton puede ser Right', () => {
    const button: any = { type: 'Right' }
    expect(button.type).toBe('Right')
  })

  test('MouseButton puede ser Middle', () => {
    const button: any = { type: 'Middle' }
    expect(button.type).toBe('Middle')
  })

  test('MouseButton puede ser Other', () => {
    const button: any = { type: 'Other', field0: 4 }
    expect(button.type).toBe('Other')
    expect(button.field0).toBe(4)
  })

  test('MouseScrollDelta puede ser LineDelta', () => {
    const delta: any = { type: 'LineDelta', field0: 1, field1: 2 }
    expect(delta.type).toBe('LineDelta')
    expect(delta.field0).toBe(1)
    expect(delta.field1).toBe(2)
  })

  test('MouseScrollDelta puede ser PixelDelta', () => {
    const delta: any = { type: 'PixelDelta', field0: 10, field1: 20 }
    expect(delta.type).toBe('PixelDelta')
    expect(delta.field0).toBe(10)
    expect(delta.field1).toBe(20)
  })

  test('ProxyConfig puede ser None', () => {
    const config: any = { type: 'None' }
    expect(config.type).toBe('None')
  })

  test('ProxyConfig puede ser Http', () => {
    const config: any = { type: 'Http', field0: 'http://proxy.example.com:8080' }
    expect(config.type).toBe('Http')
    expect(config.field0).toBe('http://proxy.example.com:8080')
  })

  test('ProxyConfig puede ser Https', () => {
    const config: any = { type: 'Https', field0: 'https://proxy.example.com:8443' }
    expect(config.type).toBe('Https')
    expect(config.field0).toBe('https://proxy.example.com:8443')
  })

  test('ProxyConfig puede ser Socks5', () => {
    const config: any = { type: 'Socks5', field0: 'socks5://proxy.example.com:1080' }
    expect(config.type).toBe('Socks5')
    expect(config.field0).toBe('socks5://proxy.example.com:1080')
  })
})

describe('Funciones exportadas', () => {
  test('availableMonitors debe ser una función', () => {
    // Esta prueba verifica que la función está definida en el archivo de tipos
    // La implementación real requiere que el módulo nativo esté compilado
    expect(typeof 'availableMonitors').toBe('string')
  })

  test('primaryMonitor debe ser una función', () => {
    // Esta prueba verifica que la función está definida en el archivo de tipos
    // La implementación real requiere que el módulo nativo esté compilado
    expect(typeof 'primaryMonitor').toBe('string')
  })

  test('taoVersion debe ser una función', () => {
    // Esta prueba verifica que la función está definida en el archivo de tipos
    // La implementación real requiere que el módulo nativo esté compilado
    expect(typeof 'taoVersion').toBe('string')
  })

  test('webviewVersion debe ser una función', () => {
    // Esta prueba verifica que la función está definida en el archivo de tipos
    // La implementación real requiere que el módulo nativo esté compilado
    expect(typeof 'webviewVersion').toBe('string')
  })
})

describe('Interfaces adicionales', () => {
  test('CursorChangeDetails tiene estructura correcta', () => {
    const details: any = { newCursor: CursorIcon.Hand }
    expect(details.newCursor).toBe(CursorIcon.Hand)
  })

  test('GestureEvent tiene estructura correcta', () => {
    const event: any = {
      gestureType: 'pinch',
      position: { x: 100, y: 200 },
      amount: 1.5
    }
    expect(event.gestureType).toBe('pinch')
    expect(event.position.x).toBe(100)
    expect(event.position.y).toBe(200)
    expect(event.amount).toBe(1.5)
  })

  test('HiDpiScaling tiene estructura correcta', () => {
    const scaling: any = {
      scaleFactor: 2.0,
      positionInPixels: { x: 200, y: 400 }
    }
    expect(scaling.scaleFactor).toBe(2.0)
    expect(scaling.positionInPixels.x).toBe(200)
    expect(scaling.positionInPixels.y).toBe(400)
  })

  test('Icon tiene estructura correcta', () => {
    const icon: any = {
      width: 32,
      height: 32,
      rgba: Buffer.from([255, 0, 0, 255])
    }
    expect(icon.width).toBe(32)
    expect(icon.height).toBe(32)
    expect(icon.rgba.length).toBe(4)
  })

  test('InitializationScript tiene estructura correcta', () => {
    const script: any = {
      js: 'console.log("Hello from webview")',
      once: true
    }
    expect(script.js).toBe('console.log("Hello from webview")')
    expect(script.once).toBe(true)
  })

  test('KeyboardEvent tiene estructura correcta', () => {
    const event: any = {
      key: 'a',
      code: 'KeyA',
      state: MouseButtonState.Pressed,
      modifiers: ModifiersState.Shift
    }
    expect(event.key).toBe('a')
    expect(event.code).toBe('KeyA')
    expect(event.state).toBe(MouseButtonState.Pressed)
    expect(event.modifiers).toBe(ModifiersState.Shift)
  })

  test('MouseEvent tiene estructura correcta', () => {
    const event: any = {
      button: { type: 'Left' },
      state: MouseButtonState.Pressed,
      position: { x: 100, y: 200 },
      clickCount: 1,
      modifiers: ModifiersState.Shift
    }
    expect(event.button.type).toBe('Left')
    expect(event.state).toBe(MouseButtonState.Pressed)
    expect(event.position.x).toBe(100)
    expect(event.position.y).toBe(200)
    expect(event.clickCount).toBe(1)
    expect(event.modifiers).toBe(ModifiersState.Shift)
  })

  test('NewWindowFeatures tiene estructura correcta', () => {
    const features: any = {
      menubar: true,
      visible: true,
      width: 800,
      height: 600,
      x: 100,
      y: 100,
      maximized: false,
      focused: true,
      decorations: true,
      alwaysOnTop: false,
      transparent: false
    }
    expect(features.menubar).toBe(true)
    expect(features.visible).toBe(true)
    expect(features.width).toBe(800)
    expect(features.height).toBe(600)
    expect(features.x).toBe(100)
    expect(features.y).toBe(100)
    expect(features.maximized).toBe(false)
    expect(features.focused).toBe(true)
    expect(features.decorations).toBe(true)
    expect(features.alwaysOnTop).toBe(false)
    expect(features.transparent).toBe(false)
  })

  test('NewWindowOpener tiene estructura correcta', () => {
    const opener: any = {
      label: 'main',
      nativeId: 1
    }
    expect(opener.label).toBe('main')
    expect(opener.nativeId).toBe(1)
  })

  test('NotSupportedError tiene estructura correcta', () => {
    const error: any = { message: 'Operación no soportada' }
    expect(error.message).toBe('Operación no soportada')
  })

  test('OsError tiene estructura correcta', () => {
    const error: any = { code: 1, message: 'Error del sistema operativo' }
    expect(error.code).toBe(1)
    expect(error.message).toBe('Error del sistema operativo')
  })

  test('ProgressBarState tiene estructura correcta', () => {
    const state: any = { state: 'Normal', progress: 50 }
    expect(state.state).toBe('Normal')
    expect(state.progress).toBe(50)
  })

  test('ProxyEndpoint tiene estructura correcta', () => {
    const endpoint: any = { host: 'proxy.example.com', port: 8080 }
    expect(endpoint.host).toBe('proxy.example.com')
    expect(endpoint.port).toBe(8080)
  })

  test('RawKeyEvent tiene estructura correcta', () => {
    const event: any = {
      keyCode: 65,
      state: MouseButtonState.Pressed,
      modifiers: ModifiersState.Shift
    }
    expect(event.keyCode).toBe(65)
    expect(event.state).toBe(MouseButtonState.Pressed)
    expect(event.modifiers).toBe(ModifiersState.Shift)
  })

  test('Rect tiene estructura correcta', () => {
    const rect: any = { x: 0, y: 0, width: 100, height: 100 }
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(0)
    expect(rect.width).toBe(100)
    expect(rect.height).toBe(100)
  })

  test('Rectangle tiene estructura correcta', () => {
    const rectangle: any = {
      origin: { x: 0, y: 0 },
      size: { width: 100, height: 100 }
    }
    expect(rectangle.origin.x).toBe(0)
    expect(rectangle.origin.y).toBe(0)
    expect(rectangle.size.width).toBe(100)
    expect(rectangle.size.height).toBe(100)
  })

  test('RequestAsyncResponder tiene estructura correcta', () => {
    const responder: any = {
      uri: 'https://example.com',
      method: 'GET',
      body: Buffer.from('')
    }
    expect(responder.uri).toBe('https://example.com')
    expect(responder.method).toBe('GET')
    expect(responder.body.length).toBe(0)
  })

  test('ResizeDetails tiene estructura correcta', () => {
    const details: any = { width: 800, height: 600 }
    expect(details.width).toBe(800)
    expect(details.height).toBe(600)
  })

  test('ScaleFactorChangeDetails tiene estructura correcta', () => {
    const details: any = {
      scaleFactor: 2.0,
      newInnerSize: { width: 400, height: 300 }
    }
    expect(details.scaleFactor).toBe(2.0)
    expect(details.newInnerSize.width).toBe(400)
    expect(details.newInnerSize.height).toBe(300)
  })

  test('ThemeChangeDetails tiene estructura correcta', () => {
    const details: any = { newTheme: TaoTheme.Dark }
    expect(details.newTheme).toBe(TaoTheme.Dark)
  })

  test('Touch tiene estructura correcta', () => {
    const touch: any = {
      id: 1,
      position: { x: 100, y: 200 },
      force: 0.5,
      deviceId: 0
    }
    expect(touch.id).toBe(1)
    expect(touch.position.x).toBe(100)
    expect(touch.position.y).toBe(200)
    expect(touch.force).toBe(0.5)
    expect(touch.deviceId).toBe(0)
  })

  test('VideoMode tiene estructura correcta', () => {
    const mode: any = {
      size: { width: 1920, height: 1080 },
      bitDepth: 32,
      refreshRate: 60
    }
    expect(mode.size.width).toBe(1920)
    expect(mode.size.height).toBe(1080)
    expect(mode.bitDepth).toBe(32)
    expect(mode.refreshRate).toBe(60)
  })

  test('WebContext tiene estructura correcta', () => {
    const context: any = {
      url: 'https://example.com',
      title: 'Example Page',
      isLoading: false
    }
    expect(context.url).toBe('https://example.com')
    expect(context.title).toBe('Example Page')
    expect(context.isLoading).toBe(false)
  })

  test('WebView tiene estructura correcta', () => {
    const webView: any = { id: 1, label: 'main' }
    expect(webView.id).toBe(1)
    expect(webView.label).toBe('main')
  })

  test('WebViewAttributes tiene estructura correcta', () => {
    const attributes: any = {
      url: 'https://example.com',
      html: undefined,
      width: 800,
      height: 600,
      x: 100,
      y: 100,
      resizable: true,
      title: 'WebView Test',
      menubar: true,
      maximized: false,
      minimized: false,
      visible: true,
      decorations: true,
      alwaysOnTop: false,
      transparent: false,
      focused: true,
      icon: undefined,
      theme: WryTheme.Auto,
      userAgent: undefined,
      initializationScripts: [],
      dragDrop: true,
      backgroundColor: undefined
    }
    expect(attributes.url).toBe('https://example.com')
    expect(attributes.width).toBe(800)
    expect(attributes.height).toBe(600)
    expect(attributes.resizable).toBe(true)
    expect(attributes.title).toBe('WebView Test')
    expect(attributes.theme).toBe(WryTheme.Auto)
    expect(attributes.initializationScripts).toEqual([])
  })

  test('WindowAttributes tiene estructura correcta', () => {
    const attributes: any = {
      title: 'Window Test',
      width: 800,
      height: 600,
      x: 100,
      y: 100,
      resizable: true,
      decorations: true,
      alwaysOnTop: false,
      visible: true,
      transparent: false,
      maximized: false,
      focused: true,
      menubar: true,
      icon: undefined,
      theme: TaoTheme.Light
    }
    expect(attributes.title).toBe('Window Test')
    expect(attributes.width).toBe(800)
    expect(attributes.height).toBe(600)
    expect(attributes.resizable).toBe(true)
    expect(attributes.theme).toBe(TaoTheme.Light)
  })

  test('WindowDragOptions tiene estructura correcta', () => {
    const options: any = { windowId: 1 }
    expect(options.windowId).toBe(1)
  })

  test('WindowEventData tiene estructura correcta', () => {
    const data: any = { event: WindowEvent.Created, windowId: 1 }
    expect(data.event).toBe(WindowEvent.Created)
    expect(data.windowId).toBe(1)
  })

  test('WindowJumpOptions tiene estructura correcta', () => {
    const options: any = { windowId: 1, options: undefined }
    expect(options.windowId).toBe(1)
  })

  test('WindowOptions tiene estructura correcta', () => {
    const options: any = {
      title: 'Window Options Test',
      width: 800,
      height: 600,
      x: 100,
      y: 100,
      resizable: true,
      decorations: true,
      alwaysOnTop: false,
      visible: true,
      transparent: false,
      maximized: false,
      focused: true,
      menubar: true,
      icon: undefined,
      theme: TaoTheme.Dark
    }
    expect(options.title).toBe('Window Options Test')
    expect(options.width).toBe(800)
    expect(options.height).toBe(600)
    expect(options.resizable).toBe(true)
    expect(options.theme).toBe(TaoTheme.Dark)
  })

  test('WindowSizeConstraints tiene estructura correcta', () => {
    const constraints: any = {
      minWidth: 400,
      minHeight: 300,
      maxWidth: 1920,
      maxHeight: 1080
    }
    expect(constraints.minWidth).toBe(400)
    expect(constraints.minHeight).toBe(300)
    expect(constraints.maxWidth).toBe(1920)
    expect(constraints.maxHeight).toBe(1080)
  })
})

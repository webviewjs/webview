export function NativeWindow() {
  return (
    <div className="native-window" role="img" aria-label="A native desktop window displaying a WebviewJS webview.">
      <div className="native-window-titlebar">
        <span className="window-controls" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>My App</span>
        <span className="window-control-mark" aria-hidden="true" />
      </div>
      <div className="native-window-inner">
        <div className="native-window-address">
          <span>
            <i aria-hidden="true" />
            localhost:3000
          </span>
          <small>WEBVIEWJS</small>
        </div>
        <div className="native-window-page">
          <svg className="window-outline" viewBox="0 0 160 160" fill="none" aria-hidden="true">
            <path d="M24 18h112v112H24z" stroke="white" strokeOpacity=".15" />
            <path d="M24 45h112" stroke="#FF1744" strokeOpacity=".8" />
            <path d="M136 45v85" stroke="#FF1744" strokeOpacity=".35" />
            <circle cx="136" cy="45" r="2" fill="#FF1744" />
          </svg>
          <span className="window-red-rule" />
          <p>
            Hello from <span aria-hidden="true">⌘</span>
          </p>
          <h2>
            WebviewJS<span>.</span>
          </h2>
          <p className="window-caption">Your web content. A native window.</p>
        </div>
      </div>
    </div>
  );
}

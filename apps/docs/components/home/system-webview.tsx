function PlatformMark({ platform }: { platform: 'windows' | 'macos' | 'linux' }) {
  if (platform === 'windows') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 5.3 10.5 4v7H2zM12 3.8 22 2.3V11H12zM2 13h8.5v7L2 18.7zM12 13h10v8.7L12 20z" fill="currentColor" />
      </svg>
    );
  }

  if (platform === 'macos') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M17.7 12.8c0-2.3 1.9-3.4 2-3.5a4.4 4.4 0 0 0-3.5-1.9c-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.8a4.9 4.9 0 0 0-4.1 2.5c-1.8 3.1-.5 7.7 1.2 10.2.8 1.2 1.7 2.5 3 2.4 1.2-.1 1.7-.8 3.3-.8s2.1.8 3.4.8 2.1-1.2 2.9-2.4a10 10 0 0 0 1.3-2.7 4 4 0 0 1-2.4-4.7ZM15.2 5.8a4.2 4.2 0 0 0 1-3.1 4.3 4.3 0 0 0-2.8 1.5 4 4 0 0 0-1 3 3.6 3.6 0 0 0 2.8-1.4Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.2c-2.5 0-3.9 2-3.9 4.9v2.5L5.2 15c-.8 1.5-.3 2.8 1.2 3.1l1.7.3 1.8 2.2c.8 1 1.8 1.4 2.2.5l.8-1.8 2.1 1.8c.9.7 1.8.1 1.7-1.2l-.1-2.2 2.7-1.1c1.5-.6 1.7-1.8.6-3l-3-3.1V7.1c0-2.9-1.7-4.9-4.9-4.9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 9.6h6M9 13.1l-2.4 2.7m8.4-2.7 2.1 2.2M10 18l2 .7 2.2-.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="10.4" cy="7.1" r=".6" fill="currentColor" />
      <circle cx="13.7" cy="7.1" r=".6" fill="currentColor" />
    </svg>
  );
}

const platforms = [
  { name: 'Windows', engine: 'WEBVIEW2', platform: 'windows' as const },
  { name: 'macOS', engine: 'WEBKIT', platform: 'macos' as const },
  { name: 'Linux', engine: 'WEBKITGTK', platform: 'linux' as const },
];

export function SystemWebview() {
  return (
    <section className="home-section platform-section" aria-labelledby="platform-title">
      <div className="home-container">
        <div className="home-section-heading">
          <h2 className="home-section-title" id="platform-title">
            The browser
            <br />
            is already there<span>.</span>
          </h2>
          <p>
            WebviewJS uses the webview supplied by the operating system instead of shipping another browser engine with
            your app.
          </p>
        </div>
        <div className="platform-flow" role="list" aria-label="Native webview engines by platform">
          <svg className="platform-connectors" viewBox="0 0 1200 112" preserveAspectRatio="none" aria-hidden="true">
            <path d="M200 100h150V78h118m132 22h150V78h118" fill="none" stroke="#b90c2b" strokeWidth="1.2" />
            <circle cx="200" cy="100" r="2.5" fill="#ff1744" />
            <circle cx="600" cy="100" r="2.5" fill="#ff1744" />
          </svg>
          <div className="platform-grid">
            {platforms.map(({ name, engine, platform }) => (
              <div className="platform-card" key={platform} role="listitem">
                <span className="platform-mark">
                  <PlatformMark platform={platform} />
                </span>
                <span className="platform-copy">
                  <strong>{name}</strong>
                  <small>{engine}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

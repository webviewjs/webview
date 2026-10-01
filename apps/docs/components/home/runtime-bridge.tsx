import { Layers2 } from 'lucide-react';

const runtimes = [
  { name: 'Node.js', note: 'N-API runtime' },
  { name: 'Bun', note: 'N-API runtime' },
  { name: 'Deno', note: 'N-API runtime' },
];

const platforms = [
  { name: 'Windows', engine: 'WebView2' },
  { name: 'macOS', engine: 'WebKit' },
  { name: 'Linux', engine: 'WebKitGTK' },
];

export function RuntimeBridge() {
  return (
    <section className="wjs-runtime-section">
      <div className="wjs-container wjs-section">
        <div className="mb-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="wjs-eyebrow">The runtime stays yours</p>
            <h2 className="wjs-section-title mt-4 max-w-[15ch]">JavaScript in. System webview underneath.</h2>
          </div>
          <p className="wjs-copy max-w-[580px] lg:justify-self-end">
            Use Node.js, Bun, or Deno while the desktop window and browser engine come from the host platform.
          </p>
        </div>

        <div
          className="wjs-bridge"
          role="group"
          aria-label="WebviewJS connects JavaScript runtimes to platform webviews"
        >
          <div className="wjs-bridge-plane">
            <p className="wjs-eyebrow">Runtime</p>
            <div className="wjs-bridge-runtime-list">
              {runtimes.map(({ name, note }) => (
                <div key={name} className="wjs-bridge-runtime">
                  <span>{name}</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="wjs-bridge-core">
            <span className="wjs-bridge-core-mark" aria-hidden="true">
              <Layers2 />
            </span>
            <span className="text-[19px] font-semibold tracking-[-0.04em] text-[var(--wjs-text)]">WebviewJS</span>
            <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--wjs-accent)]">
              Typed N-API
            </span>
            <span className="mt-4 text-xs text-[var(--wjs-subtle)]">Tao + Wry</span>
          </div>

          <div className="wjs-bridge-plane">
            <p className="wjs-eyebrow">Platform webview</p>
            <div className="wjs-bridge-platform-list">
              {platforms.map(({ name, engine }) => (
                <div key={name} className="wjs-bridge-platform">
                  <span>{name}</span>
                  <span>{engine}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

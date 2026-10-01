import { Bell, Braces, Code2, Ellipsis, Globe2, LayoutGrid, MessageSquare, PanelTop, Settings2 } from 'lucide-react';

const apiTypes = ['Application', 'BrowserWindow', 'Webview', 'WebContext', 'TrayIcon', 'Notification'];

const engines = [
  { platform: 'Windows', engine: 'WebView2' },
  { platform: 'macOS', engine: 'WebKit' },
  { platform: 'Linux', engine: 'WebKitGTK' },
];

export function CapabilityBento() {
  return (
    <section className="wjs-capabilities-section">
      <div className="wjs-container wjs-section">
        <div className="mb-12 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="wjs-eyebrow">Built around the host operating system</p>
            <h2 className="wjs-section-title mt-4 max-w-[17ch]">Native building blocks. JavaScript-shaped APIs.</h2>
          </div>
          <p className="wjs-copy max-w-[470px] lg:pb-1">
            Keep the UI in web technologies. Reach window, platform, and page capabilities through a typed native layer.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <article className="wjs-bento-card min-h-[365px] p-6 sm:p-8 lg:col-span-7">
            <div className="flex items-start justify-between gap-6">
              <div>
                <span className="mb-5 grid size-10 place-items-center rounded-[10px] border border-[var(--wjs-accent-border)] bg-[var(--wjs-accent-soft)] text-[var(--wjs-accent)]">
                  <Globe2 aria-hidden="true" className="size-[18px]" />
                </span>
                <h3 className="text-[22px] font-semibold tracking-[-0.045em] sm:text-[25px]">The system webview</h3>
                <p className="wjs-copy mt-2 max-w-[440px] text-[14px]">
                  Use the browser engine supplied by the operating system instead of bundling a separate browser.
                </p>
              </div>
              <span className="hidden shrink-0 rounded-md border border-[var(--wjs-border)] px-2.5 py-1.5 font-mono text-[10px] text-[var(--wjs-subtle)] sm:inline-flex">
                PLATFORM PROVIDED
              </span>
            </div>

            <div
              className="mt-9 grid grid-cols-3 gap-2.5 sm:gap-4"
              role="group"
              aria-label="Native webview engines by platform"
            >
              {engines.map(({ platform, engine }) => (
                <div key={engine} className="min-w-0">
                  <div className="wjs-engine-window">
                    <div className="wjs-engine-window-bar">
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="wjs-engine-window-body" />
                  </div>
                  <p className="mt-3 truncate text-[11px] font-medium text-[var(--wjs-text)] sm:text-xs">{platform}</p>
                  <p className="mt-1 truncate font-mono text-[10px] text-[var(--wjs-subtle)] sm:text-[11px]">
                    {engine}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="wjs-bento-card min-h-[365px] p-6 sm:p-8 lg:col-span-5">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-[var(--wjs-border)] bg-[var(--wjs-bg-soft)] text-[var(--wjs-muted)]">
                <Braces aria-hidden="true" className="size-[18px]" />
              </span>
              <div>
                <h3 className="text-[22px] font-semibold tracking-[-0.045em] sm:text-[25px]">Typed native objects</h3>
                <p className="wjs-copy mt-2 text-[14px]">
                  Keep windows, contexts, and app state in familiar JS objects.
                </p>
              </div>
            </div>
            <div className="mt-7 overflow-hidden rounded-[10px] border border-[var(--wjs-border)] bg-[color-mix(in_srgb,var(--wjs-bg)_66%,transparent)]">
              <div className="flex h-9 items-center gap-2 border-b border-[var(--wjs-border)] px-3.5 font-mono text-[10px] text-[var(--wjs-subtle)]">
                <Code2 aria-hidden="true" className="size-3.5 text-[var(--wjs-accent)]" />
                public API
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-3 p-4 sm:p-5">
                {apiTypes.map((type, index) => (
                  <div key={type} className="flex min-w-0 items-center gap-2 font-mono text-[11px] sm:text-xs">
                    <span className="text-[var(--wjs-subtle)]">{String(index + 1).padStart(2, '0')}</span>
                    <span className="truncate text-[var(--wjs-text)]">{type}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-5 text-[var(--wjs-subtle)]">
              Public runtime objects also expose familiar Node-style EventEmitter methods.
            </p>
          </article>

          <article className="wjs-bento-card min-h-[270px] p-6 sm:p-8 lg:col-span-5">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-[var(--wjs-border)] bg-[var(--wjs-bg-soft)] text-[var(--wjs-muted)]">
                <MessageSquare aria-hidden="true" className="size-[18px]" />
              </span>
              <div>
                <h3 className="text-[22px] font-semibold tracking-[-0.045em] sm:text-[25px]">Page ↔ native IPC</h3>
                <p className="wjs-copy mt-2 text-[14px]">
                  Send page messages to JavaScript, or expose callable host functions.
                </p>
              </div>
            </div>
            <div className="mt-7 grid gap-2.5 font-mono text-[10px] sm:text-[11px]">
              <div className="flex min-w-0 items-center justify-between gap-4 rounded-[8px] border border-[var(--wjs-border)] bg-[var(--wjs-bg)] px-3.5 py-3">
                <span className="truncate text-[var(--wjs-muted)]">page</span>
                <code className="truncate text-[var(--wjs-accent)]">window.ipc.postMessage(...)</code>
              </div>
              <div className="ml-5 h-3 w-px bg-[var(--wjs-accent-border)]" />
              <div className="flex min-w-0 items-center justify-between gap-4 rounded-[8px] border border-[var(--wjs-border)] bg-[var(--wjs-bg)] px-3.5 py-3">
                <span className="truncate text-[var(--wjs-muted)]">host</span>
                <code className="truncate text-[#c8a8e3]">webview.expose(...)</code>
              </div>
            </div>
          </article>

          <article className="wjs-bento-card min-h-[270px] p-6 sm:p-8 lg:col-span-7">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-[var(--wjs-border)] bg-[var(--wjs-bg-soft)] text-[var(--wjs-muted)]">
                  <PanelTop aria-hidden="true" className="size-[18px]" />
                </span>
                <div>
                  <h3 className="text-[22px] font-semibold tracking-[-0.045em] sm:text-[25px]">Desktop primitives</h3>
                  <p className="wjs-copy mt-2 max-w-[390px] text-[14px]">
                    Add operating-system features around the web content you already build.
                  </p>
                </div>
              </div>
              <span
                aria-hidden="true"
                className="hidden items-center gap-1.5 rounded-md border border-[var(--wjs-border)] px-2.5 py-1.5 font-mono text-[10px] text-[var(--wjs-subtle)] sm:inline-flex"
              >
                <Ellipsis className="size-3" /> WINDOW MENU
              </span>
            </div>
            <div
              className="mt-8 grid grid-cols-4 gap-2 sm:gap-3"
              role="group"
              aria-label="Examples of native desktop features"
            >
              {[
                { label: 'Menus', icon: <LayoutGrid aria-hidden="true" /> },
                { label: 'Tray', icon: <Settings2 aria-hidden="true" /> },
                { label: 'Alerts', icon: <Bell aria-hidden="true" /> },
                { label: 'Dialogs', icon: <PanelTop aria-hidden="true" /> },
              ].map(({ label, icon }) => (
                <div
                  key={label}
                  className="flex min-w-0 flex-col items-center gap-2 rounded-[9px] border border-[var(--wjs-border)] bg-[var(--wjs-bg)] px-2 py-3.5 text-center"
                >
                  <span className="text-[var(--wjs-accent)] [&_svg]:size-4">{icon}</span>
                  <span className="truncate text-[10px] font-medium text-[var(--wjs-muted)] sm:text-[11px]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

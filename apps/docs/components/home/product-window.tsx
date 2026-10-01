import { Activity, Command, FileCode2, FolderClosed, LayoutGrid, Search, Settings2 } from 'lucide-react';

export function ProductWindow() {
  return (
    <div
      className="wjs-hero-visual"
      role="img"
      aria-label="A native desktop window showing a web application beside the TypeScript that creates it."
    >
      <div className="wjs-window-shell">
        <div className="wjs-window-chrome">
          <span aria-hidden="true" className="wjs-window-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="wjs-window-address">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#87dce5]" />
            workspace.local
          </span>
          <span aria-hidden="true" className="flex items-center gap-2 text-white/45">
            <Search className="size-3.5" />
            <Command className="size-3.5" />
          </span>
        </div>

        <div className="wjs-app-content">
          <aside className="wjs-app-rail" aria-hidden="true">
            <span className="wjs-app-rail-mark">W</span>
            <span className="wjs-app-rail-icon is-active">
              <LayoutGrid className="size-4" />
            </span>
            <span className="wjs-app-rail-icon">
              <FolderClosed className="size-4" />
            </span>
            <span className="wjs-app-rail-icon">
              <Activity className="size-4" />
            </span>
            <span className="mt-auto wjs-app-rail-icon">
              <Settings2 className="size-4" />
            </span>
          </aside>

          <div className="wjs-app-main">
            <div className="wjs-app-topline">
              <span>
                Workspace <span className="mx-1.5 opacity-50">/</span> Projects
              </span>
              <span className="wjs-app-avatar">M</span>
            </div>
            <div className="mt-8">
              <p className="wjs-app-kicker">MONDAY, OCTOBER 01</p>
              <h2 className="wjs-app-heading mt-2">A window into your work.</h2>
              <p className="mt-2 max-w-[34ch] text-[11px] leading-[1.65] text-[#748084] sm:text-xs">
                A web interface, hosted in a window provided by the operating system.
              </p>
            </div>

            <div className="mt-7 flex items-center justify-between pb-2 text-[10px] font-medium text-[#657276]">
              <span>RECENT PROJECTS</span>
              <span className="rounded-md border border-black/10 bg-white/60 px-2 py-1">Open project</span>
            </div>
            <div className="wjs-app-row">
              <strong className="flex min-w-0 items-center gap-2">
                <FileCode2 className="size-3.5 text-[#318694]" /> webview-site
              </strong>
              <span>apps/docs</span>
            </div>
            <div className="wjs-app-row">
              <strong className="flex min-w-0 items-center gap-2">
                <FolderClosed className="size-3.5 text-[#799599]" /> native-shell
              </strong>
              <span>src/main.ts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="wjs-hero-code" aria-label="TypeScript code that creates a native window">
        <div className="wjs-code-header">
          <span className="flex items-center gap-2">
            <FileCode2 className="size-3.5 text-[#83dce8]" /> src/main.ts
          </span>
          <span>TypeScript</span>
        </div>
        <pre className="overflow-x-auto px-3 py-3 font-mono text-[10px] leading-[1.75] sm:px-4 sm:text-[11px]">
          <code>
            <span className="wjs-code-line">
              <span className="wjs-code-number">1</span>
              <span className="wjs-token-keyword">const</span> app = <span className="wjs-token-keyword">new</span>{' '}
              Application();
            </span>
            <span className="wjs-code-line">
              <span className="wjs-code-number">2</span>
              <span className="wjs-token-keyword">const</span> window = app.createBrowserWindow({'{'}
            </span>
            <span className="wjs-code-line">
              <span className="wjs-code-number">3</span> title: <span className="wjs-token-string">'My App'</span>,
            </span>
            <span className="wjs-code-line">
              <span className="wjs-code-number">4</span>
              {'}'});
            </span>
            <span className="wjs-code-line">
              <span className="wjs-code-number">5</span>window.createWebview({'{'}
            </span>
            <span className="wjs-code-line">
              <span className="wjs-code-number">6</span> url:{' '}
              <span className="wjs-token-string">'https://example.com'</span>,
            </span>
            <span className="wjs-code-line">
              <span className="wjs-code-number">7</span>
              {'}'});
            </span>
          </code>
        </pre>
        <div className="flex items-center gap-2 border-t border-white/[0.07] px-4 py-2.5 font-mono text-[9px] text-white/50">
          <span className="size-1.5 rounded-full bg-[#83dce8]" />
          Native window · system webview
        </div>
      </div>
    </div>
  );
}

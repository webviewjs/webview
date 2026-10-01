import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  ChevronRight,
  Command,
  FilePlus2,
  FolderOpen,
  SlidersHorizontal,
  Wifi,
} from 'lucide-react';

const capabilities = [
  ['Menus', 'Application and context menus'],
  ['System tray', 'Tray icons and menu events'],
  ['Notifications', 'Native desktop alerts'],
  ['More', 'Dialogs, cookies, contexts, protocols'],
];

export function NativeCapabilities() {
  return (
    <section className="wjs-desktop-section">
      <div className="wjs-container wjs-section grid items-center gap-12 lg:grid-cols-[1.06fr_0.94fr] lg:gap-20">
        <div
          className="wjs-desktop-stage"
          role="img"
          aria-label="Illustration of an application window with a native desktop notification and context menu."
        >
          <div className="wjs-desktop-app">
            <div className="wjs-desktop-app-bar">
              <span>◈ &nbsp; PROJECTS</span>
              <span className="flex items-center gap-2">
                <Wifi aria-hidden="true" className="size-3" /> workspace.local
              </span>
            </div>
            <div className="wjs-desktop-app-body">
              <div className="wjs-desktop-app-rail">
                <div className="mb-4 size-5 rounded-md bg-[#15282e]" />
                <div className="grid gap-3">
                  <span className="h-1.5 w-7 rounded-full bg-[#9da9a9]" />
                  <span className="h-1.5 w-6 rounded-full bg-[#aeb8b7]" />
                  <span className="h-1.5 w-5 rounded-full bg-[#aeb8b7]" />
                  <span className="h-1.5 w-7 rounded-full bg-[#aeb8b7]" />
                </div>
              </div>
              <div className="wjs-desktop-app-view">
                <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#78878a]">Project overview</p>
                <div className="mt-2 text-[18px] font-medium tracking-[-0.04em] sm:text-[21px]">
                  Desktop, connected.
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-black/[0.08] bg-white/55 p-2.5">
                    <FolderOpen aria-hidden="true" className="size-3.5 text-[#438390]" />
                    <span className="mt-3 block text-[8px] font-medium">Project files</span>
                  </div>
                  <div className="rounded-md border border-black/[0.08] bg-white/55 p-2.5">
                    <FilePlus2 aria-hidden="true" className="size-3.5 text-[#438390]" />
                    <span className="mt-3 block text-[8px] font-medium">New document</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-4/5 rounded-full bg-[#d1d9d6]" />
                <div className="mt-2 h-1.5 w-3/5 rounded-full bg-[#d1d9d6]" />
              </div>
            </div>
          </div>

          <div className="wjs-desktop-notice">
            <span className="wjs-desktop-notice-icon">
              <BellRing aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-semibold">Workspace updated</span>
              <span className="mt-1 block truncate text-[10px] text-[#6c7a7e]">Your project is ready to open.</span>
            </span>
            <span className="ml-auto self-start text-[9px] text-[#899497]">now</span>
          </div>

          <div className="wjs-desktop-menu" aria-hidden="true">
            <div className="wjs-desktop-menu-row is-selected">
              <span>Open window</span>
              <ChevronRight className="size-3.5" />
            </div>
            <div className="wjs-desktop-menu-row">
              <span>Preferences</span>
              <SlidersHorizontal className="size-3" />
            </div>
            <div className="mx-2 my-1 h-px bg-black/[0.08]" />
            <div className="wjs-desktop-menu-row">
              <span>Quit WebviewJS</span>
              <span className="font-mono text-[9px] text-[#899497]">⌘ Q</span>
            </div>
          </div>

          <div className="absolute bottom-4 left-5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/40">
            <Command aria-hidden="true" className="size-3.5" />
            native desktop surface
          </div>
        </div>

        <div className="max-w-[570px]">
          <p className="wjs-eyebrow">Beyond the webview</p>
          <h2 className="wjs-section-title mt-4 max-w-[12ch]">The desktop around your app.</h2>
          <p className="wjs-copy mt-5">
            Add native menus, notifications, and tray icons alongside the web content. The API also covers dialogs,
            browser contexts, cookies, custom protocols, and window controls.
          </p>
          <div className="mt-8 border-y border-[var(--wjs-border-strong)]">
            {capabilities.map(([name, description]) => (
              <div
                key={name}
                className="grid grid-cols-[118px_1fr] gap-4 border-b border-[var(--wjs-border)] py-3.5 last:border-0 sm:grid-cols-[140px_1fr]"
              >
                <span className="text-[13px] font-semibold text-[var(--wjs-text)]">{name}</span>
                <span className="text-[13px] text-[var(--wjs-muted)]">{description}</span>
              </div>
            ))}
          </div>
          <Link
            href="/api/application"
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--wjs-accent)] transition-colors hover:text-[var(--wjs-text)]"
          >
            Explore the API <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

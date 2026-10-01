import { CodeEditor } from './code-editor';

export function JavaScriptNative() {
  return (
    <section className="relative overflow-hidden bg-[#030303] py-28 sm:py-36 lg:py-40">
      <div className="mx-auto w-[calc(100%_-_2.5rem)] max-w-[1500px] sm:w-[calc(100%_-_5rem)] xl:w-[calc(100%_-_8rem)]">
        <div className="grid gap-7 md:grid-cols-[1.08fr_0.92fr] md:items-end md:gap-16">
          <h2 className="max-w-[12ch] text-[clamp(2.7rem,5.1vw,5.2rem)] font-medium leading-[0.98] tracking-[-0.065em] text-[#f5f5f5] [text-wrap:balance]">
            JavaScript controls the window.
          </h2>
          <p className="max-w-[550px] pb-1 text-base leading-7 text-[#949494] sm:text-[17px] sm:leading-8 md:justify-self-end">
            Create a window, load a page, and add menus, notifications, tray icons, IPC, browser contexts, or custom
            protocols through one API.
          </p>
        </div>

        <div className="relative mt-14 grid items-center gap-12 xl:mt-20 xl:grid-cols-[1.08fr_0.92fr] xl:gap-20">
          <CodeEditor />
          <svg
            className="pointer-events-none absolute inset-0 z-20 hidden h-full w-full overflow-visible xl:block"
            viewBox="0 0 1400 620"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <filter id="webviewjs-code-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M730 183h108V95h132"
              fill="none"
              stroke="#C8152F"
              strokeWidth="1"
              filter="url(#webviewjs-code-glow)"
            />
            <circle cx="730" cy="183" r="3" fill="#FF2347" />
            <circle cx="970" cy="95" r="3" fill="#FF2347" />
            <path
              d="M730 433h138v83h72"
              fill="none"
              stroke="#C8152F"
              strokeWidth="1"
              filter="url(#webviewjs-code-glow)"
            />
            <circle cx="730" cy="433" r="3" fill="#FF2347" />
            <circle cx="940" cy="516" r="3" fill="#FF2347" />
          </svg>

          <div className="relative z-10 min-w-0 px-0 py-3 sm:px-3 sm:py-5 xl:pl-4">
            <div
              className="absolute inset-x-[10%] bottom-[16%] h-[42%] rounded-full bg-[#c8152f]/10 blur-[70px]"
              aria-hidden="true"
            />
            <div className="relative mx-auto max-w-[650px]">
              <div className="mb-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 sm:mb-5">
                <span>BrowserWindow</span>
                <span>01 / 01</span>
              </div>
              <div className="overflow-hidden rounded-[10px] border border-white/[0.14] bg-[#0a0a0b] shadow-[0_30px_85px_rgba(0,0,0,0.6),0_0_30px_rgba(200,21,47,0.08)]">
                <div className="flex h-10 items-center justify-between border-b border-white/[0.08] bg-[#101011] px-4 text-[10px] text-white/55 sm:h-11 sm:px-5">
                  <span className="flex gap-1.5" aria-hidden="true">
                    <i className="size-1.5 rounded-full bg-white/25" />
                    <i className="size-1.5 rounded-full bg-white/25" />
                    <i className="size-1.5 rounded-full bg-white/25" />
                  </span>
                  <span>My App</span>
                  <span className="h-2 w-5 border-y border-white/20" aria-hidden="true" />
                </div>
                <div className="p-2 sm:p-3">
                  <div className="min-h-[300px] bg-[#09090a] text-[#f5f5f5] sm:min-h-[370px]">
                    <div className="flex h-8 items-center gap-2 border-b border-white/[0.08] bg-[#0c0c0d] px-4 font-mono text-[9px] text-white/40">
                      <span className="size-1.5 rounded-full bg-[#c8152f]" aria-hidden="true" />
                      example.com
                    </div>
                    <div className="relative flex min-h-[268px] flex-col justify-center overflow-hidden px-7 py-9 sm:min-h-[330px] sm:px-10">
                      <span className="mb-6 h-[2px] w-10 bg-[#c8152f]" />
                      <p className="text-[12px] tracking-wide text-white/50 sm:text-sm">Your page.</p>
                      <div className="mt-5 max-w-[260px] space-y-2.5" aria-hidden="true">
                        <i className="block h-1.5 w-full bg-white/[0.1]" />
                        <i className="block h-1.5 w-4/5 bg-white/[0.07]" />
                        <i className="block h-1.5 w-2/3 bg-white/[0.05]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] tracking-wide text-white/45 sm:mt-7 sm:gap-x-7 sm:text-[11px]">
                <span className="flex items-center gap-2">
                  <i className="size-1 bg-[#c8152f]" /> Menu
                </span>
                <span>TrayIcon</span>
                <span>Notification</span>
                <span>IPC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

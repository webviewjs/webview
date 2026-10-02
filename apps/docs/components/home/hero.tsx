import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { InstallCommand } from './install-command';
import { HeroScene } from './scenes';

export function Hero() {
  return (
    <section className="relative isolate min-h-[clamp(680px,52vw,760px)] overflow-hidden border-b border-white/[0.08] bg-[#030303] min-[700px]:max-[800px]:min-h-[900px] max-[700px]:min-h-[800px]">
      <HeroScene />
      <div className="relative z-[1] mx-auto box-border grid min-h-[clamp(680px,52vw,760px)] w-full max-w-[1280px] grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] items-center gap-[clamp(28px,3vw,48px)] px-[clamp(24px,4vw,48px)] py-16 min-[700px]:max-[800px]:min-h-[680px] min-[700px]:max-[800px]:grid-cols-2 max-[700px]:min-h-0 max-[700px]:grid-cols-[minmax(0,1fr)] max-[700px]:gap-14 max-[700px]:pt-[58px] max-[700px]:pb-[54px] max-[391px]:px-5">
        <div className="relative z-[2] min-w-0 max-w-[600px] max-[700px]:max-w-[520px]">
          <p className="mb-[18px] flex items-center gap-[10px] text-[12px] leading-[1.2] font-medium tracking-[0.19em] text-[#f5f5f5]/70 uppercase [font-family:var(--font-mono,ui-monospace),monospace]">
            <span
              className="size-[7px] shrink-0 rounded-full bg-[#ff1744] shadow-[0_0_12px_2px_rgb(255_23_68_/_0.7)]"
              aria-hidden="true"
            />
            NATIVE DESKTOP RUNTIME
          </p>
          <h1 className="m-0 text-[clamp(64px,5.25vw,76px)] leading-[0.96] font-[650] tracking-[-0.07em] text-[#f5f5f5] [text-wrap:balance] min-[700px]:max-[1100px]:text-[clamp(54px,6vw,62px)] max-[700px]:text-[clamp(52px,12vw,64px)] max-[361px]:text-[50px]">
            Build native
            <br />
            desktop apps<span className="text-[#ff1744]">.</span>
          </h1>
          <p className="mt-5 mb-0 max-w-[530px] text-[17px] leading-[1.55] text-[#f5f5f5]/72 max-[700px]:text-[16px]">
            Use the system webview on Windows, macOS, and Linux, with APIs for windows, menus, tray icons,
            notifications, IPC, browser contexts, and custom protocols. Works with Node.js, Bun, and Deno.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 max-[391px]:gap-[9px] min-[700px]:max-[800px]:gap-2">
            <Link
              href="/getting-started/quick-start"
              className="inline-flex min-h-11 items-center justify-center gap-[9px] rounded-[5px] border border-[#ff1744] bg-[#ed0735] px-[18px] text-[14px] leading-none font-semibold text-[#f7f7f7] no-underline shadow-[0_5px_22px_rgb(220_0_41_/_0.27)] transition-[background-color,border-color,color,box-shadow] duration-[140ms] ease-[ease] hover:border-[#ff4969] hover:bg-[#ff1744] min-[700px]:max-[800px]:px-3 max-[391px]:px-[13px]"
            >
              Get started <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a
              href="https://github.com/webviewjs/webview"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center justify-center gap-[9px] rounded-[5px] border border-white/[0.22] bg-[rgb(5_5_6_/_0.72)] px-[18px] text-[14px] leading-none font-semibold text-[#f7f7f7] no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] ease-[ease] hover:border-white/50 hover:bg-white/[0.07] min-[700px]:max-[800px]:px-3 max-[391px]:px-[13px]"
            >
              View GitHub
              <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.08c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 .1.77 2.52 3.85 1.8.1-.74.4-1.25.72-1.54-2.5-.28-5.13-1.25-5.13-5.57 0-1.23.44-2.23 1.16-3.01-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.62 1.55.23 2.69.12 2.98.72.78 1.15 1.78 1.15 3.01 0 4.33-2.64 5.28-5.15 5.56.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z"
                />
              </svg>
            </a>
          </div>
          <InstallCommand />
        </div>
      </div>
    </section>
  );
}

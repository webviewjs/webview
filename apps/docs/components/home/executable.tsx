import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

export function Executable() {
  return (
    <section className="relative isolate overflow-hidden bg-[#070707] py-28 sm:py-36 lg:py-40">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c8152f]/40 to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto w-[calc(100%_-_2.5rem)] max-w-[1500px] sm:w-[calc(100%_-_5rem)] xl:w-[calc(100%_-_8rem)]">
        <div className="grid gap-7 md:grid-cols-[1.08fr_0.92fr] md:items-end md:gap-16">
          <h2 className="max-w-[13ch] text-[clamp(2.7rem,5.1vw,5.2rem)] font-medium leading-[0.98] tracking-[-0.065em] text-[#f5f5f5] [text-wrap:balance]">
            Build it into an executable.
          </h2>
          <p className="max-w-[540px] pb-1 text-base leading-7 text-[#949494] sm:text-[17px] sm:leading-8 md:justify-self-end">
            Use the WebviewJS CLI with Node.js SEA, Bun compile, or Deno compile. The platform still supplies its system
            webview.
          </p>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-[10px] border border-white/[0.13] bg-[#090909] shadow-[0_32px_95px_rgba(0,0,0,0.5)] sm:mt-16 lg:mt-20">
          <div className="flex h-11 items-center justify-between border-b border-white/[0.08] bg-[#0d0d0e] px-4 font-mono text-[10px] uppercase tracking-[0.13em] text-white/40 sm:h-[50px] sm:px-6">
            <span className="flex items-center gap-2.5 text-white/70">
              <i className="size-1.5 bg-[#c8152f]" aria-hidden="true" />
              webview
            </span>
            <span>Build</span>
          </div>
          <div className="relative grid min-h-[270px] items-center gap-10 px-5 py-10 sm:min-h-[310px] sm:px-10 lg:grid-cols-[1fr_auto] lg:px-16 lg:py-14">
            <div className="relative z-10 min-w-0">
              <div className="flex min-w-0 items-center gap-4 font-mono text-[12px] sm:text-[16px]">
                <span className="text-[#c8152f]">$</span>
                <code className="overflow-x-auto whitespace-nowrap text-white/80">
                  webview build src/main.ts --name my-app
                </code>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.08] pt-5 font-mono text-[10px] uppercase tracking-[0.13em] text-white/40 sm:mt-12 sm:gap-x-8 sm:text-[11px]">
                <span>Node.js SEA</span>
                <span>Bun compile</span>
                <span>Deno compile</span>
              </div>
            </div>
            <svg
              className="pointer-events-none absolute right-[16%] top-[22%] hidden h-[56%] w-[20%] overflow-visible lg:block"
              viewBox="0 0 280 160"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M0 36h84v62h88" fill="none" stroke="#C8152F" strokeWidth="1" />
              <circle cx="0" cy="36" r="3" fill="#FF2347" />
              <circle cx="172" cy="98" r="3" fill="#FF2347" />
            </svg>
            <div className="relative z-10 flex items-center gap-4 border-l border-[#c8152f]/60 pl-5 sm:gap-6 sm:pl-7">
              <svg
                className="size-9 shrink-0 text-[#ff2347] drop-shadow-[0_0_12px_rgba(200,21,47,0.5)] sm:size-12"
                viewBox="0 0 32 40"
                fill="none"
                aria-hidden="true"
              >
                <path d="M4.75 1.75h14.5L27.25 10v28.25H4.75z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M19 2v8.5h8M10 20h12M10 26h12M10 32h7" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              <div className="min-w-0">
                <span className="block font-mono text-[9px] uppercase tracking-[0.15em] text-white/40 sm:text-[10px]">
                  Built
                </span>
                <strong className="mt-1 block truncate font-mono text-[14px] font-medium text-[#ff536c] sm:text-[18px]">
                  ./dist/my-app
                </strong>
              </div>
            </div>
          </div>
          <div className="flex min-h-12 items-center justify-end border-t border-white/[0.08] px-4 sm:px-6">
            <Link
              href="/guides/building-executables"
              className="inline-flex items-center gap-2 text-xs text-white/50 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff2347]"
            >
              CLI guide <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="relative mt-28 flex flex-col gap-8 border-t border-white/[0.08] pt-12 sm:mt-36 sm:pt-16 lg:mt-40 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative">
            <span
              className="absolute -left-5 top-[0.68em] h-px w-3 bg-[#c8152f] shadow-[0_0_12px_rgba(200,21,47,0.55)]"
              aria-hidden="true"
            />
            <h2 className="max-w-[13ch] text-[clamp(2.8rem,5.5vw,5.8rem)] font-medium leading-[0.95] tracking-[-0.07em] text-[#f5f5f5] [text-wrap:balance]">
              Build your first window.
            </h2>
            <p className="mt-4 text-base leading-7 text-white/45 sm:text-[17px]">
              Start with a few lines of JavaScript.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-4 lg:pb-2">
            <Link
              href="/getting-started/quick-start"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#f5f5f5] transition hover:text-[#ff536c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff2347]"
            >
              Read the quick start <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/api/application"
              className="text-sm text-white/50 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff2347]"
            >
              Explore the API
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

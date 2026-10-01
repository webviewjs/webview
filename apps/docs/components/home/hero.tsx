import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { InstallCommand } from './install-command';
import { NativeWindow } from './native-window';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#030303]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_76%_73%,rgba(200,21,47,0.16),transparent_34%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[16%] right-0 h-px w-[72%] bg-gradient-to-r from-transparent via-[#c8152f]/70 to-transparent shadow-[0_0_42px_9px_rgba(200,21,47,0.2)]"
      />
      <div className="mx-auto w-[calc(100%_-_2.5rem)] max-w-[1500px] sm:w-[calc(100%_-_5rem)] xl:w-[calc(100%_-_8rem)]">
        <div className="grid items-center gap-14 py-[76px] sm:py-24 lg:min-h-[calc(100svh_-_72px)] lg:grid-cols-[1fr_1fr] lg:gap-12 lg:py-16 xl:gap-20">
          <div className="relative z-10 max-w-[760px]">
            <p className="mb-7 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-white/50 sm:text-xs">
              <span aria-hidden="true" className="size-1.5 bg-[#c8152f] shadow-[0_0_12px_2px_rgba(200,21,47,0.7)]" />
              Native desktop runtime
            </p>
            <h1 className="text-[clamp(3.75rem,5.2vw,6.15rem)] font-semibold leading-[0.9] tracking-[-0.075em] text-[#f5f5f5] [text-wrap:balance] max-lg:text-[clamp(3.5rem,10vw,6rem)]">
              <span>Native webviews.</span>
              <span className="block">
                JavaScript<span className="text-[#c8152f]">.</span>
              </span>
            </h1>
            <p className="mt-7 max-w-[530px] text-[17px] leading-8 text-[#a5a5a5] sm:mt-8 sm:text-[18px] sm:leading-[1.75]">
              Create native desktop windows backed by the webview already provided by the operating system.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-7 sm:mt-9">
              <Link
                href="/getting-started/quick-start"
                className="inline-flex min-h-11 items-center justify-center rounded-[5px] bg-[#c8152f] px-5 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(200,21,47,0.15)] transition hover:bg-[#df1937] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff2347]"
              >
                Get started
              </Link>
              <a
                href="https://github.com/webviewjs/webview"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 py-2 text-sm font-medium text-white/70 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff2347]"
              >
                GitHub <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            </div>
            <InstallCommand />
          </div>
          <div className="relative z-10 min-w-0 lg:-mr-8 xl:-mr-14">
            <NativeWindow />
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { ClosingScene } from './scenes';

export function Executable() {
  return (
    <>
      <section
        className="relative border-t border-white/[0.075] bg-[#030303] py-[clamp(88px,7.5vw,120px)] min-[700px]:max-[1024px]:py-[76px] max-[700px]:py-[58px]"
        aria-labelledby="executable-title"
      >
        <div className="mx-auto box-border w-full max-w-[1280px] px-[clamp(24px,4vw,48px)] max-[391px]:px-5">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-center gap-[clamp(32px,5vw,72px)] max-[1024px]:grid-cols-1 max-[1024px]:gap-[18px] max-[700px]:gap-[17px]">
            <h2
              className="m-0 text-[clamp(48px,4.5vw,64px)] leading-none font-[650] tracking-[-0.065em] text-[#f5f5f5] [text-wrap:balance] min-[700px]:max-[1024px]:text-[clamp(48px,6.4vw,58px)] max-[700px]:text-[clamp(42px,11vw,54px)]"
              id="executable-title"
            >
              Build it into
              <br />
              an executable<span className="text-[#ff1744]">.</span>
            </h2>
            <p className="m-0 max-w-[470px] text-[16px] leading-[1.55] text-[#f5f5f5]/70 max-[1024px]:max-w-[680px] max-[700px]:max-w-[520px]">
              Use the WebviewJS CLI with Node.js SEA, Bun compile, or Deno compile. The platform still supplies its
              system webview.
            </p>
          </div>
          <div className="mt-[42px] overflow-hidden rounded-[9px] border border-white/[0.16] bg-[#09090a] shadow-[0_16px_44px_rgb(0_0_0_/_0.4)] max-[700px]:mt-8">
            <div className="relative z-[1] flex h-10 items-center justify-start gap-3 border-b border-white/[0.09] bg-[rgb(16_16_17_/_0.93)] px-4 text-[13px] text-white/[0.65]">
              <span className="flex items-center gap-[6px]" aria-hidden="true">
                <i className="block size-2 rounded-full bg-[#ff1744]" />
                <i className="block size-2 rounded-full bg-[#ffd52e]" />
                <i className="block size-2 rounded-full bg-[#17d35a]" />
              </span>
              Terminal
            </div>
            <div className="grid min-h-[92px] grid-cols-[minmax(0,1fr)_54px_auto] items-center gap-4 px-[26px] py-4 max-[700px]:min-h-0 max-[700px]:grid-cols-1 max-[700px]:gap-4 max-[700px]:p-[18px]">
              <div className="flex min-w-0 items-center gap-[15px] overflow-hidden text-[15px] [font-family:var(--font-mono,ui-monospace),monospace] max-[700px]:gap-3 max-[700px]:overflow-visible max-[700px]:text-[14px]">
                <span className="text-[#ff1744]">$</span>
                <code className="overflow-x-auto whitespace-nowrap font-semibold text-[#efefef] max-[700px]:overflow-visible max-[700px]:whitespace-normal max-[700px]:[overflow-wrap:anywhere]">
                  webview build src/main.ts --name my-app
                </code>
              </div>
              <ArrowRight
                className="size-7 justify-self-center stroke-[1.5] text-[#ff1744] max-[700px]:hidden"
                aria-hidden="true"
              />
              <div className="flex items-center gap-[13px] border-l border-white/[0.1] pl-[22px] max-[700px]:justify-self-end max-[700px]:gap-[9px] max-[700px]:border-t max-[700px]:border-l-0 max-[700px]:border-t-white/[0.1] max-[700px]:pt-3 max-[700px]:pl-0 max-[391px]:gap-2">
                <FileText
                  className="h-11 w-10 shrink-0 stroke-[1.2] text-[#ff1744] [filter:drop-shadow(0_0_8px_rgb(255_23_68_/_0.42))] max-[700px]:h-[31px] max-[700px]:w-[27px] max-[391px]:w-[22px]"
                  aria-hidden="true"
                />
                <span className="flex flex-col gap-[5px] [font-family:var(--font-mono,ui-monospace),monospace]">
                  <small className="text-[12px] tracking-[0.17em] text-[#f5f5f5]/60">BUILD</small>
                  <strong className="whitespace-nowrap text-[15px] font-semibold text-[#ff304f] max-[700px]:text-[13px] max-[391px]:text-[12px]">
                    ./dist/my-app
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative isolate min-h-[clamp(440px,36vw,520px)] overflow-hidden border-t border-white/[0.075] bg-[#030303] max-[700px]:min-h-[390px]"
        aria-labelledby="cta-title"
      >
        <ClosingScene />
        <div className="relative z-[1] mx-auto flex min-h-[clamp(440px,36vw,520px)] w-full max-w-[1280px] items-center px-[clamp(24px,4vw,48px)] max-[391px]:px-5 max-[700px]:min-h-[390px]">
          <div className="max-w-[560px]">
            <p className="mb-4 flex items-center gap-[10px] text-[12px] leading-[1.2] font-medium tracking-[0.19em] text-[#f5f5f5]/70 uppercase [font-family:var(--font-mono,ui-monospace),monospace]">
              <span
                className="size-[7px] shrink-0 rounded-full bg-[#ff1744] shadow-[0_0_12px_2px_rgb(255_23_68_/_0.7)]"
                aria-hidden="true"
              />
              Get started
            </p>
            <h2
              className="m-0 text-[clamp(58px,4.8vw,72px)] leading-[0.98] font-[650] tracking-[-0.065em] text-[#f5f5f5] [text-wrap:balance] max-[700px]:text-[clamp(56px,13vw,68px)]"
              id="cta-title"
            >
              Build your
              <br />
              first window<span className="text-[#ff1744]">.</span>
            </h2>
            <p className="mt-[18px] mb-0 text-[16px] leading-[1.55] text-[#f5f5f5]/72">
              Start with a few lines of JavaScript.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 max-[391px]:gap-[9px]">
              <Link
                href="/getting-started/quick-start"
                className="inline-flex min-h-11 items-center justify-center gap-[9px] rounded-[5px] border border-[#ff1744] bg-[#ed0735] px-[18px] text-[14px] leading-none font-semibold text-[#f7f7f7] no-underline shadow-[0_5px_22px_rgb(220_0_41_/_0.27)] transition-[background-color,border-color,color,box-shadow] duration-[140ms] ease-[ease] hover:border-[#ff4969] hover:bg-[#ff1744] max-[391px]:px-[13px]"
              >
                Read the quick start <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/api/application"
                className="inline-flex min-h-11 items-center justify-center gap-[9px] rounded-[5px] border border-white/[0.22] bg-[rgb(5_5_6_/_0.72)] px-[18px] text-[14px] leading-none font-semibold text-[#f7f7f7] no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] ease-[ease] hover:border-white/50 hover:bg-white/[0.07] max-[391px]:px-[13px]"
              >
                Explore the API
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

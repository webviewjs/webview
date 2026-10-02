import { cn } from '@/lib/cn';

type Runtime = 'nodejs' | 'deno' | 'bun';

const runtimes: { name: string; runtime: Runtime }[] = [
  { name: 'Node.js', runtime: 'nodejs' },
  { name: 'Deno', runtime: 'deno' },
  { name: 'Bun', runtime: 'bun' },
];

export function RuntimeCompatibility() {
  return (
    <section
      className="relative border-t border-white/[0.075] bg-[#030303] bg-[radial-gradient(ellipse_at_77%_98%,rgb(94_0_19_/_0.1),transparent_40%)] py-[clamp(88px,7.5vw,120px)] max-[1024px]:py-[76px] max-[700px]:py-[58px]"
      aria-labelledby="runtime-title"
    >
      <div className="mx-auto box-border w-full max-w-[1280px] px-[clamp(24px,4vw,48px)] max-[391px]:px-5">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-center gap-[clamp(32px,5vw,72px)] max-[1024px]:grid-cols-[minmax(0,1fr)] max-[1024px]:gap-[18px] max-[700px]:gap-[17px]">
          <h2
            className="m-0 text-[clamp(48px,4.5vw,64px)] leading-[1] font-[650] tracking-[-0.065em] text-balance text-[#f5f5f5] max-[1024px]:text-[clamp(48px,6.4vw,58px)] max-[700px]:text-[clamp(42px,11vw,54px)]"
            id="runtime-title"
          >
            One API.
            <br />
            Any runtime<span className="text-[#ff1744]">.</span>
          </h2>
          <p className="m-0 max-w-[470px] text-[16px] leading-[1.55] text-[rgb(245_245_245_/_0.7)] max-[1024px]:max-w-[680px] max-[700px]:max-w-[520px]">
            Use the same WebviewJS API with Node.js, Deno, or Bun. Choose the runtime that fits your workflow and build
            native desktop apps the way you prefer.
          </p>
        </div>
        <div
          className="relative mt-[48px] max-[700px]:mt-[32px]"
          role="list"
          aria-label="JavaScript runtimes supported by WebviewJS"
        >
          <div className="relative z-[1] flex items-center justify-between gap-0 max-[700px]:flex-col max-[700px]:gap-[14px]">
            {runtimes.flatMap(({ name, runtime }, index) => [
              <div
                className="relative z-[1] flex w-full max-w-[260px] flex-[0_1_260px] min-h-[100px] items-center gap-[18px] rounded-[8px] border border-white/[0.2] bg-[#070708] px-[24px] py-[18px] shadow-[0_8px_24px_rgb(0_0_0_/_0.35)] max-[700px]:max-w-none max-[700px]:flex-none max-[700px]:min-h-[82px] max-[700px]:flex-row max-[700px]:justify-start max-[700px]:gap-[18px] max-[700px]:px-[22px] max-[700px]:py-[14px] max-[700px]:text-center"
                key={runtime}
                role="listitem"
              >
                <span
                  className={cn(
                    'grid h-9 w-[34px] flex-none place-items-center text-[#ff1744] [filter:drop-shadow(0_0_7px_rgb(255_23_68_/_0.35))]',
                    runtime === 'deno' && 'text-[#e5e7eb] [filter:drop-shadow(0_0_7px_rgb(229_231_235_/_0.28))]',
                    runtime === 'bun' && 'text-[#fbf0df] [filter:drop-shadow(0_0_7px_rgb(251_240_223_/_0.32))]',
                  )}
                >
                  <img
                    className="block h-full w-full object-contain"
                    src={'/images/runtimes/' + runtime + '.svg'}
                    alt=""
                    aria-hidden="true"
                  />
                </span>
                <span className="flex min-w-0 flex-col gap-[7px] max-[700px]:items-center">
                  <strong className="text-[16px] font-semibold text-[#f2f2f2]">{name}</strong>
                  <small className="[font-family:var(--font-mono,ui-monospace),monospace] text-[11px] tracking-[0.14em] whitespace-nowrap text-[rgb(245_245_245_/_0.62)] max-[700px]:text-[12px]">
                    SAME API
                  </small>
                </span>
              </div>,
              ...(index < runtimes.length - 1
                ? [
                    <span
                      className="relative block min-w-[20px] h-[100px] flex-[1_1_0] max-[700px]:hidden before:absolute before:-inset-x-px before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-[linear-gradient(90deg,#b90c2b,#ff1744_50%,#b90c2b)] before:shadow-[0_0_5px_rgb(255_23_68_/_0.4)] before:content-[''] after:absolute after:left-1/2 after:top-1/2 after:size-[5px] after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-[#ff1744] after:shadow-[0_0_8px_rgb(255_23_68_/_0.7)] after:content-['']"
                      key={runtime + '-connector'}
                      role="presentation"
                      aria-hidden="true"
                    />,
                  ]
                : []),
            ])}
          </div>
        </div>
      </div>
    </section>
  );
}

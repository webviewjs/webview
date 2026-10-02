import { cn } from '@/lib/cn';
import { HighlightedCode } from './highlighted-code';

const tracks = [
  {
    label: 'Native window events',
    kind: 'native',
    events: ['Input', 'Resize', 'Focus', 'Pointer'],
  },
  {
    label: 'Async JavaScript',
    kind: 'javascript',
    events: ['Timers', 'Promises', 'fetch', 'Background work'],
  },
] as const;

const code = [
  "import { Application } from '@webviewjs/webview';",
  '',
  'const app = new Application();',
  "app.createBrowserWindow({ title: 'My App' });",
  '',
  'setInterval(() => {',
  "  console.log('still running');",
  '}, 1000);',
  '',
  "const response = await fetch('https://example.com');",
  'console.log(response.status);',
  '',
  'app.run();',
].join('\n');

const panelClassName =
  'min-w-0 overflow-hidden rounded-[9px] border border-white/[0.16] bg-[linear-gradient(145deg,#0d0d0e,#080809)] shadow-[0_16px_44px_rgb(0_0_0_/_0.36)]';

export function EventLoopIntegration() {
  return (
    <section
      className="relative border-t border-white/[0.075] bg-[#050505] bg-[radial-gradient(ellipse_at_20%_76%,rgb(88_0_18_/_0.1),transparent_38%)] py-[clamp(88px,7.5vw,120px)] max-[1024px]:py-[76px] max-[700px]:py-[58px]"
      aria-labelledby="event-loop-title"
    >
      <div className="box-border mx-auto w-full max-w-[1280px] px-[clamp(24px,4vw,48px)] max-[391px]:px-5">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-center gap-[clamp(32px,5vw,72px)] max-[1024px]:grid-cols-1 max-[1024px]:gap-[18px] max-[700px]:gap-[17px]">
          <h2
            className="m-0 text-[clamp(48px,4.5vw,64px)] leading-none font-[650] tracking-[-0.065em] text-[#f5f5f5] text-balance max-[1024px]:text-[clamp(48px,6.4vw,58px)] max-[700px]:text-[clamp(42px,11vw,54px)]"
            id="event-loop-title"
          >
            Async code
            <br />
            keeps running<span className="text-[#ff1744]">.</span>
          </h2>
          <p className="m-0 max-w-[470px] text-[16px] leading-[1.55] [color:rgb(245_245_245_/_0.7)] max-[1024px]:max-w-[680px] max-[700px]:max-w-[520px]">
            WebviewJS pumps native window events without blocking JavaScript. Timers, promises, fetch requests, and
            background work keep running while your app is open.
          </p>
        </div>

        <div className="mt-[42px] grid grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] items-stretch gap-[clamp(18px,2vw,28px)] max-[1024px]:mt-8 max-[1024px]:grid-cols-1 max-[1024px]:gap-4">
          <div
            className={cn(
              panelClassName,
              'flex min-h-[310px] flex-col justify-center p-[clamp(20px,2.4vw,30px)] max-[700px]:min-h-0 max-[700px]:px-[14px] max-[700px]:py-[18px]',
            )}
            role="img"
            aria-label="Native window events and asynchronous JavaScript progress concurrently. Window events are processed without taking over JavaScript."
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-[13px]">
              <strong className="text-[12px] font-semibold text-[#f0f0f0]">Non-blocking event loop</strong>
              <span className="whitespace-nowrap text-[9px] tracking-[0.12em] text-[#8e8e8e] [font-family:var(--font-mono,ui-monospace),monospace]">
                <i className="ml-1 text-[13px] text-[#ff1744] not-italic" aria-hidden="true">
                  →
                </i>
              </span>
            </div>
            <div className="my-8 grid gap-[34px] max-[700px]:my-[26px] max-[700px]:gap-[26px]">
              {tracks.map(({ label, kind, events }) => (
                <div
                  className="grid grid-cols-[minmax(108px,0.72fr)_minmax(0,2.8fr)] items-start gap-4 max-[700px]:grid-cols-1 max-[700px]:gap-3"
                  key={kind}
                >
                  <strong
                    className={cn(
                      'pt-px text-[10px] leading-[1.4] font-medium text-[#c5c5c5] [font-family:var(--font-mono,ui-monospace),monospace] max-[700px]:text-[10px]',
                      kind === 'native' && 'text-[#ff405f]',
                    )}
                  >
                    {label}
                  </strong>
                  <div
                    className={cn(
                      'relative grid grid-cols-4',
                      "before:absolute before:top-1 before:right-[12.5%] before:left-[12.5%] before:h-px before:bg-white/[0.22] before:content-['']",
                      kind === 'native' &&
                        'before:bg-[linear-gradient(90deg,rgb(255_23_68_/_0.35),#ff1744_50%,rgb(255_23_68_/_0.35))]',
                    )}
                  >
                    {events.map((event, index) => (
                      <span
                        className="relative flex min-w-0 flex-col items-center gap-[9px] text-[9px] leading-[1.35] text-center text-[#aaa] [font-family:var(--font-mono,ui-monospace),monospace] max-[700px]:text-[8px]"
                        key={event + index}
                      >
                        <i
                          className={cn(
                            'z-[1] size-[9px] shrink-0 rounded-full border border-[#b3b3b3] bg-[#0b0b0c]',
                            kind === 'native' && 'border-[#ff1744] shadow-[0_0_7px_rgb(255_23_68_/_0.5)]',
                            kind === 'javascript' && (index === 1 || index === 2) && 'border-[#ff405f]',
                          )}
                          aria-hidden="true"
                        />
                        <span className={cn(kind === 'native' && 'text-[#d9d9d9]')}>{event}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex min-h-[42px] items-center rounded-md border border-[#ff1744]/20 bg-[rgb(255_23_68_/_0.045)] px-3 py-1.5 text-[10px] text-[#aaa] [font-family:var(--font-mono,ui-monospace),monospace] max-[700px]:gap-[7px] max-[700px]:text-[9px]">
              <div className="flex min-w-0 items-start gap-2 text-[#d1d1d1]">
                <span className="grid min-w-0 gap-[3px]">
                  <strong className="text-[10px] font-semibold text-[#f0f0f0]">No blocking run loop</strong>
                  <span className="text-[9px] leading-[1.4] text-[#aaa]">
                    Window events are processed without taking over JavaScript.
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className={cn(panelClassName, 'flex min-h-[310px] flex-col max-[700px]:min-h-0')}>
            <div className="flex min-h-11 items-center justify-between gap-3 border-b border-white/10 bg-[#0c0c0d] px-4 text-[11px] text-[#c7c7c7] [font-family:var(--font-mono,ui-monospace),monospace]">
              <span>main.ts</span>
              <span className="whitespace-nowrap text-[9px] tracking-[0.08em] text-[#ff405f]">NODE · DENO · BUN</span>
            </div>
            <pre
              className="m-0 flex-1 overflow-auto px-4 py-[18px] text-[11px] leading-[1.7] whitespace-pre text-[#e7e7e7] [font-family:var(--font-mono,ui-monospace),monospace] max-[700px]:px-3 max-[700px]:py-4 max-[700px]:text-[10px] [&>code]:block [&>code]:w-max [&>code]:min-w-full"
              aria-label="JavaScript example with a responsive native window and continuing async work"
            >
              <HighlightedCode source={code} lineNumbers={false} lineClass="block min-h-[1.7em] whitespace-pre" />
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

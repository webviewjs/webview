function PlatformMark({ platform }: { platform: 'windows' | 'macos' | 'linux' }) {
  if (platform === 'windows') {
    return (
      <svg className="block h-full w-full" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 5.3 10.5 4v7H2zM12 3.8 22 2.3V11H12zM2 13h8.5v7L2 18.7zM12 13h10v8.7L12 20z" fill="currentColor" />
      </svg>
    );
  }

  if (platform === 'macos') {
    return (
      <svg className="block h-full w-full" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M17.7 12.8c0-2.3 1.9-3.4 2-3.5a4.4 4.4 0 0 0-3.5-1.9c-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.8a4.9 4.9 0 0 0-4.1 2.5c-1.8 3.1-.5 7.7 1.2 10.2.8 1.2 1.7 2.5 3 2.4 1.2-.1 1.7-.8 3.3-.8s2.1.8 3.4.8 2.1-1.2 2.9-2.4a10 10 0 0 0 1.3-2.7 4 4 0 0 1-2.4-4.7ZM15.2 5.8a4.2 4.2 0 0 0 1-3.1 4.3 4.3 0 0 0-2.8 1.5 4 4 0 0 0-1 3 3.6 3.6 0 0 0 2.8-1.4Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg className="block h-full w-full" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M220.8 123.3c1 .5 1.8 1.7 3 1.7 1.1 0 2.8-.4 2.9-1.5.2-1.4-1.9-2.3-3.2-2.9-1.7-.7-3.9-1-5.5-.1-.4.2-.8.7-.6 1.1.3 1.3 2.3 1.1 3.4 1.7zm-21.9 1.7c1.2 0 2-1.2 3-1.7 1.1-.6 3.1-.4 3.5-1.6.2-.4-.2-.9-.6-1.1-1.6-.9-3.8-.6-5.5.1-1.3.6-3.4 1.5-3.2 2.9.1 1 1.8 1.5 2.8 1.4zM420 403.8c-3.6-4-5.3-11.6-7.2-19.7-1.8-8.1-3.9-16.8-10.5-22.4-1.3-1.1-2.6-2.1-4-2.9-1.3-.8-2.7-1.5-4.1-2 9.2-27.3 5.6-54.5-3.7-79.1-11.4-30.1-31.3-56.4-46.5-74.4-17.1-21.5-33.7-41.9-33.4-72C311.1 85.4 315.7.1 234.8 0 132.4-.2 158 103.4 156.9 135.2c-1.7 23.4-6.4 41.8-22.5 64.7-18.9 22.5-45.5 58.8-58.1 96.7-6 17.9-8.8 36.1-6.2 53.3-6.5 5.8-11.4 14.7-16.6 20.2-4.2 4.3-10.3 5.9-17 8.3s-14 6-18.5 14.5c-2.1 3.9-2.8 8.1-2.8 12.4 0 3.9.6 7.9 1.2 11.8 1.2 8.1 2.5 15.7.8 20.8-5.2 14.4-5.9 24.4-2.2 31.7 3.8 7.3 11.4 10.5 20.1 12.3 17.3 3.6 40.8 2.7 59.3 12.5 19.8 10.4 39.9 14.1 55.9 10.4 11.6-2.6 21.1-9.6 25.9-20.2 12.5-.1 26.3-5.4 48.3-6.6 14.9-1.2 33.6 5.3 55.1 4.1.6 2.3 1.4 4.6 2.5 6.7v.1c8.3 16.7 23.8 24.3 40.3 23 16.6-1.3 34.1-11 48.3-27.9 13.6-16.4 36-23.2 50.9-32.2 7.4-4.5 13.4-10.1 13.9-18.3.4-8.2-4.4-17.3-15.5-29.7zM223.7 87.3c9.8-22.2 34.2-21.8 44-.4 6.5 14.2 3.6 30.9-4.3 40.4-1.6-.8-5.9-2.6-12.6-4.9 1.1-1.2 3.1-2.7 3.9-4.6 4.8-11.8-.2-27-9.1-27.3-7.3-.5-13.9 10.8-11.8 23-4.1-2-9.4-3.5-13-4.4-1-6.9-.3-14.6 2.9-21.8zM183 75.8c10.1 0 20.8 14.2 19.1 33.5-3.5 1-7.1 2.5-10.2 4.6 1.2-8.9-3.3-20.1-9.6-19.6-8.4.7-9.8 21.2-1.8 28.1 1 .8 1.9-.2-5.9 5.5-15.6-14.6-10.5-52.1 8.4-52.1zm-13.6 60.7c6.2-4.6 13.6-10 14.1-10.5 4.7-4.4 13.5-14.2 27.9-14.2 7.1 0 15.6 2.3 25.9 8.9 6.3 4.1 11.3 4.4 22.6 9.3 8.4 3.5 13.7 9.7 10.5 18.2-2.6 7.1-11 14.4-22.7 18.1-11.1 3.6-19.8 16-38.2 14.9-3.9-.2-7-1-9.6-2.1-8-3.5-12.2-10.4-20-15-8.6-4.8-13.2-10.4-14.7-15.3-1.4-4.9 0-9 4.2-12.3zm3.3 334c-2.7 35.1-43.9 34.4-75.3 18-29.9-15.8-68.6-6.5-76.5-21.9-2.4-4.7-2.4-12.7 2.6-26.4v-.2c2.4-7.6.6-16-.6-23.9-1.2-7.8-1.8-15 .9-20 3.5-6.7 8.5-9.1 14.8-11.3 10.3-3.7 11.8-3.4 19.6-9.9 5.5-5.7 9.5-12.9 14.3-18 5.1-5.5 10-8.1 17.7-6.9 8.1 1.2 15.1 6.8 21.9 16l19.6 35.6c9.5 19.9 43.1 48.4 41 68.9zm-1.4-25.9c-4.1-6.6-9.6-13.6-14.4-19.6 7.1 0 14.2-2.2 16.7-8.9 2.3-6.2 0-14.9-7.4-24.9-13.5-18.2-38.3-32.5-38.3-32.5-13.5-8.4-21.1-18.7-24.6-29.9s-3-23.3-.3-35.2c5.2-22.9 18.6-45.2 27.2-59.2 2.3-1.7.8 3.2-8.7 20.8-8.5 16.1-24.4 53.3-2.6 82.4.6-20.7 5.5-41.8 13.8-61.5 12-27.4 37.3-74.9 39.3-112.7 1.1.8 4.6 3.2 6.2 4.1 4.6 2.7 8.1 6.7 12.6 10.3 12.4 10 28.5 9.2 42.4 1.2 6.2-3.5 11.2-7.5 15.9-9 9.9-3.1 17.8-8.6 22.3-15 7.7 30.4 25.7 74.3 37.2 95.7 6.1 11.4 18.3 35.5 23.6 64.6 3.3-.1 7 .4 10.9 1.4 13.8-35.7-11.7-74.2-23.3-84.9-4.7-4.6-4.9-6.6-2.6-6.5 12.6 11.2 29.2 33.7 35.2 59 2.8 11.6 3.3 23.7.4 35.7 16.4 6.8 35.9 17.9 30.7 34.8-2.2-.1-3.2 0-4.2 0 3.2-10.1-3.9-17.6-22.8-26.1-19.6-8.6-36-8.6-38.3 12.5-12.1 4.2-18.3 14.7-21.4 27.3-2.8 11.2-3.6 24.7-4.4 39.9-.5 7.7-3.6 18-6.8 29-32.1 22.9-76.7 32.9-114.3 7.2zm257.4-11.5c-.9 16.8-41.2 19.9-63.2 46.5-13.2 15.7-29.4 24.4-43.6 25.5s-26.5-4.8-33.7-19.3c-4.7-11.1-2.4-23.1 1.1-36.3 3.7-14.2 9.2-28.8 9.9-40.6.8-15.2 1.7-28.5 4.2-38.7 2.6-10.3 6.6-17.2 13.7-21.1.3-.2.7-.3 1-.5.8 13.2 7.3 26.6 18.8 29.5 12.6 3.3 30.7-7.5 38.4-16.3 9-.3 15.7-.9 22.6 5.1 9.9 8.5 7.1 30.3 17.1 41.6 10.6 11.6 14 19.5 13.7 24.6zM173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z" />
    </svg>
  );
}

const platforms = [
  { name: 'Windows', engine: 'WEBVIEW2', platform: 'windows' as const },
  { name: 'macOS', engine: 'WEBKIT', platform: 'macos' as const },
  { name: 'Linux', engine: 'WEBKITGTK', platform: 'linux' as const },
];

export function SystemWebview() {
  return (
    <section
      className="relative border-t border-white/[0.075] bg-[#030303] bg-[radial-gradient(ellipse_at_77%_98%,rgb(94_0_19_/_0.1),transparent_40%)] py-[clamp(88px,7.5vw,120px)] max-[1024px]:py-[76px] max-[700px]:py-[58px]"
      aria-labelledby="platform-title"
    >
      <div className="mx-auto box-border w-full max-w-[1280px] px-[clamp(24px,4vw,48px)] max-[391px]:px-5">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-center gap-[clamp(32px,5vw,72px)] max-[1024px]:grid-cols-[minmax(0,1fr)] max-[1024px]:gap-[18px] max-[700px]:gap-[17px]">
          <h2
            className="m-0 text-[clamp(48px,4.5vw,64px)] leading-[1] font-[650] tracking-[-0.065em] text-balance text-[#f5f5f5] max-[1024px]:text-[clamp(48px,6.4vw,58px)] max-[700px]:text-[clamp(42px,11vw,54px)]"
            id="platform-title"
          >
            The browser
            <br />
            is already there<span className="text-[#ff1744]">.</span>
          </h2>
          <p className="m-0 max-w-[470px] text-[16px] leading-[1.55] text-[rgb(245_245_245_/_0.7)] max-[1024px]:max-w-[680px] max-[700px]:max-w-[520px]">
            WebviewJS uses the webview supplied by the operating system instead of shipping another browser engine with
            your app.
          </p>
        </div>
        <div
          className="relative mt-[48px] max-[700px]:mt-[32px]"
          role="list"
          aria-label="Native webview engines by platform"
        >
          <div className="relative z-[1] flex items-center justify-between gap-0 max-[700px]:flex-col max-[700px]:gap-[14px]">
            {platforms.flatMap(({ name, engine, platform }, index) => [
              <div
                className="relative z-[1] flex w-full max-w-[260px] flex-[0_1_260px] min-h-[100px] items-center gap-[18px] rounded-[8px] border border-white/[0.2] bg-[#070708] px-[24px] py-[18px] shadow-[0_8px_24px_rgb(0_0_0_/_0.35)] max-[700px]:max-w-none max-[700px]:flex-none max-[700px]:min-h-[82px] max-[700px]:flex-row max-[700px]:justify-start max-[700px]:gap-[18px] max-[700px]:px-[22px] max-[700px]:py-[14px] max-[700px]:text-center"
                key={platform}
                role="listitem"
              >
                <span className="grid h-9 w-[34px] flex-none place-items-center text-[#ff1744] [filter:drop-shadow(0_0_7px_rgb(255_23_68_/_0.35))]">
                  <PlatformMark platform={platform} />
                </span>
                <span className="flex min-w-0 flex-col gap-[7px] max-[700px]:items-center">
                  <strong className="text-[16px] font-semibold text-[#f2f2f2]">{name}</strong>
                  <small className="[font-family:var(--font-mono,ui-monospace),monospace] text-[11px] tracking-[0.14em] whitespace-nowrap text-[rgb(245_245_245_/_0.62)] max-[700px]:text-[12px]">
                    {engine}
                  </small>
                </span>
              </div>,
              ...(index < platforms.length - 1
                ? [
                    <span
                      className="relative block min-w-[20px] h-[100px] flex-[1_1_0] max-[700px]:hidden before:absolute before:-inset-x-px before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-[linear-gradient(90deg,#b90c2b,#ff1744_50%,#b90c2b)] before:shadow-[0_0_5px_rgb(255_23_68_/_0.4)] before:content-[''] after:absolute after:left-1/2 after:top-1/2 after:size-[5px] after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-[#ff1744] after:shadow-[0_0_8px_rgb(255_23_68_/_0.7)] after:content-['']"
                      key={platform + '-connector'}
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

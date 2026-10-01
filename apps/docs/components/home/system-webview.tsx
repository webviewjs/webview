const platforms = [
  { name: 'Windows', engine: 'WebView2' },
  { name: 'macOS', engine: 'WebKit' },
  { name: 'Linux', engine: 'WebKitGTK' },
];

export function SystemWebview() {
  return (
    <section className="relative overflow-hidden bg-[#070707] py-28 sm:py-36 lg:py-40">
      <div className="mx-auto w-[calc(100%_-_2.5rem)] max-w-[1500px] sm:w-[calc(100%_-_5rem)] xl:w-[calc(100%_-_8rem)]">
        <div className="grid gap-7 md:grid-cols-[1.08fr_0.92fr] md:items-end md:gap-16">
          <h2 className="max-w-[12ch] text-[clamp(2.7rem,5.1vw,5.2rem)] font-medium leading-[0.98] tracking-[-0.065em] text-[#f5f5f5] [text-wrap:balance]">
            The browser is already there.
          </h2>
          <p className="max-w-[510px] pb-1 text-base leading-7 text-[#949494] sm:text-[17px] sm:leading-8 md:justify-self-end">
            WebviewJS uses the webview supplied by the operating system instead of shipping another browser engine with
            your app.
          </p>
        </div>

        <div
          className="relative mt-16 min-h-[300px] sm:mt-20 lg:mt-24"
          role="img"
          aria-label="Windows, macOS, and Linux provide their own webview engines."
        >
          <svg
            className="pointer-events-none absolute inset-x-0 top-0 h-[255px] w-full"
            viewBox="0 0 1200 260"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <filter id="system-line-glow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M0 207h112v-45h176m0 0h162v30h150v-57h150m0 0h164v42h174m0 0h112"
              fill="none"
              stroke="#C8152F"
              strokeOpacity=".82"
              strokeWidth="1"
              filter="url(#system-line-glow)"
            />
            <circle cx="288" cy="162" r="3" fill="#FF2347" />
            <circle cx="600" cy="135" r="3" fill="#FF2347" />
            <circle cx="914" cy="177" r="3" fill="#FF2347" />
          </svg>
          <div className="relative grid grid-cols-3 gap-2 sm:gap-6">
            {platforms.map(({ name, engine }, index) => (
              <div className="relative flex flex-col items-center" key={name}>
                <svg
                  className={`relative z-10 h-[115px] w-full max-w-[245px] text-white/[0.3] sm:h-[145px] ${index === 1 ? 'sm:-mt-5 sm:h-[165px]' : ''}`}
                  viewBox="0 0 260 150"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M18.5 20.5h223v112h-223z" stroke="currentColor" />
                  <path d="M19 43h222" stroke="currentColor" />
                  <path d="M31 32h5m8 0h5m8 0h5" stroke="currentColor" />
                  <path d="M38 62h91m-91 13h67m-67 13h108m-108 13h55" stroke="currentColor" />
                  <path d="M169 62h53v39h-53z" stroke="#C8152F" strokeOpacity=".8" />
                </svg>
                <div className="relative z-10 mt-4 flex flex-col items-center gap-1 bg-[#070707] px-2 text-center sm:mt-6">
                  <span className="text-sm font-medium tracking-[-0.02em] text-white/90 sm:text-base">{name}</span>
                  <span className="font-mono text-[10px] tracking-[0.12em] text-white/40 sm:text-[11px]">{engine}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

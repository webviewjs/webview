export function NativeWindow() {
  return (
    <div
      className="relative mx-auto min-w-0 max-w-[900px] px-0 py-3 sm:px-2 sm:py-5"
      role="img"
      aria-label="A native desktop window displaying a WebviewJS webview."
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[12%] bottom-[5%] h-[34%] bg-[#c8152f]/[0.12] blur-[76px]"
      />
      <div className="relative overflow-hidden rounded-[12px] border border-white/[0.15] bg-[#080809] shadow-[0_34px_110px_rgba(0,0,0,0.78),0_0_54px_rgba(115,11,28,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="relative flex h-11 items-center justify-between border-b border-white/[0.08] bg-[#0b0b0c] px-4 text-[11px] text-white/50 sm:h-[50px] sm:px-5">
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <i className="size-[7px] rounded-full bg-[#c8152f]" />
            <i className="size-[7px] rounded-full bg-white/25" />
            <i className="size-[7px] rounded-full bg-white/25" />
          </span>
          <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-wide text-white/60">
            my-app
          </span>
          <span className="flex items-center gap-2.5" aria-hidden="true">
            <i className="h-2 w-2 border border-white/20" />
            <i className="h-2 w-2 border border-white/20" />
          </span>
        </div>
        <div className="p-2 sm:p-3">
          <div className="relative min-h-[340px] overflow-hidden border border-white/[0.07] bg-[#09090a] text-[#f5f5f5] sm:min-h-[415px] lg:min-h-[455px]">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_84%_78%,rgba(115,11,28,0.28),transparent_40%)]"
              aria-hidden="true"
            />
            <div className="relative flex h-9 items-center justify-between border-b border-white/[0.07] bg-[#0c0c0d] px-4 font-mono text-[10px] text-white/40 sm:h-10">
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#c8152f] shadow-[0_0_8px_rgba(255,35,71,0.6)]" />
                localhost:3000
              </span>
              <span className="hidden tracking-[0.1em] text-white/25 sm:block">WEBVIEW</span>
            </div>
            <div className="relative flex min-h-[301px] flex-col justify-center overflow-hidden px-6 py-12 sm:min-h-[365px] sm:px-12 lg:min-h-[405px] lg:px-[10%]">
              <svg
                className="pointer-events-none absolute -right-2 top-1/2 h-[210px] w-[210px] -translate-y-1/2 opacity-55 sm:right-0 sm:h-[300px] sm:w-[300px]"
                viewBox="0 0 300 300"
                fill="none"
                aria-hidden="true"
              >
                <path d="M86 24H272V210" stroke="white" strokeOpacity=".1" />
                <path d="M34 76H220V262H34V76Z" stroke="white" strokeOpacity=".17" />
                <path d="M34 112H220" stroke="#C8152F" strokeOpacity=".9" />
                <path d="M220 112V262" stroke="#C8152F" strokeOpacity=".42" />
                <circle cx="220" cy="112" r="3" fill="#FF2347" />
              </svg>
              <span className="relative z-10 mb-6 h-[2px] w-12 bg-[#c8152f] shadow-[0_0_16px_rgba(200,21,47,0.45)]" />
              <p className="relative z-10 text-[13px] font-medium tracking-[0.01em] text-white/48 sm:text-[15px]">
                Hello from
              </p>
              <h2 className="relative z-10 mt-2 text-[clamp(2.3rem,5vw,4.7rem)] font-medium leading-none tracking-[-0.075em] sm:mt-3">
                WebviewJS<span className="text-[#c8152f]">.</span>
              </h2>
              <p className="relative z-10 mt-5 max-w-[300px] text-[12px] leading-6 tracking-wide text-white/45 sm:mt-7 sm:text-sm sm:leading-7">
                Your web content. A native window.
              </p>
              <div className="absolute bottom-0 left-0 right-0 flex h-px items-stretch" aria-hidden="true">
                <i className="w-[22%] bg-[#c8152f] shadow-[0_0_13px_1px_rgba(200,21,47,0.65)]" />
                <i className="flex-1 bg-white/[0.08]" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <svg
        className="pointer-events-none absolute -bottom-3 left-[-8%] hidden h-36 w-40 overflow-visible sm:block"
        viewBox="0 0 160 140"
        aria-hidden="true"
      >
        <path d="M1 114h66V55h47" fill="none" stroke="#C8152F" strokeWidth="1" />
        <circle cx="114" cy="55" r="3" fill="#FF2347" />
      </svg>
      <span className="absolute bottom-1 right-2 font-mono text-[9px] tracking-[0.14em] text-white/30 sm:right-6">
        SYSTEM WEBVIEW
      </span>
    </div>
  );
}

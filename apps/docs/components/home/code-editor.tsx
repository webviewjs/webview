export function CodeEditor() {
  const lineClass = 'block whitespace-pre';
  const numberClass = 'mr-5 inline-block w-5 select-none text-right text-white/25';

  return (
    <div className="relative z-10 min-w-0 overflow-hidden rounded-[9px] border border-white/[0.12] bg-[#090909] shadow-[0_28px_80px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex h-12 items-center justify-between border-b border-white/[0.09] bg-[#0d0d0e] px-4 sm:px-6">
        <span className="flex h-full items-center gap-3 border-b border-[#c8152f] font-mono text-[11px] text-white/75 sm:text-xs">
          <i className="size-1.5 bg-[#c8152f]" aria-hidden="true" />
          src/main.ts
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/30">TypeScript</span>
      </div>
      <div className="overflow-x-auto px-2 py-6 sm:px-4 sm:py-8">
        <pre
          className="min-w-max font-mono text-[11px] leading-[2.1] text-[#e5e5e5] sm:text-[13px]"
          aria-label="TypeScript example that creates a native window"
        >
          <code>
            <span className={lineClass}>
              <span className={numberClass}>1</span>
              <span className="text-[#ff526c]">import</span>
              {' { Application } '}
              <span className="text-[#ff526c]">from</span> <span className="text-[#ff8b68]">'@webviewjs/webview'</span>;
            </span>
            <span className={lineClass}>
              <span className={numberClass}>2</span>
            </span>
            <span className={lineClass}>
              <span className={numberClass}>3</span>
              <span className="text-[#ff526c]">const</span>
              {' app = '}
              <span className="text-[#ff526c]">new</span>
              {' Application();'}
            </span>
            <span className={lineClass}>
              <span className={numberClass}>4</span>
            </span>
            <span className={lineClass}>
              <span className={numberClass}>5</span>
              <span className="text-[#ff526c]">const</span>
              {' window = app.'}
              <span className="text-[#ff2347]">createBrowserWindow</span>({'{'}
            </span>
            <span className={lineClass}>
              <span className={numberClass}>6</span>
              {'  title: '}
              <span className="text-[#ff8b68]">'My App'</span>,
            </span>
            <span className={lineClass}>
              <span className={numberClass}>7</span>
              {'  width: '}
              <span className="text-[#e8bf7a]">1024</span>,
            </span>
            <span className={lineClass}>
              <span className={numberClass}>8</span>
              {'  height: '}
              <span className="text-[#e8bf7a]">768</span>,
            </span>
            <span className={lineClass}>
              <span className={numberClass}>9</span>
              {'});'}
            </span>
            <span className={lineClass}>
              <span className={numberClass}>10</span>
            </span>
            <span className={lineClass}>
              <span className={numberClass}>11</span>
              {'window.'}
              <span className="text-[#ff2347]">createWebview</span>({'{ url: '}
              <span className="text-[#ff8b68]">'https://example.com'</span>
              {' });'}
            </span>
            <span className={lineClass}>
              <span className={numberClass}>12</span>
            </span>
            <span className={lineClass}>
              <span className={numberClass}>13</span>
              {'app.'}
              <span className="text-[#ff2347]">run</span>();
            </span>
          </code>
        </pre>
      </div>
      <div className="flex h-9 items-center justify-between border-t border-white/[0.07] px-4 font-mono text-[9px] text-white/35">
        <span>src/main.ts</span>
        <span>JavaScript → native window</span>
      </div>
    </div>
  );
}

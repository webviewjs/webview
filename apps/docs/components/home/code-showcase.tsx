import Link from 'next/link';
import { ArrowRight, CodeXml, ExternalLink } from 'lucide-react';
import { CopyCodeButton } from './copy-code-button';

const source = `import { Application } from '@webviewjs/webview';

const app = new Application();
const window = app.createBrowserWindow({
  title: 'My App',
  width: 1024,
  height: 768,
});

window.createWebview({ url: 'https://example.com' });
app.run();`;

const lines = source.split('\n');

export function CodeShowcase() {
  return (
    <section className="wjs-code-section">
      <div className="wjs-container wjs-section">
        <div className="mb-10 grid gap-6 md:grid-cols-[1fr_0.78fr] md:items-end">
          <div>
            <p className="wjs-eyebrow">Start with JavaScript</p>
            <h2 className="wjs-section-title mt-4 max-w-[12ch]">A small API. A native result.</h2>
          </div>
          <div className="md:justify-self-end md:pb-1">
            <p className="wjs-copy max-w-[450px]">
              Create an application, open a native window, and choose what the webview displays. Keep your UI framework
              and build tools.
            </p>
            <Link
              href="/getting-started/quick-start"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--wjs-accent)] transition-colors hover:text-[var(--wjs-text)]"
            >
              Read the quick start <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>

        <div className="wjs-code-editor">
          <div className="flex min-h-[50px] items-center justify-between gap-4 border-b border-white/[0.08] bg-[#151c20] px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex shrink-0 items-center gap-2.5 border-b border-[#83dce8] py-[17px] font-mono text-[11px] text-[#e2ecee] sm:text-xs">
                <CodeXml aria-hidden="true" className="size-4 text-[#83dce8]" />
                src/main.ts
              </span>
              <span className="hidden font-mono text-[10px] text-white/35 sm:inline">TypeScript</span>
            </div>
            <CopyCodeButton source={source} />
          </div>

          <div className="grid lg:grid-cols-[1.12fr_0.88fr]">
            <div className="min-w-0 overflow-x-auto px-3 py-6 sm:px-7 sm:py-8">
              <pre className="font-mono text-[11px] leading-[2] text-[#c9d4d7] sm:text-[13px]">
                <code>
                  {lines.map((line, index) => (
                    <span className="wjs-code-line min-h-[1.6em]" key={`${index}-${line}`}>
                      <span className="wjs-code-number">{index + 1}</span>
                      <HighlightedLine line={line} />
                    </span>
                  ))}
                </code>
              </pre>
            </div>

            <div className="border-t border-white/[0.08] bg-[#0d1316] p-4 sm:p-6 lg:border-l lg:border-t-0">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">Native window</p>
                <span className="flex items-center gap-2 font-mono text-[9px] text-white/45">
                  <span className="size-1.5 rounded-full bg-[#83dce8]" /> SYSTEM WEBVIEW
                </span>
              </div>
              <div className="overflow-hidden rounded-[11px] border border-white/10 bg-[#e9eeec] shadow-[0_18px_35px_rgb(0_0_0/0.24)]">
                <div className="flex h-8 items-center gap-2 border-b border-black/10 bg-[#f6f8f7] px-3">
                  <span className="flex gap-1">
                    <i className="size-1.5 rounded-full bg-[#aab4b5]" />
                    <i className="size-1.5 rounded-full bg-[#aab4b5]" />
                    <i className="size-1.5 rounded-full bg-[#aab4b5]" />
                  </span>
                  <span className="ml-auto mr-auto font-mono text-[8px] text-[#768184]">example.com</span>
                </div>
                <div className="flex min-h-[185px] flex-col items-center justify-center px-4 text-center text-[#263336] sm:min-h-[220px]">
                  <span className="mb-4 grid size-10 place-items-center rounded-[10px] border border-[#0b788a]/15 bg-[#d8eff0] text-[#0b788a]">
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </span>
                  <span className="text-[15px] font-semibold tracking-[-0.03em] sm:text-[17px]">Your web content</span>
                  <span className="mt-1 font-mono text-[9px] text-[#718083]">rendered by the platform engine</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HighlightedLine({ line }: { line: string }) {
  const pieces = line.split(/('(?:[^']*)'|\b(?:import|from|const|new)\b|\b\d+\b)/g);

  return pieces.map((piece, index) => {
    const key = `${piece}-${index}`;
    if (/^'(?:[^']*)'$/.test(piece)) {
      return (
        <span key={key} className="wjs-token-string">
          {piece}
        </span>
      );
    }
    if (/^(import|from|const|new)$/.test(piece)) {
      return (
        <span key={key} className="wjs-token-keyword">
          {piece}
        </span>
      );
    }
    if (/^\d+$/.test(piece)) {
      return (
        <span key={key} className="wjs-token-number">
          {piece}
        </span>
      );
    }
    return <span key={key}>{piece}</span>;
  });
}

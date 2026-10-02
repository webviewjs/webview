'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { HighlightedCode } from './highlighted-code';

const example = [
  "import { Application } from '@webviewjs/webview';",
  '',
  'const app = new Application();',
  '',
  'const window = app.createBrowserWindow({',
  "  title: 'My App',",
  '  width: 1024,',
  '  height: 768,',
  '});',
  '',
  "window.createWebview({ url: 'https://example.com' });",
  '',
  'app.run();',
].join('\n');

export function CodeEditor() {
  const [copied, setCopied] = useState(false);

  async function copyExample() {
    try {
      await navigator.clipboard.writeText(example);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="h-auto min-h-[354px] min-w-0 overflow-hidden rounded-[9px] border border-white/[0.16] bg-[#09090a] shadow-[0_16px_44px_rgb(0_0_0_/_0.4)] max-[700px]:min-h-[340px]">
      <div className="flex h-[44px] items-center justify-between border-b border-white/[0.1] bg-[#0c0c0d] px-[16px]">
        <span className="inline-flex items-center gap-[10px] [font-family:var(--font-mono,ui-monospace),monospace] text-[13px] text-[#c7c7c7]">
          <strong className="text-[13px] font-bold text-[#44dfa6]">JS</strong>
          main.js
        </span>
        <button
          className="inline-flex min-h-[32px] items-center gap-[8px] border-0 bg-transparent px-2 text-[12px] text-[#aaa] cursor-pointer hover:text-white"
          type="button"
          onClick={copyExample}
          aria-label={copied ? 'Example copied' : 'Copy JavaScript example'}
        >
          {copied ? (
            <Check className="size-[15px]" aria-hidden="true" />
          ) : (
            <Copy className="size-[15px]" aria-hidden="true" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="h-auto min-h-[308px] overflow-auto px-[13px] pt-[14px] pb-[18px] max-[700px]:min-h-[294px] max-[700px]:px-[10px] max-[700px]:pb-[16px]">
        <pre
          className="m-0 text-[#e7e7e7] [font-family:var(--font-mono,ui-monospace),monospace] text-[14px] leading-[1.55]"
          aria-label="JavaScript example that creates a native window"
        >
          <HighlightedCode source={example} />
        </pre>
      </div>
    </div>
  );
}

'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const command = 'npm i @webviewjs/webview';

export function InstallCommand() {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setMessage('Install command copied.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setMessage('Copy unavailable. Select the command to copy it.');
    }
  }

  return (
    <div className="mt-7 max-w-[420px] sm:mt-8">
      <div className="group flex min-w-0 items-center gap-3 border-b border-white/20 py-3 font-mono text-[12px] sm:text-[13px]">
        <span aria-hidden="true" className="select-none text-[#c8152f]">
          $
        </span>
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-white/75">{command}</code>
        <button
          type="button"
          aria-label={copied ? 'Install command copied' : 'Copy install command'}
          onClick={copyCommand}
          className="inline-flex size-8 shrink-0 items-center justify-center text-white/45 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff2347]"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4 text-[#ff2347]" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
      <p aria-live="polite" className="min-h-5 pt-1.5 text-[11px] text-white/45">
        {message}
      </p>
    </div>
  );
}

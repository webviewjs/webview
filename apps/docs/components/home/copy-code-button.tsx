'use client';

import { Check, Clipboard } from 'lucide-react';
import { useState } from 'react';

export function CopyCodeButton({ source }: { source: string }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setFeedback('Code copied to clipboard.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setFeedback('Copy unavailable. Select the code to copy it.');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <p aria-live="polite" className="sr-only">
        {feedback}
      </p>
      <button
        type="button"
        onClick={copyCode}
        aria-label={copied ? 'Code copied' : 'Copy TypeScript example'}
        className="inline-flex shrink-0 items-center gap-2 rounded-md border border-white/[0.1] px-2.5 py-1.5 font-mono text-[10px] text-white/65 transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#83dce8] sm:text-[11px]"
      >
        {copied ? (
          <Check aria-hidden="true" className="size-3.5 text-[#83dce8]" />
        ) : (
          <Clipboard aria-hidden="true" className="size-3.5" />
        )}
        <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy code'}</span>
      </button>
    </div>
  );
}

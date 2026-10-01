'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const command = 'npm install @webviewjs/webview';

export function InstallCommand() {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('');

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setStatus('Install command copied to clipboard.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setStatus('Copy unavailable. Select the command to copy it.');
    }
  }

  return (
    <div>
      <div className="flex min-w-0 items-center gap-3 rounded-[10px] border border-[var(--wjs-border-strong)] bg-[var(--wjs-surface)] px-3.5 py-2.5 shadow-[0_5px_20px_rgb(0_0_0/0.07),inset_0_1px_0_rgb(255_255_255/0.04)]">
        <span aria-hidden="true" className="select-none font-mono text-sm text-[var(--wjs-accent)]">
          $
        </span>
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-[var(--wjs-text)] sm:text-xs">
          {command}
        </code>
        <button
          type="button"
          onClick={copyCommand}
          aria-label={copied ? 'Install command copied' : 'Copy npm install command'}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-[11px] text-[var(--wjs-muted)] transition-colors hover:border-[var(--wjs-border)] hover:bg-[var(--wjs-bg-soft)] hover:text-[var(--wjs-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wjs-accent)]"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-3.5" />
          ) : (
            <Copy aria-hidden="true" className="size-3.5" />
          )}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <p aria-live="polite" className="mt-1.5 min-h-4 text-[11px] text-[var(--wjs-subtle)]">
        {status}
      </p>
    </div>
  );
}

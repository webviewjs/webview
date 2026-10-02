'use client';

import { Bot, Check, Copy, UserRound } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

const commands = {
  humans: 'npm i @webviewjs/webview',
  agents: 'npx skills add webviewjs/webview',
} as const;

type InstallMode = keyof typeof commands;

export function InstallCommand() {
  const [mode, setMode] = useState<InstallMode>('humans');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const command = commands[mode];

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
    <div className="mt-[23px] w-[min(100%,360px)]">
      <div
        className="flex min-h-[31px] items-center gap-[5px]"
        role="tablist"
        aria-label="Choose how to install WebviewJS"
      >
        <button
          type="button"
          id="hero-install-tab-humans"
          role="tab"
          aria-selected={mode === 'humans'}
          aria-controls="hero-install-command"
          className={cn(
            'inline-flex min-h-[30px] items-center gap-[6px] rounded-t-[5px] border border-transparent bg-transparent px-[9px] text-[12px] font-[550] text-[#f5f5f5]/70 transition-[color,background-color,border-color] duration-[140ms] ease-[ease] hover:text-white',
            mode === 'humans' &&
              'border-b-[#ff1744] bg-[linear-gradient(180deg,rgb(255_23_68_/_0.1),rgb(255_23_68_/_0.025))] text-white',
          )}
          onClick={() => {
            setMode('humans');
            setCopied(false);
            setMessage('');
          }}
        >
          <UserRound className="size-[14px] shrink-0" aria-hidden="true" />
          For Humans
        </button>
        <button
          type="button"
          id="hero-install-tab-agents"
          role="tab"
          aria-selected={mode === 'agents'}
          aria-controls="hero-install-command"
          className={cn(
            'inline-flex min-h-[30px] items-center gap-[6px] rounded-t-[5px] border border-transparent bg-transparent px-[9px] text-[12px] font-[550] text-[#f5f5f5]/70 transition-[color,background-color,border-color] duration-[140ms] ease-[ease] hover:text-white',
            mode === 'agents' &&
              'border-b-[#ff1744] bg-[linear-gradient(180deg,rgb(255_23_68_/_0.1),rgb(255_23_68_/_0.025))] text-white',
          )}
          onClick={() => {
            setMode('agents');
            setCopied(false);
            setMessage('');
          }}
        >
          <Bot className="size-[14px] shrink-0" aria-hidden="true" />
          For Agents
        </button>
      </div>
      <div
        className="mt-[6px] flex min-h-[46px] w-full items-center gap-3 rounded-[5px] border border-white/[0.15] bg-[rgb(4_4_5_/_0.7)] px-[13px] text-[14px] text-[#ff1744] [font-family:var(--font-mono,ui-monospace),monospace] max-[700px]:gap-2 max-[700px]:px-[10px] max-[700px]:text-[13px] max-[361px]:text-[12px]"
        id="hero-install-command"
        role="tabpanel"
        aria-labelledby={mode === 'humans' ? 'hero-install-tab-humans' : 'hero-install-tab-agents'}
      >
        <span aria-hidden="true">$</span>
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[#f0f0f0]">
          <span className="text-[#ff1744]">{command.split(' ')[0]}</span> {command.slice(command.indexOf(' ') + 1)}
        </code>
        <button
          type="button"
          aria-label={copied ? 'Install command copied' : 'Copy install command'}
          onClick={copyCommand}
          className="grid h-8 w-[30px] shrink-0 cursor-pointer place-items-center border-0 bg-transparent text-[#9d9d9d] hover:text-white"
        >
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </div>
  );
}

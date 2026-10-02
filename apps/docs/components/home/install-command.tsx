'use client';

import { Bot, Check, Copy, UserRound } from 'lucide-react';
import { useState } from 'react';

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
    <div className="hero-install-panel">
      <div className="hero-install-tabs" role="tablist" aria-label="Choose how to install WebviewJS">
        <button
          type="button"
          id="hero-install-tab-humans"
          role="tab"
          aria-selected={mode === 'humans'}
          aria-controls="hero-install-command"
          className={mode === 'humans' ? 'hero-install-tab is-active' : 'hero-install-tab'}
          onClick={() => {
            setMode('humans');
            setCopied(false);
            setMessage('');
          }}
        >
          <UserRound aria-hidden="true" />
          For Humans
        </button>
        <button
          type="button"
          id="hero-install-tab-agents"
          role="tab"
          aria-selected={mode === 'agents'}
          aria-controls="hero-install-command"
          className={mode === 'agents' ? 'hero-install-tab is-active' : 'hero-install-tab'}
          onClick={() => {
            setMode('agents');
            setCopied(false);
            setMessage('');
          }}
        >
          <Bot aria-hidden="true" />
          For Agents
        </button>
      </div>
      <div
        className="hero-install"
        id="hero-install-command"
        role="tabpanel"
        aria-labelledby={mode === 'humans' ? 'hero-install-tab-humans' : 'hero-install-tab-agents'}
      >
        <span aria-hidden="true">$</span>
        <code>
          <span>{command.split(' ')[0]}</span> {command.slice(command.indexOf(' ') + 1)}
        </code>
        <button
          type="button"
          aria-label={copied ? 'Install command copied' : 'Copy install command'}
          onClick={copyCommand}
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </div>
  );
}

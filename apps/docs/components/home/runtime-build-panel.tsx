'use client';

import { Check, Terminal } from 'lucide-react';
import { useState } from 'react';

const runtimes = [
  { id: 'node', label: 'Node.js SEA', mechanism: 'Node.js SEA' },
  { id: 'bun', label: 'Bun', mechanism: 'Bun compile' },
  { id: 'deno', label: 'Deno', mechanism: 'Deno compile · bundle + self-extract' },
] as const;

type RuntimeId = (typeof runtimes)[number]['id'];

export function RuntimeBuildPanel() {
  const [runtime, setRuntime] = useState<RuntimeId>('node');
  const selected = runtimes.find((item) => item.id === runtime)!;
  const command = runtime === 'node' ? 'webview build src/main.ts' : `webview build src/main.ts --runtime ${runtime}`;

  return (
    <div className="wjs-terminal">
      <div className="flex min-h-[56px] flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#151c20] px-4 sm:px-6">
        <span className="flex items-center gap-2.5 font-mono text-[11px] text-white/60 sm:text-xs">
          <Terminal aria-hidden="true" className="size-4 text-[#83dce8]" />
          webview CLI
        </span>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Executable runtime">
          {runtimes.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={runtime === id}
              onClick={() => setRuntime(id)}
              className="wjs-terminal-tab"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:p-9">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-white/40">Command</p>
          <div className="mt-3 flex min-w-0 items-center gap-3 overflow-x-auto rounded-[8px] border border-white/[0.1] bg-black/20 px-3.5 py-3.5 font-mono text-[11px] sm:text-[13px]">
            <span aria-hidden="true" className="text-[#83dce8]">
              $
            </span>
            <code className="whitespace-nowrap text-[#e0e8e9]">{command}</code>
          </div>

          <div className="mt-6 border-t border-white/[0.08] pt-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-white/40">Build plan</span>
              <span className="font-mono text-[10px] text-[#83dce8]">{selected.mechanism}</span>
            </div>
            <div aria-live="polite" aria-atomic="true" className="grid gap-2.5">
              {[
                'Prepare application code',
                'Embed the matching WebviewJS native addon',
                `Compile with ${selected.mechanism}`,
              ].map((step, index) => (
                <div
                  key={`${runtime}-${step}`}
                  className="flex items-start gap-3 text-[12px] text-[#bfcbce] sm:text-[13px]"
                >
                  <span className="mt-px font-mono text-[10px] text-white/35">0{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-end border-t border-white/[0.08] pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.13em] text-white/40">
            <Check aria-hidden="true" className="size-3.5 text-[#83dce8]" />
            Standalone executable
          </div>
          <p className="mt-3 max-w-[30ch] text-[17px] font-medium leading-7 tracking-[-0.025em] text-[#e8eff0] sm:text-[19px]">
            The target machine does not need a separate runtime installation.
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4 font-mono text-[10px] text-white/45">
            <span>Default output directory</span>
            <code className="text-[#b8c6c9]">./dist</code>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-white/40">
            The desktop platform still provides its webview. Runtime targets and native addon support vary.
          </p>
        </div>
      </div>
    </div>
  );
}

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
    <div className="code-editor">
      <div className="code-toolbar">
        <span className="code-file">
          <strong>JS</strong>
          main.js
        </span>
        <button type="button" onClick={copyExample} aria-label={copied ? 'Example copied' : 'Copy JavaScript example'}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="code-scroll">
        <pre aria-label="JavaScript example that creates a native window">
          <HighlightedCode source={example} />
        </pre>
      </div>
    </div>
  );
}

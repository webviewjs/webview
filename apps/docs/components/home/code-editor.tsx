'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

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

const lineClass = 'code-line';
const numberClass = 'code-number';

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
          <code>
            <span className={lineClass}>
              <span className={numberClass}>1</span>
              <span className="code-keyword">import</span>
              {' { Application } '}
              <span className="code-keyword">from</span> <span className="code-string">'@webviewjs/webview'</span>;
            </span>
            <span className={lineClass}>
              <span className={numberClass}>2</span>
            </span>
            <span className={lineClass}>
              <span className={numberClass}>3</span>
              <span className="code-keyword">const</span>
              {' app = '}
              <span className="code-keyword">new</span>
              {' Application();'}
            </span>
            <span className={lineClass}>
              <span className={numberClass}>4</span>
            </span>
            <span className={lineClass}>
              <span className={numberClass}>5</span>
              <span className="code-keyword">const</span>
              {' window = app.'}
              <span className="code-accent">createBrowserWindow</span>({'{'}
            </span>
            <span className={lineClass}>
              <span className={numberClass}>6</span>
              {'  title: '}
              <span className="code-string">'My App'</span>,
            </span>
            <span className={lineClass}>
              <span className={numberClass}>7</span>
              {'  width: '}
              <span className="code-number-value">1024</span>,
            </span>
            <span className={lineClass}>
              <span className={numberClass}>8</span>
              {'  height: '}
              <span className="code-number-value">768</span>,
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
              <span className="code-accent">createWebview</span>({'{ url: '}
              <span className="code-string">'https://example.com'</span>
              {' });'}
            </span>
            <span className={lineClass}>
              <span className={numberClass}>12</span>
            </span>
            <span className={lineClass}>
              <span className={numberClass}>13</span>
              {'app.'}
              <span className="code-accent">run</span>();
            </span>
          </code>
        </pre>
      </div>
    </div>
  );
}

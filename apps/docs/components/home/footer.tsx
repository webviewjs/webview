import Link from 'next/link';
import { PanelsTopLeft } from 'lucide-react';

const links = [
  { label: 'Documentation', href: '/getting-started/quick-start' },
  { label: 'GitHub', href: 'https://github.com/webviewjs/webview', external: true },
  { label: 'npm', href: 'https://www.npmjs.com/package/@webviewjs/webview', external: true },
  { label: 'MIT License', href: 'https://github.com/webviewjs/webview/blob/main/LICENSE', external: true },
];

export function Footer() {
  return (
    <footer className="wjs-footer">
      <div className="wjs-container flex flex-col gap-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:py-8">
        <Link href="/" className="wjs-wordmark w-fit">
          <span aria-hidden="true" className="wjs-wordmark-glyph">
            <PanelsTopLeft />
          </span>
          <span>WebviewJS</span>
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-[12px] text-[var(--wjs-muted)]">
          {links.map(({ label, href, external }) =>
            external ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-[var(--wjs-text)]"
              >
                {label}
              </a>
            ) : (
              <Link key={label} href={href} className="transition-colors hover:text-[var(--wjs-text)]">
                {label}
              </Link>
            ),
          )}
        </nav>
        <span className="font-mono text-[10px] text-[var(--wjs-subtle)]">JavaScript · Native windows</span>
      </div>
    </footer>
  );
}

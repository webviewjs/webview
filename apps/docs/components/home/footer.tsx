import Link from 'next/link';
import { WebviewLogo } from './webview-logo';

const links = [
  { label: 'Docs', href: '/getting-started/quick-start' },
  { label: 'API', href: '/api/application' },
  { label: 'Examples', href: 'https://github.com/webviewjs/webview/tree/main/apps/examples' },
  { label: 'GitHub', href: 'https://github.com/webviewjs/webview' },
  { label: 'npm', href: 'https://www.npmjs.com/package/@webviewjs/webview' },
  { label: 'MIT License', href: 'https://github.com/webviewjs/webview/blob/main/LICENSE' },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#030303]">
      <div className="mx-auto flex w-[calc(100%_-_2.5rem)] max-w-[1500px] flex-col gap-7 py-7 sm:w-[calc(100%_-_5rem)] sm:flex-row sm:items-center sm:justify-between sm:py-8 xl:w-[calc(100%_-_8rem)]">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-3 text-sm font-semibold tracking-[-0.03em] text-white"
        >
          <WebviewLogo className="size-7" />
          <span>WebviewJS</span>
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-white/45 sm:gap-x-6">
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('/') ? undefined : '_blank'}
              rel="noreferrer noopener"
              className="transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff2347]"
            >
              {label}
            </a>
          ))}
        </nav>
        <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-white/30">
          JavaScript / native windows
        </span>
      </div>
    </footer>
  );
}

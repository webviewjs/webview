import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

const links = [
  {
    index: '01',
    title: 'Quick start',
    description: 'Create your first native window.',
    href: '/getting-started/quick-start',
  },
  {
    index: '02',
    title: 'API reference',
    description: 'Explore applications, windows, and webviews.',
    href: '/api/application',
  },
  {
    index: '03',
    title: 'Guides',
    description: 'IPC, menus, contexts, and executables.',
    href: '/guides/building-executables',
  },
  {
    index: '04',
    title: 'Examples',
    description: 'Run working examples from the repository.',
    href: 'https://github.com/webviewjs/webview/tree/main/apps/examples',
    external: true,
  },
];

export function DocsLinks() {
  return (
    <section className="wjs-docs-section">
      <div className="wjs-container wjs-section">
        <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="wjs-eyebrow">Documentation</p>
            <h2 className="wjs-section-title mt-4 max-w-[12ch]">A clear next step.</h2>
          </div>
          <Link
            href="/getting-started/installation"
            className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-[var(--wjs-muted)] transition-colors hover:text-[var(--wjs-accent)]"
          >
            Installation notes <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="grid gap-x-7 sm:grid-cols-2 lg:grid-cols-4">
          {links.map(({ index, title, description, href, external }) => {
            const content = (
              <>
                <span className="flex items-center justify-between font-mono text-[10px] text-[var(--wjs-subtle)]">
                  {index}
                  {external ? (
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  ) : (
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  )}
                </span>
                <span className="mt-5 block text-[17px] font-semibold tracking-[-0.03em] text-[var(--wjs-text)]">
                  {title}
                </span>
                <span className="mt-2 block text-[13px] leading-5 text-[var(--wjs-muted)]">{description}</span>
              </>
            );

            return external ? (
              <a key={title} className="wjs-doc-link" href={href} target="_blank" rel="noreferrer">
                {content}
              </a>
            ) : (
              <Link key={title} className="wjs-doc-link" href={href}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

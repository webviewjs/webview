import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { InstallCommand } from './install-command';
import { ProductWindow } from './product-window';

export function Hero() {
  return (
    <section className="wjs-hero">
      <div className="wjs-container wjs-hero-layout">
        <div className="relative z-10">
          <p className="wjs-eyebrow mb-7 inline-flex items-center gap-3">
            <span aria-hidden="true" className="wjs-status-mark" />
            N-API · TAO · WRY
          </p>
          <h1 className="wjs-hero-title text-balance">
            Native webviews <span className="wjs-hero-title-accent block">for JavaScript.</span>
          </h1>
          <p className="wjs-hero-copy mt-7">
            Build desktop applications with the browser engine your operating system already provides.
          </p>
          <p className="mt-3 font-mono text-[13px] tracking-wide text-[var(--wjs-subtle)]">
            Node.js <span className="mx-1.5 text-[var(--wjs-accent)]">/</span> Bun{' '}
            <span className="mx-1.5 text-[var(--wjs-accent)]">/</span> Deno
            <span className="ml-3 hidden border-l border-[var(--wjs-border-strong)] pl-3 font-sans text-[var(--wjs-muted)] sm:inline-flex">
              one typed native API
            </span>
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/getting-started/quick-start" className="wjs-button-primary">
              Get started <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <a
              href="https://github.com/webviewjs/webview"
              target="_blank"
              rel="noreferrer"
              className="wjs-button-secondary"
            >
              View on GitHub <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </div>

          <div className="mt-7 max-w-[440px]">
            <InstallCommand />
          </div>
        </div>

        <ProductWindow />
      </div>
    </section>
  );
}

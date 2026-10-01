import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { RuntimeBuildPanel } from './runtime-build-panel';

export function ExecutableBuilder() {
  return (
    <section className="wjs-build-section">
      <div className="wjs-container wjs-section">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="wjs-eyebrow">From source to executable</p>
            <h2 className="wjs-section-title mt-4 max-w-[16ch]">Choose the runtime that ships your app.</h2>
          </div>
          <div className="max-w-[475px] lg:pb-1">
            <p className="wjs-copy">
              Build the same WebviewJS application into a standalone executable with the runtime backend that fits your
              project.
            </p>
            <Link
              href="/guides/building-executables"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--wjs-accent)] transition-colors hover:text-[var(--wjs-text)]"
            >
              Building executables guide <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
        <RuntimeBuildPanel />
      </div>
    </section>
  );
}

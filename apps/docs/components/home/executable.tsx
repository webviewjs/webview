import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { ClosingScene } from './scenes';

export function Executable() {
  return (
    <>
      <section className="home-section executable-section" aria-labelledby="executable-title">
        <div className="home-container">
          <div className="home-section-heading">
            <h2 className="home-section-title" id="executable-title">
              Build it into
              <br />
              an executable<span>.</span>
            </h2>
            <p>
              Use the WebviewJS CLI with Node.js SEA, Bun compile, or Deno compile. The platform still supplies its
              system webview.
            </p>
          </div>
          <div className="terminal-panel">
            <div className="terminal-titlebar">
              <span className="window-controls" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              Terminal
            </div>
            <div className="terminal-content">
              <div className="terminal-command">
                <span>$</span>
                <code>webview build src/main.ts --name my-app</code>
              </div>
              <ArrowRight className="terminal-arrow" aria-hidden="true" />
              <div className="terminal-output">
                <FileText aria-hidden="true" />
                <span>
                  <small>BUILD</small>
                  <strong>./dist/my-app</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-cta" aria-labelledby="cta-title">
        <ClosingScene />
        <div className="home-container cta-content">
          <div className="cta-copy">
            <p className="home-eyebrow">
              <span aria-hidden="true" />
              Get started
            </p>
            <h2 className="cta-title" id="cta-title">
              Build your
              <br />
              first window<span>.</span>
            </h2>
            <p>Start with a few lines of JavaScript.</p>
            <div className="cta-actions">
              <Link href="/getting-started/quick-start" className="home-button home-button-primary">
                Read the quick start <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/api/application" className="home-button home-button-outline">
                Explore the API
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

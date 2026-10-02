import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { InstallCommand } from './install-command';
import { HeroScene } from './scenes';

export function Hero() {
  return (
    <section className="home-hero">
      <HeroScene />
      <div className="home-container home-hero-content">
        <div className="hero-copy">
          <p className="home-eyebrow">
            <span aria-hidden="true" />
            NATIVE DESKTOP RUNTIME
          </p>
          <h1 className="hero-title">
            Build native
            <br />
            desktop apps<span>.</span>
          </h1>
          <p className="hero-lead">
            Use the system webview on Windows, macOS, and Linux, with APIs for windows, menus, tray icons,
            notifications, IPC, browser contexts, and custom protocols. Works with Node.js, Bun, and Deno.
          </p>
          <div className="hero-actions">
            <Link href="/getting-started/quick-start" className="home-button home-button-primary">
              Get started <ArrowRight aria-hidden="true" />
            </Link>
            <a
              href="https://github.com/webviewjs/webview"
              target="_blank"
              rel="noreferrer noopener"
              className="home-button home-button-outline"
            >
              View GitHub
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.08c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 .1.77 2.52 3.85 1.8.1-.74.4-1.25.72-1.54-2.5-.28-5.13-1.25-5.13-5.57 0-1.23.44-2.23 1.16-3.01-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.62 1.55.23 2.69.12 2.98.72.78 1.15 1.78 1.15 3.01 0 4.33-2.64 5.28-5.15 5.56.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z"
                />
              </svg>
            </a>
          </div>
          <InstallCommand />
        </div>
      </div>
    </section>
  );
}

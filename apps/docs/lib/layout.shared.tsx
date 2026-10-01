import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { PanelsTopLeft } from 'lucide-react';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="wjs-wordmark">
          <span aria-hidden="true" className="wjs-wordmark-glyph">
            <PanelsTopLeft />
          </span>
          <span>{appName}</span>
        </span>
      ),
    },
    links: [
      { text: 'Docs', url: '/getting-started/quick-start' },
      { text: 'API', url: '/api/application' },
      {
        text: 'Examples',
        url: `https://github.com/${gitConfig.user}/${gitConfig.repo}/tree/${gitConfig.branch}/apps/examples`,
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}

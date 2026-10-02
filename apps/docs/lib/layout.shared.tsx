import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { WebviewLogo } from '@/components/home/webview-logo';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="wjs-wordmark">
          <WebviewLogo className="size-7" />
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
      {
        text: 'Sponsor',
        url: 'https://buymemomo.com/twilight',
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}

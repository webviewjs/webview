import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { WebviewLogo } from '@/components/home/webview-logo';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-[10px] text-[15px] font-[650] tracking-[-0.035em] text-inherit [[data-home-layout]_&]:gap-[9px] [[data-home-layout]_&]:tracking-[-0.03em] [[data-home-layout]_&]:max-[700px]:gap-2 [[data-home-layout]_&]:max-[700px]:text-[14px]">
          <WebviewLogo className="size-7 [[data-home-layout]_&]:size-[27px] [[data-home-layout]_&]:max-[700px]:size-[25px]" />
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

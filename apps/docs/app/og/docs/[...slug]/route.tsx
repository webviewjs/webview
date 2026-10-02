import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { appName, getPageImageUrl } from '@/lib/shared';
import { createBrandOGImageResponse } from '@/components/og/brand-og-image';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  const sectionLabels: Record<string, string> = {
    'getting-started': 'Getting started',
    guides: 'Guides',
    api: 'API reference',
    platform: 'Platform notes',
  };

  return createBrandOGImageResponse({
    title: page.data.title,
    description: page.data.description,
    section: sectionLabels[page.slugs[0] ?? ''] ?? `${appName} docs`,
  });
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImageUrl(page).segments,
  }));
}

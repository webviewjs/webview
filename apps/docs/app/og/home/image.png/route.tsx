import { createBrandOGImageResponse } from '@/components/og/brand-og-image';

export const revalidate = false;

export function GET() {
  return createBrandOGImageResponse({
    title: 'Build native desktop apps.',
    description: 'Use the system webview on Windows, macOS, and Linux. Works with Node.js, Bun, and Deno.',
    section: 'Native desktop runtime',
  });
}

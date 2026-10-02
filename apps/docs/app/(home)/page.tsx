import type { Metadata } from 'next';
import { Executable } from '@/components/home/executable';
import { Hero } from '@/components/home/hero';
import { HeroFeatures } from '@/components/home/hero-features';
import { JavaScriptNative } from '@/components/home/javascript-native';
import { SystemWebview } from '@/components/home/system-webview';

const title = 'WebviewJS | Native webviews. JavaScript.';
const description =
  'Create native desktop windows from JavaScript using the webview already provided by the operating system.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    url: '/',
    siteName: 'WebviewJS',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function Page() {
  return (
    <main>
      <Hero />
      <HeroFeatures />
      <SystemWebview />
      <JavaScriptNative />
      <Executable />
    </main>
  );
}

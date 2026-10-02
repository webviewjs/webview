import type { Metadata } from 'next';
import { Executable } from '@/components/home/executable';
import { EventLoopIntegration } from '@/components/home/event-loop-integration';
import { Hero } from '@/components/home/hero';
import { HeroFeatures } from '@/components/home/hero-features';
import { JavaScriptNative } from '@/components/home/javascript-native';
import { RuntimeCompatibility } from '@/components/home/runtime-compatibility';
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
    images: [
      {
        url: '/og/home/image.png',
        width: 1200,
        height: 630,
        alt: 'WebviewJS — native desktop apps for JavaScript',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og/home/image.png'],
  },
};

export default function Page() {
  return (
    <main>
      <Hero />
      <HeroFeatures />
      <SystemWebview />
      <RuntimeCompatibility />
      <EventLoopIntegration />
      <JavaScriptNative />
      <Executable />
    </main>
  );
}

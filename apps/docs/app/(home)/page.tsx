import type { Metadata } from 'next';
import styles from '@/components/home/home-visuals.module.css';
import { CapabilityBento } from '@/components/home/capability-bento';
import { CodeShowcase } from '@/components/home/code-showcase';
import { DocsLinks } from '@/components/home/docs-links';
import { ExecutableBuilder } from '@/components/home/executable-builder';
import { Footer } from '@/components/home/footer';
import { Hero } from '@/components/home/hero';
import { NativeCapabilities } from '@/components/home/native-capabilities';
import { RuntimeBridge } from '@/components/home/runtime-bridge';

const title = 'WebviewJS | Native webviews for JavaScript';
const description =
  'Create desktop applications with JavaScript or TypeScript using Node.js, Bun, or Deno and the native webview provided by Windows, macOS, and Linux.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    url: '/',
    siteName: 'WebviewJS',
    type: 'website',
    images: [{ url: '/preview.png', alt: 'A WebviewJS native window showing a web application.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/preview.png'],
  },
};

export default function Page() {
  return (
    <div className={`${styles.homeVisuals} webview-home`}>
      <Hero />
      <RuntimeBridge />
      <CapabilityBento />
      <CodeShowcase />
      <NativeCapabilities />
      <ExecutableBuilder />
      <DocsLinks />
      <Footer />
    </div>
  );
}

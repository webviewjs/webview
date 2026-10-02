import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './global.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://webview.js.org'),
  title: {
    default: 'WebviewJS | Native webviews for JavaScript',
    template: '%s | WebviewJS',
  },
  description:
    'A typed N-API binding for creating native desktop windows with Node.js, Bun, or Deno and the webview provided by the operating system.',
  openGraph: {
    siteName: 'WebviewJS',
    type: 'website',
    locale: 'en_US',
  },
};

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
        <Analytics />
      </body>
    </html>
  );
}

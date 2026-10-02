import { baseOptions } from '@/lib/layout.shared';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      {...baseOptions()}
      data-home-layout=""
      className="min-h-screen flex-1 flex-col [--fd-layout-width:1280px] bg-[#030303] text-[#f5f5f5] [color-scheme:dark] [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-[#ff2347] [&_a:focus-visible]:outline-offset-[3px] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-[#ff2347] [&_button:focus-visible]:outline-offset-[3px] motion-reduce:[&_*]:!scroll-auto motion-reduce:[&_*::before]:!scroll-auto motion-reduce:[&_*::after]:!scroll-auto motion-reduce:[&_*]:!duration-[0.01ms] motion-reduce:[&_*::before]:!duration-[0.01ms] motion-reduce:[&_*::after]:!duration-[0.01ms]"
    >
      {children}
    </HomeLayout>
  );
}

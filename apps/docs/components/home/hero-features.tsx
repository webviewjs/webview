import { Bell, Blocks, Braces, LayoutDashboard, Menu, PanelBottom } from 'lucide-react';

const features = [
  { label: 'Menus', icon: Menu },
  { label: 'Tray icons', icon: PanelBottom },
  { label: 'Notifications', icon: Bell },
  { label: 'IPC', icon: Braces },
  { label: 'Browser contexts', icon: LayoutDashboard },
  { label: 'Custom protocols', icon: Blocks },
];

export function HeroFeatures() {
  return (
    <section
      className="relative z-[1] w-full border-b border-white/[0.09] bg-[linear-gradient(180deg,#080809,#050506)]"
      aria-label="Built-in desktop APIs"
    >
      <ul className="mx-auto my-0 flex min-h-[86px] w-[min(88%,1220px)] list-none items-center justify-evenly gap-3 py-3 max-[1024px]:grid max-[1024px]:min-h-0 max-[1024px]:grid-cols-[repeat(3,minmax(0,1fr))] max-[1024px]:gap-x-3 max-[1024px]:gap-y-[18px] max-[1024px]:py-[22px] max-[600px]:w-[calc(100%_-_40px)] max-[600px]:grid-cols-[repeat(2,minmax(0,1fr))]">
        {features.map(({ label, icon: Icon }) => (
          <li
            className="flex min-w-0 items-center justify-center gap-[9px] whitespace-nowrap text-[14px] font-[550] text-[#f5f5f5]/[0.86] max-[600px]:gap-[7px] max-[600px]:text-[13px]"
            key={label}
          >
            <Icon className="size-[17px] shrink-0 stroke-[1.8] text-[#ff536d] max-[600px]:size-4" aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

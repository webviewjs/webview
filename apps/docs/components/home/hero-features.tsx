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
    <section className="hero-feature-strip" aria-label="Built-in desktop APIs">
      <ul className="hero-feature-list">
        {features.map(({ label, icon: Icon }) => (
          <li className="hero-feature-item" key={label}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

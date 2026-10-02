import { Bell, Blocks, Braces, CircleCheck, LayoutDashboard, Menu, PanelBottom, Package, Settings } from 'lucide-react';
import { CodeEditor } from './code-editor';

const features = [
  { label: 'Menus', Icon: Menu },
  { label: 'Tray Icons', Icon: PanelBottom },
  { label: 'Notifications', Icon: Bell },
  { label: 'IPC', Icon: Braces },
  { label: 'Custom Protocols', Icon: Package },
];

const navigation = [
  { id: 'projects', Icon: Blocks },
  { id: 'activity', Icon: Bell },
  { id: 'settings', Icon: Settings },
];

export function JavaScriptNative() {
  return (
    <section className="home-section javascript-section" aria-labelledby="javascript-title">
      <div className="home-container">
        <div className="home-section-heading">
          <h2 className="home-section-title" id="javascript-title">
            JavaScript
            <br />
            controls the window<span>.</span>
          </h2>
          <p>
            Create a window, load a page, and add menus, notifications, tray icons, IPC, browser contexts, or custom
            protocols through one simple API.
          </p>
        </div>
        <div className="javascript-showcase">
          <CodeEditor />
          <div className="application-showcase">
            <div
              className="application-demo"
              role="img"
              aria-label="A native application dashboard built with WebviewJS."
            >
              <div className="application-titlebar">
                <span className="window-controls" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>My App</span>
                <span className="application-title-mark" aria-hidden="true" />
              </div>
              <div className="application-shell">
                <aside className="application-sidebar" aria-hidden="true">
                  <span className="application-brand-mark">W</span>
                  <span className="application-nav-item is-active">
                    <LayoutDashboard />
                  </span>
                  {navigation.map(({ id, Icon }) => (
                    <span className="application-nav-item" key={id}>
                      <Icon />
                    </span>
                  ))}
                </aside>
                <div className="application-main">
                  <div className="application-toolbar">
                    <div>
                      <span className="application-overline">Workspace</span>
                      <h3>Project overview</h3>
                    </div>
                    <span className="application-status">
                      <CircleCheck aria-hidden="true" />
                      All systems ready
                    </span>
                  </div>
                  <div className="application-metrics">
                    <div className="application-metric">
                      <span>Active projects</span>
                      <strong>12</strong>
                      <small>+3 this month</small>
                    </div>
                    <div className="application-metric">
                      <span>Latest build</span>
                      <strong>Passed</strong>
                      <small>2 minutes ago</small>
                    </div>
                  </div>
                  <div className="application-activity">
                    <div className="application-activity-heading">
                      <strong>Recent activity</strong>
                      <span>View all</span>
                    </div>
                    <div className="application-activity-row">
                      <i aria-hidden="true" />
                      <span>
                        <strong>Desktop client</strong>
                        <small>Updated just now</small>
                      </span>
                      <em>Running</em>
                    </div>
                    <div className="application-activity-row">
                      <i aria-hidden="true" />
                      <span>
                        <strong>Webview runtime</strong>
                        <small>Build completed</small>
                      </span>
                      <em>Ready</em>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <ul className="feature-icons" aria-label="Native features">
              {features.map(({ label, Icon }) => (
                <li key={label}>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

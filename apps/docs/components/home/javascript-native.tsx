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
    <section
      className="relative border-t border-white/[0.075] bg-[#050505] bg-[radial-gradient(ellipse_at_76%_80%,rgb(88_0_18_/_0.1),transparent_36%)] py-[clamp(88px,7.5vw,120px)] max-[1024px]:py-[76px] max-[700px]:py-[58px]"
      aria-labelledby="javascript-title"
    >
      <div className="mx-auto box-border w-full max-w-[1280px] px-[clamp(24px,4vw,48px)] max-[391px]:px-5">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-center gap-[clamp(32px,5vw,72px)] max-[1024px]:grid-cols-[minmax(0,1fr)] max-[1024px]:gap-[18px] max-[700px]:gap-[17px]">
          <h2
            className="m-0 text-[clamp(48px,4.5vw,64px)] leading-[1] font-[650] tracking-[-0.065em] text-balance text-[#f5f5f5] max-[1024px]:text-[clamp(48px,6.4vw,58px)] max-[700px]:text-[clamp(42px,11vw,54px)]"
            id="javascript-title"
          >
            JavaScript
            <br />
            controls the window<span className="text-[#ff1744]">.</span>
          </h2>
          <p className="m-0 max-w-[470px] text-[16px] leading-[1.55] text-[rgb(245_245_245_/_0.7)] max-[1024px]:max-w-[680px] max-[700px]:max-w-[520px]">
            Create a window, load a page, and add menus, notifications, tray icons, IPC, browser contexts, or custom
            protocols through one simple API.
          </p>
        </div>
        <div className="grid grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] items-center gap-[clamp(24px,3vw,44px)] mt-[48px] max-[800px]:grid-cols-[minmax(0,1fr)] max-[800px]:gap-[24px] max-[700px]:mt-[34px]">
          <CodeEditor />
          <div className="min-w-0">
            <div
              className="overflow-hidden rounded-[9px] border border-white/[0.16] bg-[#09090a] shadow-[0_17px_42px_rgb(0_0_0_/_0.5),0_0_22px_rgb(168_0_31_/_0.1)]"
              role="img"
              aria-label="A native application dashboard built with WebviewJS."
            >
              <div className="relative flex h-[40px] items-center justify-between border-b border-white/[0.1] bg-[#0c0c0d] px-[14px] text-[13px] text-[rgb(245_245_245_/_0.8)]">
                <span className="flex items-center gap-[6px]" aria-hidden="true">
                  <i className="block size-[9px] rounded-full bg-[#ff1744]" />
                  <i className="block size-[9px] rounded-full bg-[#ffd52e]" />
                  <i className="block size-[9px] rounded-full bg-[#17d35a]" />
                </span>
                <span className="absolute left-1/2 -translate-x-1/2">My App</span>
                <span className="size-[8px] rounded-full border border-white/[0.25]" aria-hidden="true" />
              </div>
              <div className="grid min-h-[286px] grid-cols-[52px_minmax(0,1fr)] max-[700px]:min-h-[278px] max-[700px]:grid-cols-[46px_minmax(0,1fr)]">
                <aside
                  className="flex flex-col items-center gap-[11px] border-r border-white/[0.08] bg-[rgb(255_255_255_/_0.018)] px-[7px] py-[14px] max-[700px]:gap-[9px] max-[700px]:px-[5px]"
                  aria-hidden="true"
                >
                  <span className="mb-[5px] grid size-[30px] place-items-center rounded-[7px] border border-[rgb(255_23_68_/_0.36)] bg-[rgb(255_23_68_/_0.1)] text-[13px] font-bold text-[#ff3858] max-[700px]:size-[28px]">
                    W
                  </span>
                  <span className="grid size-[30px] place-items-center rounded-[7px] bg-[rgb(255_23_68_/_0.12)] text-[#ff4562] max-[700px]:size-[28px]">
                    <LayoutDashboard className="size-4 stroke-[1.8]" />
                  </span>
                  {navigation.map(({ id, Icon }) => (
                    <span
                      className="grid size-[30px] place-items-center rounded-[7px] text-[rgb(245_245_245_/_0.52)] max-[700px]:size-[28px]"
                      key={id}
                    >
                      <Icon className="size-4 stroke-[1.8]" />
                    </span>
                  ))}
                </aside>
                <div className="min-w-0 px-[18px] pt-[17px] pb-[16px] max-[700px]:px-[12px] max-[700px]:py-[14px]">
                  <div className="flex items-center justify-between gap-[12px] min-[700px]:max-[800px]:gap-[20px] max-[700px]:flex-wrap">
                    <div>
                      <span className="text-[12px] tracking-[0.06em] text-[rgb(245_245_245_/_0.58)] uppercase">
                        Workspace
                      </span>
                      <h3 className="mt-[5px] text-[18px] font-semibold tracking-[-0.035em] text-[#f5f5f5] max-[700px]:text-[16px]">
                        Project overview
                      </h3>
                    </div>
                    <span className="inline-flex flex-none items-center gap-[6px] text-[12px] text-[rgb(245_245_245_/_0.72)]">
                      <CircleCheck className="size-[15px] text-[#43d69a]" aria-hidden="true" />
                      All systems ready
                    </span>
                  </div>
                  <div className="mt-[15px] grid grid-cols-2 gap-[10px] max-[700px]:gap-[8px]">
                    <div className="grid min-h-[89px] content-center gap-[5px] rounded-[7px] border border-white/[0.1] bg-[rgb(255_255_255_/_0.025)] px-[13px] py-[11px] max-[700px]:px-[9px]">
                      <span className="text-[12px] text-[rgb(245_245_245_/_0.62)]">Active projects</span>
                      <strong className="text-[21px] leading-[1.1] font-semibold text-[#f5f5f5]">12</strong>
                      <small className="text-[12px] text-[#ff8295]">+3 this month</small>
                    </div>
                    <div className="grid min-h-[89px] content-center gap-[5px] rounded-[7px] border border-white/[0.1] bg-[rgb(255_255_255_/_0.025)] px-[13px] py-[11px] max-[700px]:px-[9px]">
                      <span className="text-[12px] text-[rgb(245_245_245_/_0.62)]">Latest build</span>
                      <strong className="text-[21px] leading-[1.1] font-semibold text-[#f5f5f5]">Passed</strong>
                      <small className="text-[12px] text-[rgb(245_245_245_/_0.62)]">2 minutes ago</small>
                    </div>
                  </div>
                  <div className="mt-[15px] border-t border-white/[0.09] pt-[12px]">
                    <div className="mb-[5px] flex items-center justify-between gap-[12px] text-[13px] text-[rgb(245_245_245_/_0.88)]">
                      <strong>Recent activity</strong>
                      <span className="text-[12px] text-[#ff8193]">View all</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-[9px] border-t border-white/[0.055] py-[7px]">
                      <i
                        className="size-[7px] flex-none rounded-full bg-[#ff3758] shadow-[0_0_9px_rgb(255_23_68_/_0.5)]"
                        aria-hidden="true"
                      />
                      <span className="grid min-w-0 gap-[2px]">
                        <strong className="truncate text-[12px] font-[550] text-[rgb(245_245_245_/_0.88)]">
                          Desktop client
                        </strong>
                        <small className="text-[12px] text-[rgb(245_245_245_/_0.62)]">Updated just now</small>
                      </span>
                      <em className="ml-auto text-[12px] text-[#53d69c] not-italic">Running</em>
                    </div>
                    <div className="flex min-w-0 items-center gap-[9px] border-t border-white/[0.055] py-[7px]">
                      <i
                        className="size-[7px] flex-none rounded-full bg-[#ff3758] shadow-[0_0_9px_rgb(255_23_68_/_0.5)]"
                        aria-hidden="true"
                      />
                      <span className="grid min-w-0 gap-[2px]">
                        <strong className="truncate text-[12px] font-[550] text-[rgb(245_245_245_/_0.88)]">
                          Webview runtime
                        </strong>
                        <small className="text-[12px] text-[rgb(245_245_245_/_0.62)]">Build completed</small>
                      </span>
                      <em className="ml-auto text-[12px] text-[#53d69c] not-italic">Ready</em>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <ul
              className="mt-[21px] mb-0 flex list-none items-start justify-between gap-[10px] p-0 max-[1024px]:gap-[5px] max-[700px]:gap-[4px] max-[391px]:gap-[2px]"
              aria-label="Native features"
            >
              {features.map(({ label, Icon }) => (
                <li
                  className="flex min-w-0 flex-col items-center gap-[7px] text-center text-[rgb(245_245_245_/_0.63)] max-[700px]:gap-[6px]"
                  key={label}
                >
                  <Icon
                    className="size-[18px] text-[#e2e2e2] stroke-[1.5] max-[700px]:size-[17px]"
                    aria-hidden="true"
                  />
                  <span className="text-[12px] leading-[1.25] text-[rgb(245_245_245_/_0.78)]">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

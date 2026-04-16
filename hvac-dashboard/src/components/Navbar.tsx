import { Dropdown } from 'primereact/dropdown'
import { Avatar } from 'primereact/avatar'
import { Button } from 'primereact/button'
import logo from '../assets/logo.svg'

interface Props {
  site: string
  sites: string[]
  onSiteChange: (s: string) => void
  connected: boolean
}

export function Navbar({ site, sites, onSiteChange, connected }: Props) {
  const options = sites.map((s) => ({ label: s, value: s }))

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-[1600px] mx-auto px-8 h-16 flex items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="w-8 h-8 bg-sky-600"
            style={{
              maskImage: `url(${logo})`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskImage: `url(${logo})`,
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
            }}
          />
          <div className="flex flex-col leading-none">
            <span className="text-slate-900 font-semibold text-[15px] tracking-tight">
              CoolWatch
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              HVAC Fleet Monitor
            </span>
          </div>
        </div>

        {/* Nav tabs (placeholder for future expansion) */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <NavTab active icon="pi-th-large" label="Overview" />
          <NavTab icon="pi-server" label="Devices" />
          <NavTab icon="pi-chart-line" label="Analytics" />
          <NavTab icon="pi-bell" label="Alerts" />
        </nav>

        {/* Right — site selector, connection, user */}
        <div className="flex items-center gap-3 shrink-0">
          <Dropdown
            value={site}
            options={options}
            onChange={(e) => onSiteChange(e.value)}
            className="!min-w-[160px]"
          />
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-emerald-50 border border-emerald-200">
            <span
              className={`w-1.5 h-1.5 rounded-full pulse-dot ${
                connected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] text-emerald-700 font-semibold tracking-wide">
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          <Button
            icon="pi pi-bell"
            rounded
            text
            severity="secondary"
            aria-label="Notifications"
          />
          <Avatar
            label="JF"
            shape="circle"
            className="!bg-slate-900 !text-white !text-sm !font-semibold"
          />
        </div>
      </div>
    </header>
  )
}

function NavTab({
  icon,
  label,
  active,
}: {
  icon: string
  label: string
  active?: boolean
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-slate-100 text-slate-900'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      <i className={`pi ${icon} text-xs`} />
      {label}
    </button>
  )
}

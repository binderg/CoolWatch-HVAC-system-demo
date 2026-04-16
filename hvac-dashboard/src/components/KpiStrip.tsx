import type { AlertItem, Device } from '../types'

interface Props {
  devices: Device[]
  alerts: AlertItem[]
}

interface KpiProps {
  icon: string
  iconColor: string
  iconBg: string
  label: string
  value: React.ReactNode
  delta?: { value: string; positive?: boolean; neutral?: boolean }
  footer?: React.ReactNode
}

function Kpi({ icon, iconColor, iconBg, label, value, delta, footer }: KpiProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-4 min-h-[140px]">
      <div className="flex items-start justify-between">
        <div
          className={`w-9 h-9 rounded-md ${iconBg} flex items-center justify-center`}
        >
          <i className={`${icon} ${iconColor} text-sm`} />
        </div>
        {delta && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
              delta.neutral
                ? 'text-slate-500'
                : delta.positive
                  ? 'text-emerald-600'
                  : 'text-rose-600'
            }`}
          >
            <i
              className={`pi ${
                delta.neutral
                  ? 'pi-minus'
                  : delta.positive
                    ? 'pi-arrow-up-right'
                    : 'pi-arrow-down-right'
              } text-[9px]`}
            />
            {delta.value}
          </span>
        )}
      </div>
      <div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </div>
        <div className="mt-1 text-[28px] leading-none font-semibold text-slate-900 tabular-nums tracking-tight">
          {value}
        </div>
      </div>
      {footer && <div className="text-xs text-slate-500">{footer}</div>}
    </div>
  )
}

export function KpiStrip({ devices, alerts }: Props) {
  const total = devices.length
  const online = devices.filter((d) => d.status !== 'offline').length
  const offline = total - online
  const critical = alerts.filter((a) => a.severity === 'critical').length
  const warnings = devices.filter((d) => d.status === 'warning').length

  const avgTemp =
    devices.reduce((s, d) => s + d.temp, 0) / Math.max(devices.length, 1)

  const healthyCount = devices.filter((d) => d.status === 'online').length
  const healthScore = Math.round((healthyCount / Math.max(total, 1)) * 100)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Kpi
        icon="pi pi-server"
        iconColor="text-blue-600"
        iconBg="bg-blue-50"
        label="Devices Online"
        value={
          <>
            {online}
            <span className="text-slate-400 text-xl font-medium">
              {' '}
              / {total}
            </span>
          </>
        }
        delta={{
          value: `${offline} offline`,
          neutral: offline === 0,
          positive: false,
        }}
        footer={
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${(online / Math.max(total, 1)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 tabular-nums">
              {Math.round((online / Math.max(total, 1)) * 100)}%
            </span>
          </div>
        }
      />

      <Kpi
        icon="pi pi-exclamation-triangle"
        iconColor="text-rose-600"
        iconBg="bg-rose-50"
        label="Active Alerts"
        value={critical + warnings}
        footer={
          <div className="flex items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 font-medium">
                {critical} Critical
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-slate-600 font-medium">
                {warnings} Warning
              </span>
            </span>
          </div>
        }
      />

      <Kpi
        icon="pi pi-chart-line"
        iconColor="text-indigo-600"
        iconBg="bg-indigo-50"
        label="Avg Temperature"
        value={
          <>
            {avgTemp.toFixed(1)}
            <span className="text-slate-400 text-xl font-medium">°F</span>
          </>
        }
        footer={
          <span className="text-slate-500">
            Target range{' '}
            <span className="text-slate-700 font-medium">68–76°F</span>
          </span>
        }
      />

      <Kpi
        icon="pi pi-heart"
        iconColor="text-emerald-600"
        iconBg="bg-emerald-50"
        label="System Health"
        value={`${healthScore}%`}
        footer={
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full ${
                  healthScore >= 90
                    ? 'bg-emerald-500'
                    : healthScore >= 70
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 tabular-nums">
              {healthScore >= 90
                ? 'Healthy'
                : healthScore >= 70
                  ? 'Degraded'
                  : 'At risk'}
            </span>
          </div>
        }
      />
    </div>
  )
}

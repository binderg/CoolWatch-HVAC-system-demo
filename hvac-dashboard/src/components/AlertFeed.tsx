import { Button } from 'primereact/button'
import type { AlertItem } from '../types'

interface Props {
  alerts: AlertItem[]
  onDismiss: (id: string) => void
  onSelectDevice: (deviceId: string) => void
}

const sevMeta = {
  critical: {
    icon: 'pi-exclamation-circle',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    label: 'Critical',
    dot: 'bg-rose-500',
  },
  warning: {
    icon: 'pi-exclamation-triangle',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Warning',
    dot: 'bg-amber-500',
  },
  info: {
    icon: 'pi-info-circle',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Info',
    dot: 'bg-blue-500',
  },
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AlertFeed({ alerts, onDismiss, onSelectDevice }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full max-h-[calc(100vh-8rem)] self-start">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 whitespace-nowrap">
            Alert Feed
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
            {alerts.length} active · real-time
          </p>
        </div>
        {alerts.length > 0 && (
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200">
            {alerts.length}
          </span>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3 space-y-2">
          {alerts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
                <i className="pi pi-check text-emerald-600 text-sm" />
              </div>
              <div className="text-sm font-medium text-slate-700">
                All systems nominal
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                No active alerts
              </div>
            </div>
          )}

          {alerts.map((a) => {
            const meta = sevMeta[a.severity]
            return (
              <div
                key={a.id}
                className={`alert-item group flex items-start gap-3 p-3 rounded-md border ${meta.border} ${meta.bg} hover:shadow-sm transition-all`}
              >
                <div className="shrink-0 mt-0.5">
                  <i className={`pi ${meta.icon} ${meta.color} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}
                    >
                      <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {timeAgo(a.time)}
                    </span>
                  </div>
                  <div className="text-[13px] text-slate-800 leading-snug">
                    {a.message}
                  </div>
                  <button
                    onClick={() => onSelectDevice(a.deviceId)}
                    className="mt-1.5 text-[11px] text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-medium"
                  >
                    View device
                    <i className="pi pi-arrow-right text-[9px]" />
                  </button>
                </div>
                <Button
                  icon="pi pi-times"
                  text
                  rounded
                  size="small"
                  severity="secondary"
                  onClick={() => onDismiss(a.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Dismiss"
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { Sidebar } from 'primereact/sidebar'
import { Knob } from 'primereact/knob'
import { ProgressBar } from 'primereact/progressbar'
import { Tag } from 'primereact/tag'
import { Timeline } from 'primereact/timeline'
import { Button } from 'primereact/button'
import type { Device, DeviceStatus, MaintenanceEvent } from '../types'

interface Props {
  device: Device | null
  visible: boolean
  onHide: () => void
  onAcknowledge: (d: Device) => void
}

const statusMeta: Record<
  DeviceStatus,
  { label: string; severity: 'success' | 'danger' | 'warning' | 'secondary' }
> = {
  online: { label: 'Online', severity: 'success' },
  offline: { label: 'Offline', severity: 'secondary' },
  alert: { label: 'Critical', severity: 'danger' },
  warning: { label: 'Warning', severity: 'warning' },
}

export function DeviceDetail({
  device,
  visible,
  onHide,
  onAcknowledge,
}: Props) {
  return (
    <Sidebar
      visible={visible && !!device}
      onHide={onHide}
      position="right"
      style={{ width: '460px', maxWidth: '100vw' }}
      showCloseIcon={false}
      header={
        device && (
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center shrink-0">
                <i className="pi pi-server text-white text-sm" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-slate-900 leading-tight">
                  {device.id}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {device.location}
                </div>
              </div>
            </div>
            <Button
              icon="pi pi-times"
              text
              rounded
              severity="secondary"
              onClick={onHide}
              aria-label="Close"
            />
          </div>
        )
      }
    >
      {device && (
        <div className="space-y-5">
          {/* Status banner */}
          <div className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Status
              </span>
              <Tag severity={statusMeta[device.status].severity}>
                {statusMeta[device.status].label}
              </Tag>
            </div>
            <div className="text-[11px] text-slate-500">
              Installed{' '}
              <span className="text-slate-700 font-medium">
                {device.installDate}
              </span>
            </div>
          </div>

          {/* Gauges */}
          <div>
            <SectionLabel>Live Sensors</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <GaugeTile
                label="Temperature"
                unit="°F"
                value={device.temp}
                min={50}
                max={100}
                color={
                  device.temp > 80
                    ? '#dc2626'
                    : device.temp > 75
                      ? '#d97706'
                      : '#2563eb'
                }
              />
              <GaugeTile
                label="Humidity"
                unit="%"
                value={device.humidity}
                min={0}
                max={100}
                color={
                  device.humidity > 65
                    ? '#dc2626'
                    : device.humidity > 60
                      ? '#d97706'
                      : '#6366f1'
                }
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <MetricTile
              icon="pi-wave-pulse"
              label="Airflow"
              value={`${device.airflow.toFixed(0)}`}
              unit="CFM"
            />
            <MetricTile
              icon="pi-gauge"
              label="Pressure"
              value={device.pressure.toFixed(2)}
              unit="kPa"
            />
          </div>

          {/* Power draw */}
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <i className="pi pi-bolt text-amber-500 text-xs" />
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Power Draw
                </span>
              </div>
              <div className="text-[13px] tabular-nums">
                <span className="font-semibold text-slate-900">
                  {device.powerDraw.toFixed(1)}
                </span>
                <span className="text-slate-400">
                  {' '}
                  / {device.maxPower} kW
                </span>
              </div>
            </div>
            <ProgressBar
              value={Math.round((device.powerDraw / device.maxPower) * 100)}
              showValue={false}
              color={
                device.powerDraw / device.maxPower > 0.8
                  ? '#dc2626'
                  : '#2563eb'
              }
            />
          </div>

          {/* Maintenance */}
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <i className="pi pi-wrench text-slate-500 text-xs" />
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Maintenance Log
              </span>
            </div>
            <Timeline
              value={device.maintenance}
              content={(item: MaintenanceEvent) => (
                <div>
                  <div className="text-[13px] text-slate-800">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-500">{item.date}</div>
                </div>
              )}
              marker={() => (
                <span className="block w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-50" />
              )}
            />
          </div>

          {/* Acknowledge */}
          {device.status === 'alert' && (
            <Button
              label="Acknowledge Alert"
              icon="pi pi-check"
              severity="danger"
              className="w-full"
              onClick={() => onAcknowledge(device)}
            />
          )}
        </div>
      )}
    </Sidebar>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
      {children}
    </div>
  )
}

function GaugeTile({
  label,
  unit,
  value,
  min,
  max,
  color,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  color: string
}) {
  return (
    <div className="p-4 rounded-md bg-slate-50 border border-slate-200 flex flex-col items-center">
      <Knob
        value={Math.round(value)}
        min={min}
        max={max}
        readOnly
        size={96}
        strokeWidth={8}
        valueColor={color}
        rangeColor="#e5e7eb"
        textColor="#111827"
      />
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-2">
        {label}
      </span>
      <span className="text-[11px] text-slate-400 tabular-nums">
        {value.toFixed(1)}
        {unit}
      </span>
    </div>
  )
}

function MetricTile({
  icon,
  label,
  value,
  unit,
}: {
  icon: string
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="p-4 rounded-md bg-slate-50 border border-slate-200">
      <div className="flex items-center gap-1.5 mb-1.5">
        <i className={`pi ${icon} text-slate-400 text-xs`} />
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-lg font-semibold text-slate-900 tabular-nums leading-none">
        {value}
        <span className="text-xs text-slate-400 font-medium ml-1">{unit}</span>
      </div>
    </div>
  )
}

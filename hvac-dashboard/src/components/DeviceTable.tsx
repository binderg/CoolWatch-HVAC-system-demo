import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Tag } from 'primereact/tag'
import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { Dropdown } from 'primereact/dropdown'
import { useState, useMemo } from 'react'
import type { Device, DeviceStatus } from '../types'
import { formatLastSeen } from '../data/simulator'

interface Props {
  devices: Device[]
  selected: Device | null
  onSelect: (d: Device) => void
}

const statusMeta: Record<
  DeviceStatus,
  {
    label: string
    severity: 'success' | 'danger' | 'warning' | 'secondary'
    icon: string
  }
> = {
  online: { label: 'Online', severity: 'success', icon: 'pi-circle-fill' },
  offline: { label: 'Offline', severity: 'secondary', icon: 'pi-circle-fill' },
  alert: { label: 'Critical', severity: 'danger', icon: 'pi-circle-fill' },
  warning: { label: 'Warning', severity: 'warning', icon: 'pi-circle-fill' },
}

function parseFloor(location: string): string | null {
  const m = location.match(/Floor\s+(\d+)/i)
  return m ? `Floor ${m[1]}` : null
}

function parseZone(location: string): string | null {
  const m = location.match(/Zone\s+([A-Z0-9]+)/i)
  return m ? `Zone ${m[1]}` : null
}

export function DeviceTable({ devices, selected, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [buildingFilter, setBuildingFilter] = useState<string | null>(null)
  const [floorFilter, setFloorFilter] = useState<string | null>(null)
  const [zoneFilter, setZoneFilter] = useState<string | null>(null)

  const buildingOptions = useMemo(
    () => [...new Set(devices.map((d) => d.site))].sort(),
    [devices],
  )

  const floorOptions = useMemo(
    () =>
      [...new Set(devices.map((d) => parseFloor(d.location)).filter(Boolean) as string[])].sort(
        (a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10),
      ),
    [devices],
  )

  const zoneOptions = useMemo(
    () =>
      [...new Set(devices.map((d) => parseZone(d.location)).filter(Boolean) as string[])].sort(),
    [devices],
  )

  const filtered = devices.filter((d) => {
    if (buildingFilter && d.site !== buildingFilter) return false
    if (floorFilter && parseFloor(d.location) !== floorFilter) return false
    if (zoneFilter && parseZone(d.location) !== zoneFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !d.id.toLowerCase().includes(q) &&
        !d.location.toLowerCase().includes(q) &&
        !d.site.toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

  const rowClass = (d: Device) => {
    if (d.status === 'alert') return 'row-alert'
    if (d.status === 'warning') return 'row-warning'
    return ''
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 whitespace-nowrap">
              Device Fleet
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
              {filtered.length} of {devices.length} units shown
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative">
              <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
              <InputText
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search units…"
                className="!pl-8 !w-56"
              />
            </span>
            <Button
              icon="pi pi-download"
              text
              severity="secondary"
              tooltip="Export"
              aria-label="Export"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <i className="pi pi-filter text-slate-400 text-xs" />
          <Dropdown
            value={buildingFilter}
            options={buildingOptions}
            onChange={(e) => setBuildingFilter(e.value ?? null)}
            placeholder="Building"
            showClear
          />
          <Dropdown
            value={floorFilter}
            options={floorOptions}
            onChange={(e) => setFloorFilter(e.value ?? null)}
            placeholder="Floor"
            showClear
          />
          <Dropdown
            value={zoneFilter}
            options={zoneOptions}
            onChange={(e) => setZoneFilter(e.value ?? null)}
            placeholder="Zone"
            showClear
          />
        </div>
      </div>

      <DataTable
        value={filtered}
        selectionMode="single"
        selection={selected ?? undefined}
        onSelectionChange={(e) => e.value && onSelect(e.value as Device)}
        dataKey="id"
        paginator
        rows={8}
        rowClassName={rowClass}
        sortField="id"
        sortOrder={1}
        emptyMessage="No devices found"
      >
        <Column
          field="id"
          header="Unit"
          sortable
          body={(d: Device) => (
            <span className="font-semibold text-slate-900 tabular-nums">
              {d.id}
            </span>
          )}
          style={{ width: '110px' }}
        />
        <Column
          field="location"
          header="Location"
          sortable
          body={(d: Device) => (
            <span className="text-slate-700">{d.location}</span>
          )}
        />
        <Column
          field="status"
          header="Status"
          sortable
          body={(d: Device) => {
            const m = statusMeta[d.status]
            return (
              <Tag severity={m.severity}>
                <span className="inline-flex items-center gap-1.5">
                  <i className={`pi ${m.icon} text-[7px]`} />
                  {m.label}
                </span>
              </Tag>
            )
          }}
          style={{ width: '120px' }}
        />
        <Column
          field="temp"
          header="Temp"
          sortable
          body={(d: Device) => {
            const color =
              d.temp > 80
                ? 'text-rose-600'
                : d.temp > 75
                  ? 'text-amber-600'
                  : 'text-slate-700'
            return (
              <span className={`tabular-nums font-medium ${color}`}>
                {d.temp.toFixed(1)}°F
              </span>
            )
          }}
          style={{ width: '90px' }}
        />
        <Column
          field="humidity"
          header="Humidity"
          sortable
          body={(d: Device) => (
            <span className="tabular-nums text-slate-700">
              {d.humidity.toFixed(0)}%
            </span>
          )}
          style={{ width: '100px' }}
        />
        <Column
          field="powerDraw"
          header="Power"
          sortable
          body={(d: Device) => (
            <span className="tabular-nums text-slate-700">
              {d.powerDraw.toFixed(1)} kW
            </span>
          )}
          style={{ width: '100px' }}
        />
        <Column
          field="lastSeen"
          header="Last Seen"
          sortable
          body={(d: Device) => (
            <span className="text-xs text-slate-500 inline-flex items-center gap-1.5 whitespace-nowrap">
              <i className="pi pi-clock text-[10px]" />
              {formatLastSeen(d.lastSeen)}
            </span>
          )}
          style={{ width: '120px' }}
        />
        <Column
          header=""
          body={(d: Device) => (
            <Button
              icon="pi pi-arrow-right"
              text
              rounded
              severity="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(d)
              }}
              aria-label={`View ${d.id}`}
            />
          )}
          style={{ width: '56px', textAlign: 'right' }}
        />
      </DataTable>
    </div>
  )
}

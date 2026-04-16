import { useEffect, useMemo, useRef, useState } from 'react'
import { Navbar } from './components/Navbar'
import { KpiStrip } from './components/KpiStrip'
import { LiveCharts } from './components/LiveCharts'
import { DeviceTable } from './components/DeviceTable'
import { AlertFeed } from './components/AlertFeed'
import { DeviceDetail } from './components/DeviceDetail'
import { buildAlert, seedDevices, tickDevice } from './data/simulator'
import type { AlertItem, Device } from './types'

const SITES = ['All Sites', 'Building A', 'Building B', 'Building C']

function App() {
  const [devices, setDevices] = useState<Device[]>(() => seedDevices(14))
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>('HVAC-04')
  const [detailOpen, setDetailOpen] = useState(false)
  const [site, setSite] = useState('All Sites')
  const previousStatuses = useRef<Record<string, string>>({})

  // Telemetry tick every 3s
  useEffect(() => {
    const t = setInterval(() => {
      setDevices((current) => {
        const next = current.map(tickDevice)
        const newAlerts: AlertItem[] = []
        next.forEach((d) => {
          const prev = previousStatuses.current[d.id]
          if (d.status === 'alert' && prev !== 'alert') {
            const a = buildAlert(d)
            if (a) newAlerts.push(a)
          }
          previousStatuses.current[d.id] = d.status
        })
        if (newAlerts.length) {
          setAlerts((prev) => [...newAlerts, ...prev].slice(0, 50))
        }
        return next
      })
    }, 3000)
    return () => clearInterval(t)
  }, [])

  // Seed initial alerts from any alert-state devices
  useEffect(() => {
    const initial = devices
      .filter((d) => d.status === 'alert')
      .map((d) => buildAlert(d))
      .filter((a): a is AlertItem => a !== null)
    if (initial.length) setAlerts(initial)
    devices.forEach((d) => {
      previousStatuses.current[d.id] = d.status
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(
    () =>
      site === 'All Sites'
        ? devices
        : devices.filter((d) => d.site === site),
    [devices, site],
  )

  const selected = devices.find((d) => d.id === selectedId) ?? null

  const handleSelect = (d: Device) => {
    setSelectedId(d.id)
    setDetailOpen(true)
  }

  const handleDismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const handleSelectByDeviceId = (deviceId: string) => {
    const d = devices.find((dev) => dev.id === deviceId)
    if (d) handleSelect(d)
  }

  const handleAcknowledge = (d: Device) => {
    setDevices((prev) =>
      prev.map((x) =>
        x.id === d.id ? { ...x, status: 'online' as const } : x,
      ),
    )
    setAlerts((prev) => prev.filter((a) => a.deviceId !== d.id))
    previousStatuses.current[d.id] = 'online'
  }

  const lastUpdated = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar site={site} sites={SITES} onSiteChange={setSite} connected />

      <main className="max-w-[1600px] mx-auto px-8 py-8 space-y-6">
        {/* Page heading */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1.5">
              <span>Dashboard</span>
              <i className="pi pi-angle-right text-[9px]" />
              <span className="text-slate-700">Fleet Overview</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Fleet Overview
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time telemetry across {filtered.length} HVAC units ·{' '}
              {site === 'All Sites' ? 'all buildings' : site}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <i className="pi pi-clock text-[11px]" />
            <span>Last update {lastUpdated}</span>
          </div>
        </div>

        {/* KPIs */}
        <KpiStrip devices={filtered} alerts={alerts} />

        {/* Charts */}
        <LiveCharts device={selected} />

        {/* Table + Alert Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">
          <DeviceTable
            devices={filtered}
            selected={selected}
            onSelect={handleSelect}
          />
          <AlertFeed
            alerts={alerts}
            onDismiss={handleDismiss}
            onSelectDevice={handleSelectByDeviceId}
          />
        </div>

        <footer className="pt-8 pb-4 text-center text-[11px] text-slate-400">
          CoolWatch · HVAC Fleet Monitor
        </footer>
      </main>

      <DeviceDetail
        device={selected}
        visible={detailOpen}
        onHide={() => setDetailOpen(false)}
        onAcknowledge={handleAcknowledge}
      />
    </div>
  )
}

export default App

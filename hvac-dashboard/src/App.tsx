import { useEffect, useMemo, useState } from 'react'
import { Navbar } from './components/Navbar'
import { KpiStrip } from './components/KpiStrip'
import { LiveCharts } from './components/LiveCharts'
import { DeviceTable } from './components/DeviceTable'
import { AlertFeed } from './components/AlertFeed'
import { DeviceDetail } from './components/DeviceDetail'
import { api, connectSocket, type TelemetryUpdate } from './lib/api'
import type { AlertItem, Device } from './types'

function App() {
  const [devices, setDevices] = useState<Device[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [sites, setSites] = useState<string[]>(['All Sites'])
  const [connected, setConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>('HVAC-04')
  const [detailOpen, setDetailOpen] = useState(false)
  const [site, setSite] = useState('All Sites')

  // Initial data load + WebSocket subscription
  useEffect(() => {
    let cancelled = false

    // Load snapshots via REST
    Promise.all([api.getDevices(), api.getAlerts(), api.getSites()])
      .then(([initialDevices, initialAlerts, initialSites]) => {
        if (cancelled) return
        setDevices(initialDevices)
        setAlerts(initialAlerts)
        setSites(['All Sites', ...initialSites])
      })
      .catch((err) => console.error('Initial load failed:', err))
      .finally(() => { if (!cancelled) setIsLoading(false) })

    // Subscribe to live updates
    const socket = connectSocket()
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('telemetry.updated', (u: TelemetryUpdate) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === u.id
            ? {
                ...d,
                status: u.status,
                temp: u.temp,
                humidity: u.humidity,
                airflow: u.airflow,
                pressure: u.pressure,
                powerDraw: u.powerDraw,
                lastSeen: u.lastSeen,
                history: [...d.history.slice(-29), u.latestPoint],
              }
            : d,
        ),
      )
    })

    socket.on('alert.created', (a: AlertItem) => {
      setAlerts((prev) => [a, ...prev].slice(0, 50))
    })

    socket.on('alert.acknowledged', ({ id }: { id: string }) => {
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    })

    return () => {
      cancelled = true
      socket.disconnect()
    }
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
    // Optimistic removal; server will also broadcast alert.acknowledged
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    api.acknowledgeAlert(id).catch((err) => {
      console.error('Acknowledge failed:', err)
    })
  }

  const handleSelectByDeviceId = (deviceId: string) => {
    const d = devices.find((dev) => dev.id === deviceId)
    if (d) handleSelect(d)
  }

  const handleAcknowledge = (d: Device) => {
    // Dismiss all alerts for this device
    const toAck = alerts.filter((a) => a.deviceId === d.id)
    setAlerts((prev) => prev.filter((a) => a.deviceId !== d.id))
    toAck.forEach((a) => {
      api.acknowledgeAlert(a.id).catch((err) => {
        console.error('Acknowledge failed:', err)
      })
    })
  }

  const lastUpdated = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-5">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-sky-600 animate-spin" />
          <div className="text-center">
            <p className="text-slate-800 font-semibold text-base tracking-tight">
              Connecting to server…
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Loading fleet data, please wait
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar
        site={site}
        sites={sites}
        onSiteChange={setSite}
        connected={connected}
      />

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

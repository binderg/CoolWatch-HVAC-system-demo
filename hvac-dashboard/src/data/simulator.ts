import type { AlertItem, Device, TelemetryPoint } from '../types'

const SITES = ['Building A', 'Building B', 'Building C']
const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D']
const FLOORS = [1, 2, 3, 4, 5]

const rand = (min: number, max: number) => Math.random() * (max - min) + min
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

function makeInitialHistory(
  baseTemp: number,
  baseHum: number,
): TelemetryPoint[] {
  const now = Date.now()
  const pts: TelemetryPoint[] = []
  for (let i = 29; i >= 0; i--) {
    pts.push({
      time: now - i * 5000,
      temp: baseTemp + rand(-1.5, 1.5),
      humidity: baseHum + rand(-3, 3),
      airflow: rand(380, 520),
      pressure: rand(1.0, 1.4),
    })
  }
  return pts
}

export function seedDevices(count = 14): Device[] {
  const devices: Device[] = []
  for (let i = 1; i <= count; i++) {
    const site = SITES[i % SITES.length]
    const floor = FLOORS[i % FLOORS.length]
    const zone = ZONES[i % ZONES.length]
    const baseTemp = rand(69, 75)
    const baseHum = rand(42, 58)
    const history = makeInitialHistory(baseTemp, baseHum)
    const last = history[history.length - 1]

    devices.push({
      id: `HVAC-${String(i).padStart(2, '0')}`,
      site,
      location: `${site} • Floor ${floor} / ${zone}`,
      status: i === 4 ? 'alert' : i === 9 ? 'offline' : 'online',
      temp: last.temp,
      humidity: last.humidity,
      airflow: last.airflow,
      pressure: last.pressure,
      powerDraw: rand(2.1, 4.4),
      maxPower: 5,
      installDate: `20${22 + (i % 3)}-0${(i % 9) + 1}-15`,
      lastSeen: Date.now(),
      history,
      maintenance: [
        { date: 'Jan 2026', label: 'Filter replaced' },
        { date: 'Nov 2025', label: 'Coil cleaning' },
        { date: 'Aug 2025', label: 'Firmware v2.3 update' },
      ],
    })
  }
  return devices
}

export function tickDevice(d: Device): Device {
  if (d.status === 'offline') return d

  // random walk
  const newTemp = clamp(d.temp + rand(-0.4, 0.4), 60, 95)
  const newHum = clamp(d.humidity + rand(-1.2, 1.2), 25, 80)
  const newAir = clamp(d.airflow + rand(-15, 15), 300, 600)
  const newPress = clamp(d.pressure + rand(-0.05, 0.05), 0.6, 1.8)
  const newPower = clamp(d.powerDraw + rand(-0.1, 0.1), 0.5, 4.9)

  // occasional temp spike
  const spikeTemp =
    Math.random() < 0.008 ? newTemp + rand(8, 14) : newTemp
  const spikeHum =
    Math.random() < 0.005 ? newHum + rand(10, 18) : newHum

  let status: Device['status'] = 'online'
  if (spikeTemp > 82 || spikeHum > 65 || newPress < 0.7) status = 'alert'
  else if (spikeTemp > 77 || spikeHum > 62) status = 'warning'

  const point: TelemetryPoint = {
    time: Date.now(),
    temp: spikeTemp,
    humidity: spikeHum,
    airflow: newAir,
    pressure: newPress,
  }

  return {
    ...d,
    temp: spikeTemp,
    humidity: spikeHum,
    airflow: newAir,
    pressure: newPress,
    powerDraw: newPower,
    status,
    lastSeen: Date.now(),
    history: [...d.history.slice(-29), point],
  }
}

export function buildAlert(d: Device): AlertItem | null {
  if (d.status !== 'alert') return null
  let message = ''
  if (d.temp > 82) message = `${d.id} temperature exceeded ${d.temp.toFixed(1)}°F`
  else if (d.humidity > 65)
    message = `${d.id} humidity at ${d.humidity.toFixed(0)}% (high)`
  else if (d.pressure < 0.7)
    message = `${d.id} pressure drop detected (${d.pressure.toFixed(2)} kPa)`
  else message = `${d.id} condition abnormal`

  return {
    id: `${d.id}-${Date.now()}`,
    deviceId: d.id,
    severity: 'critical',
    message,
    time: Date.now(),
  }
}

export function formatLastSeen(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

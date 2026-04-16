import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { TelemetryGateway } from '../telemetry/telemetry.gateway'
import type { AlertItem, Device, TelemetryPoint } from '../types'

// ─── helpers ────────────────────────────────────────────────────────────────

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

function seedDevices(count = 14): Device[] {
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

// Mean-reversion targets — pulls values back toward normal operating conditions
// so fault spikes decay over time instead of the fleet drifting permanently bad.
const BASE_TEMP = 72
const BASE_HUM = 50
const BASE_AIR = 450
const BASE_PRESS = 1.2
const BASE_POWER = 3.0
const REVERSION = 0.05 // fraction of the gap pulled back per tick

function tickDevice(d: Device): Device {
  if (d.status === 'offline') return d

  const pull = (current: number, base: number) => (base - current) * REVERSION

  const newTemp = clamp(d.temp + rand(-0.4, 0.4) + pull(d.temp, BASE_TEMP), 60, 95)
  const newHum = clamp(d.humidity + rand(-1.2, 1.2) + pull(d.humidity, BASE_HUM), 25, 80)
  const newAir = clamp(d.airflow + rand(-15, 15) + pull(d.airflow, BASE_AIR), 300, 600)
  const newPress = clamp(d.pressure + rand(-0.05, 0.05) + pull(d.pressure, BASE_PRESS), 0.6, 1.8)
  const newPower = clamp(d.powerDraw + rand(-0.1, 0.1) + pull(d.powerDraw, BASE_POWER), 0.5, 4.9)

  // fault injection
  const spikeTemp = Math.random() < 0.008 ? newTemp + rand(8, 14) : newTemp
  const spikeHum = Math.random() < 0.005 ? newHum + rand(10, 18) : newHum

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

function buildAlert(d: Device): AlertItem | null {
  if (d.status !== 'alert') return null
  let message: string
  if (d.temp > 82)
    message = `${d.id} temperature exceeded ${d.temp.toFixed(1)}°F`
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

// ─── service ────────────────────────────────────────────────────────────────

@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private devices: Device[] = []
  private alerts: AlertItem[] = []
  private previousStatuses = new Map<string, Device['status']>()
  private tickInterval: ReturnType<typeof setInterval> | null = null

  constructor(private readonly gateway: TelemetryGateway) {}

  onModuleInit() {
    this.devices = seedDevices(14)
    this.devices.forEach((d) => this.previousStatuses.set(d.id, d.status))
    this.tickInterval = setInterval(() => this.tick(), 3000)
  }

  onModuleDestroy() {
    if (this.tickInterval) clearInterval(this.tickInterval)
  }

  private tick() {
    this.devices = this.devices.map((d) => {
      const updated = tickDevice(d)
      const prev = this.previousStatuses.get(d.id)

      if (updated.status === 'alert' && prev !== 'alert') {
        const alert = buildAlert(updated)
        if (alert) {
          this.alerts = [alert, ...this.alerts].slice(0, 50)
          this.gateway.broadcast('alert.created', alert)
        }
      }

      this.previousStatuses.set(d.id, updated.status)

      // push a lean telemetry event — not the full device (history array is large)
      this.gateway.broadcast('telemetry.updated', {
        id: updated.id,
        status: updated.status,
        temp: updated.temp,
        humidity: updated.humidity,
        airflow: updated.airflow,
        pressure: updated.pressure,
        powerDraw: updated.powerDraw,
        lastSeen: updated.lastSeen,
        latestPoint: updated.history[updated.history.length - 1],
      })

      return updated
    })
  }

  // ─── read methods used by controllers ───────────────────────────────────

  getDevices(): Device[] {
    return this.devices
  }

  getDevice(id: string): Device | undefined {
    return this.devices.find((d) => d.id === id)
  }

  getTelemetry(id: string): TelemetryPoint[] {
    return this.devices.find((d) => d.id === id)?.history ?? []
  }

  getAlerts(): AlertItem[] {
    return this.alerts
  }

  acknowledgeAlert(id: string): boolean {
    const exists = this.alerts.some((a) => a.id === id)
    if (!exists) return false
    this.alerts = this.alerts.filter((a) => a.id !== id)
    this.gateway.broadcast('alert.acknowledged', { id })
    return true
  }

  getSites(): string[] {
    return [...new Set(this.devices.map((d) => d.site))]
  }
}

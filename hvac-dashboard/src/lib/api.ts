import { io, type Socket } from 'socket.io-client'
import type { AlertItem, Device, TelemetryPoint } from '../types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3001'
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

// ─── REST ───────────────────────────────────────────────────────────────────

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  getDevices: () => json<Device[]>('/devices'),
  getAlerts: () => json<AlertItem[]>('/alerts'),
  getSites: () => json<string[]>('/sites'),
  acknowledgeAlert: (id: string) =>
    json<{ acknowledged: boolean }>(`/alerts/${id}/acknowledge`, {
      method: 'POST',
    }),
}

// ─── WebSocket ──────────────────────────────────────────────────────────────

// Lean payload broadcast every 3s — no full history array.
export interface TelemetryUpdate {
  id: string
  status: Device['status']
  temp: number
  humidity: number
  airflow: number
  pressure: number
  powerDraw: number
  lastSeen: number
  latestPoint: TelemetryPoint
}

export function connectSocket(): Socket {
  return io(WS_URL, {
    transports: ['websocket'],
    auth: { key: API_KEY },
  })
}

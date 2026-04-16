export type DeviceStatus = 'online' | 'offline' | 'alert' | 'warning'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface TelemetryPoint {
  time: number // ms epoch
  temp: number
  humidity: number
  airflow: number
  pressure: number
}

export interface MaintenanceEvent {
  date: string
  label: string
}

export interface Device {
  id: string
  site: string
  location: string
  status: DeviceStatus
  temp: number
  humidity: number
  airflow: number
  pressure: number
  powerDraw: number
  maxPower: number
  installDate: string
  lastSeen: number
  history: TelemetryPoint[]
  maintenance: MaintenanceEvent[]
}

export interface AlertItem {
  id: string
  deviceId: string
  severity: AlertSeverity
  message: string
  time: number
}

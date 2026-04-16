# CoolWatch — Architecture & Data Reference

A technical reference for the frontend data model, simulation engine, and state management as implemented in Phase 1. Updated as the backend is wired in.

---

## Data Types

All types are defined in `hvac-dashboard/src/types.ts`.

### `Device` — the core entity

| Field | Type | Example | Description |
|---|---|---|---|
| `id` | `string` | `"HVAC-04"` | Unique unit identifier |
| `site` | `string` | `"Building A"` | Which building |
| `location` | `string` | `"Building A • Floor 2 / Zone B"` | Human-readable position |
| `status` | `DeviceStatus` | `"alert"` | Current operational state |
| `temp` | `number` | `72.3` | °F, current reading |
| `humidity` | `number` | `48` | %, current reading |
| `airflow` | `number` | `440` | CFM, current reading |
| `pressure` | `number` | `1.2` | kPa, current reading |
| `powerDraw` | `number` | `3.1` | kW, current draw |
| `maxPower` | `number` | `5` | kW, rated maximum |
| `installDate` | `string` | `"2022-03-15"` | ISO date string |
| `lastSeen` | `number` | `1713284000000` | ms epoch timestamp |
| `history` | `TelemetryPoint[]` | — | Rolling last 30 readings — feeds the charts |
| `maintenance` | `MaintenanceEvent[]` | — | Log entries shown in detail panel |

**`DeviceStatus`** has four values:
- `online` — normal operation
- `offline` — device not reporting (frozen, not ticked)
- `warning` — soft threshold crossed (temp > 77°F or humidity > 62%)
- `alert` — hard threshold crossed (temp > 82°F, humidity > 65%, or pressure < 0.7 kPa)

### `TelemetryPoint` — one reading in the history window

| Field | Type | Description |
|---|---|---|
| `time` | `number` | ms epoch — used as x-axis label in charts |
| `temp` | `number` | °F at that moment |
| `humidity` | `number` | % at that moment |
| `airflow` | `number` | CFM at that moment |
| `pressure` | `number` | kPa at that moment |

Each device carries exactly **30 points**, representing the last ~2.5 minutes of readings at 5s intervals. The window slides on every tick — the oldest point is dropped, the newest is appended.

### `AlertItem` — a fired event

| Field | Type | Example | Description |
|---|---|---|---|
| `id` | `string` | `"HVAC-04-1713284000000"` | Unique — deviceId + timestamp |
| `deviceId` | `string` | `"HVAC-04"` | Which device triggered it |
| `severity` | `AlertSeverity` | `"critical"` | `critical`, `warning`, or `info` |
| `message` | `string` | `"HVAC-04 temperature exceeded 84.2°F"` | Human-readable description |
| `time` | `number` | `1713284000000` | ms epoch — when the alert fired |

Alerts are **separate from devices**. A device has a `status` field reflecting its current state. Alerts are their own list that accumulates over time and can be individually dismissed. Dismissing an alert does not change the device's status.

---

## Simulation Engine

All simulation logic lives in `hvac-dashboard/src/data/simulator.ts`.

### `seedDevices(count = 14)`

Runs once at application boot via `useState` initializer.

- Creates `count` devices with IDs `HVAC-01` through `HVAC-14`
- Distributes them round-robin across 3 buildings, 5 floors, 4 zones
- Each device gets a random baseline temp (69–75°F) and humidity (42–58%)
- Calls `makeInitialHistory()` to pre-populate 30 historical readings going back 2.5 minutes, so the charts are never empty on first render
- **Hardcodes** HVAC-04 as `alert` and HVAC-09 as `offline` so the dashboard has meaningful state immediately

### `tickDevice(d: Device)`

Called every **3 seconds** on every device. Returns a new device object (immutable update).

Offline devices are returned unchanged.

For all other devices:

1. **Random walk** — each sensor value moves slightly from its previous value:
   - Temp: ±0.4°F, clamped 60–95°F
   - Humidity: ±1.2%, clamped 25–80%
   - Airflow: ±15 CFM, clamped 300–600
   - Pressure: ±0.05 kPa, clamped 0.6–1.8
   - Power: ±0.1 kW, clamped 0.5–4.9

2. **Fault injection** — small independent probabilities of a short spike:
   - 0.8% chance: temp spikes +8 to +14°F (simulates a compressor fault)
   - 0.5% chance: humidity spikes +10 to +18% (simulates a drain blockage)

3. **Status derivation** — computed from the new values, not stored separately:
   - `temp > 82 || humidity > 65 || pressure < 0.7` → `alert`
   - `temp > 77 || humidity > 62` → `warning`
   - Otherwise → `online`

4. **History slide** — `history.slice(-29)` drops the oldest point, the new `TelemetryPoint` is appended. The array stays at 30 items.

### `buildAlert(d: Device)`

Called in `App.tsx` only when a device *transitions into* the `alert` status. Returns an `AlertItem` with a human-readable message based on which threshold was crossed first (temp → humidity → pressure, in that priority order).

Returns `null` if the device is not in alert state — safe to call defensively.

---

## Application State — `App.tsx`

All runtime state lives in a single component at the root.

```
devices[]          Device[]   The full fleet. Updated every 3s by tickDevice().
alerts[]           AlertItem[] The alert feed. Appended to on new faults, capped at 50.
selectedId         string | null  Which device is highlighted and driving the charts.
detailOpen         boolean   Whether the slide-in detail panel is visible.
site               string    Active building filter ("All Sites" or a building name).
previousStatuses   ref       Snapshot of each device's status from the last tick.
```

### The `previousStatuses` ref — why it exists

`tickDevice` recomputes status on every tick. Without tracking transitions, a device stuck in `alert` would generate a new `AlertItem` every 3 seconds. The ref holds a `Record<deviceId, status>` from the previous tick. An alert is only created when status **changes to** `alert` — not when it was already there.

This is a `useRef`, not `useState`, because changing it should not trigger a re-render.

### `filtered` — the site-scoped view

```ts
const filtered = useMemo(
  () => site === 'All Sites' ? devices : devices.filter(d => d.site === site),
  [devices, site]
)
```

Everything rendered on screen — KPI cards, the device table, alert counts — reads from `filtered`, not `devices`. Changing the site selector in the navbar scopes the entire dashboard to that building.

### `selected` — derived, not stored

```ts
const selected = devices.find(d => d.id === selectedId) ?? null
```

Only the **ID string** is stored in state. The `selected` object is re-derived on every render from the live `devices` array. This means once a device is selected, the charts and detail panel always show its latest telemetry without any extra wiring — the data flows naturally through the render cycle.

---

## Data Flow

```
seedDevices(14)
    │
    ▼
devices[] ──── setInterval 3s ──── tickDevice() on each ────▶ new devices[]
                                       │
                                       └─ status changed to 'alert'?
                                               │
                                               ▼
                                          buildAlert() ──▶ alerts[]
                                               
devices[]
    │
    ├── filtered (useMemo, by site)
    │       │
    │       ├──▶ KpiStrip        (counts, averages)
    │       ├──▶ DeviceTable     (rows, row colors, search)
    │       └──▶ AlertFeed       (alert count badge)
    │
    └── selectedId ──▶ devices.find() ──▶ selected Device
                                               │
                                               ├──▶ LiveCharts    (selected.history[])
                                               └──▶ DeviceDetail  (all fields)
```

---

## What Is Simulated vs. What the Real API Will Provide

| Concern | Phase 1 (simulated) | Phase 2+ (real backend) |
|---|---|---|
| Device list | `seedDevices()` at boot | `GET /devices` on mount |
| Live telemetry | `setInterval` + `tickDevice()` | WebSocket `telemetry.updated` events |
| Alert detection | Frontend threshold logic in `tickDevice` | Backend emits `alert.created` via WebSocket |
| Alert dismiss | Filters local `alerts[]` array | `POST /alerts/:id/acknowledge` |
| Alert acknowledge | Sets device status to `online` locally | Backend persists acknowledgement, pushes `alert.acknowledged` |
| Maintenance log | 3 hardcoded strings per device | Included in `GET /devices/:id` response |
| Chart history | Rolling 30-point in-memory array | `GET /devices/:id/telemetry?window=30m` on device select |
| Site/building list | Hardcoded `SITES` constant | `GET /sites` or part of initial dashboard snapshot |

The component interfaces are already shaped for the real backend. When the NestJS API is ready, the swap points are:
- Replace `useState(() => seedDevices(14))` with a `useEffect` fetch
- Replace the `setInterval` in `App.tsx` with a WebSocket subscription
- The components themselves (`KpiStrip`, `DeviceTable`, `LiveCharts`, etc.) do not need to change

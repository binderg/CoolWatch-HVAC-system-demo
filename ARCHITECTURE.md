# CoolWatch — Architecture & Data Reference

A technical reference for the full stack — frontend data model, simulation engine, state management, and the NestJS backend API.

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

All simulation logic lives in `hvac-dashboard/src/data/simulator.ts` (frontend) and is mirrored in `hvac-api/src/simulator/simulator.service.ts` (backend). Both use identical logic — the backend version runs on the server and pushes results via WebSocket instead of updating React state directly.

---

### What each sensor simulates

| Sensor | Unit | What it represents in the real world |
|---|---|---|
| `temp` | °F | Air temperature inside the HVAC unit or the zone it serves |
| `humidity` | % | Relative humidity — too high means drain/coil issues, too low means dry air |
| `airflow` | CFM (cubic feet/min) | How much air the unit is moving — drops indicate blockages or fan faults |
| `pressure` | kPa | Refrigerant or duct pressure — a drop is often the first sign of a leak |
| `powerDraw` | kW | Electrical consumption — spikes can indicate mechanical strain |

---

### `seedDevices(count = 14)` — runs once at boot

Creates the initial fleet of 14 devices. For each device:

1. Assigns it a **building, floor, and zone** (round-robin across 3 buildings, 5 floors, 4 zones)
2. Picks a **random baseline** temp (69–75°F) and humidity (42–58%) — simulates each unit having slightly different normal operating conditions
3. Calls `makeInitialHistory()` to **pre-fill 30 historical readings** spaced 5 seconds apart, going back 2.5 minutes — so the charts are never empty on first load
4. **Hardcodes** two devices into interesting states immediately:
   - HVAC-04 → `alert` (so the dashboard has a visible fault straight away)
   - HVAC-09 → `offline` (simulates a unit that has stopped reporting)

---

### `tickDevice(d: Device)` — runs every 3 seconds on every device

This is the core of the simulation. Every 3 seconds, each online device gets a new reading. Here's what happens in order:

**Step 1 — Random walk + mean reversion (normal sensor drift)**

Each sensor value changes slightly from its previous value every tick. Two forces act on it simultaneously:

- **Random walk** — a small random nudge up or down. Like a drunk wandering — no direction preference, no memory of where it started.
- **Mean reversion** — a gentle pull back toward the sensor's normal operating baseline. Each tick, 5% of the gap between current value and baseline is added back. So if temp has drifted to 90°F (baseline 72°F), it gets pulled back by `(72 - 90) × 0.05 = -0.9°F` on top of the random noise.

This means fault spikes naturally decay back to normal over ~20 ticks (~1 minute) rather than the fleet permanently drifting into alert territory. Status is **not permanent** — a device can go critical and then return to online on its own.

| Sensor | Random change per tick | Baseline (reversion target) | Clamped range |
|---|---|---|---|
| Temp | ±0.4°F | 72°F | 60–95°F |
| Humidity | ±1.2% | 50% | 25–80% |
| Airflow | ±15 CFM | 450 CFM | 300–600 |
| Pressure | ±0.05 kPa | 1.2 kPa | 0.6–1.8 |
| Power | ±0.1 kW | 3.0 kW | 0.5–4.9 |

**Step 2 — Fault injection (random spikes)**

Independently of the random walk, two low-probability faults can fire:

- **0.8% chance per tick**: temp spikes +8 to +14°F — simulates a compressor fault causing sudden heat buildup
- **0.5% chance per tick**: humidity spikes +10 to +18% — simulates a drain line blockage causing moisture to back up

At a 3s tick rate, a temp spike will occur roughly once every ~6 minutes per device across the fleet.

**Step 3 — Status derivation**

Status is not stored — it is recalculated fresh from the new sensor values after every tick. This means status can change in both directions:

- A device can go `online` → `warning` → `alert` as values climb
- A device can go `alert` → `warning` → `online` as mean reversion pulls values back down
- `offline` devices skip the tick entirely and are returned unchanged

The thresholds:

- `temp > 82°F` OR `humidity > 65%` OR `pressure < 0.7 kPa` → `alert`
- `temp > 77°F` OR `humidity > 62%` → `warning`
- Otherwise → `online`

**Step 4 — History slide**

The new reading is appended to the device's `history` array and the oldest point is dropped (`history.slice(-29)`). The array stays exactly 30 points — representing the last ~2.5 minutes of readings. This is what feeds the live charts.

---

### `buildAlert(d: Device)` — called on status transition

Only fires when a device **transitions into** `alert` (not on every tick it stays in alert). Produces a human-readable `AlertItem` message based on which threshold was crossed first:

1. Temp > 82°F → `"HVAC-04 temperature exceeded 84.2°F"`
2. Humidity > 65% → `"HVAC-04 humidity at 68% (high)"`
3. Pressure < 0.7 kPa → `"HVAC-04 pressure drop detected (0.63 kPa)"`

The transition check (not re-alerting on every tick) is handled by `previousStatuses` — a ref/map that records each device's status from the last tick and compares it to the current one.

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

## Backend API — `hvac-api/`

The NestJS backend is implemented and running. It mirrors the frontend simulation but runs on the server, pushing updates to the React app via WebSocket and serving initial data over REST.

### Backend folder structure

| Folder | What it is | Why it exists |
|---|---|---|
| `simulator/` | Server-side version of the React sim file | Holds device state + 3s tick loop on the server |
| `telemetry/` | WebSocket broadcaster | Pushes live updates to all connected clients via Socket.IO |
| `devices/` | REST routes for device data | Initial fleet load + telemetry history on device select |
| `alerts/` | REST routes for alert data | Load alert feed + acknowledge/dismiss alerts |
| `sites/` | REST route for site list | Populates the site filter dropdown |

### REST endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/devices` | All 14 devices with full state |
| `GET` | `/devices/:id` | Single device including maintenance log |
| `GET` | `/devices/:id/telemetry` | Last 30 `TelemetryPoint[]` for chart history |
| `GET` | `/alerts` | Active alert feed (max 50) |
| `POST` | `/alerts/:id/acknowledge` | Dismiss alert, emits `alert.acknowledged` WS event |
| `GET` | `/sites` | List of building names for the site filter |

### WebSocket events (Socket.IO)

| Event | Payload | When |
|---|---|---|
| `telemetry.updated` | Lean device snapshot (no history array) | Every 3s per device |
| `alert.created` | Full `AlertItem` | When a device transitions into `alert` status |
| `alert.acknowledged` | `{ id }` | When an alert is dismissed via REST |


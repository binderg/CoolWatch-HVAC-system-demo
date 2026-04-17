# CoolWatch — HVAC Fleet Monitor

A full-stack real-time dashboard for monitoring a fleet of HVAC units. A NestJS backend runs a simulation engine that ticks sensor data every 3 seconds, broadcasts updates over WebSocket, and serves initial state over REST. A React frontend renders the live telemetry — device table, KPI cards, live charts, an alert feed, and a per-device detail panel.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, PrimeReact, Chart.js |
| Backend | NestJS 11, Socket.IO, TypeScript |
| Infrastructure | Azure Container Apps (API), Azure Static Web Apps (frontend), Terraform |
| CI/CD | GitHub Actions → Azure Static Web Apps (frontend) + Azure Container Apps (API) |

---

## Repository layout

```
├── hvac-dashboard/     React + Vite frontend
├── hvac-api/           NestJS REST + WebSocket backend
├── infrastructure/     Terraform — Azure deployment
└── ARCHITECTURE.md     Full technical reference
```

---

## Getting started

### Prerequisites

- Node.js 20+

### Backend

```bash
cd hvac-api
cp .env.example .env       # set PORT, API_KEY, ALLOWED_ORIGIN
npm install
npm run start:dev
```

The API starts on `http://localhost:3001`.

### Frontend

```bash
cd hvac-dashboard
cp .env.example .env       # set VITE_API_URL, VITE_WS_URL, VITE_API_KEY
npm install
npm run dev
```

The dashboard opens at `http://localhost:5173`.

---

## Environment variables

### `hvac-api/.env`

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (default `3001`) |
| `API_KEY` | Secret key — clients must send this in the `x-api-key` header |
| `ALLOWED_ORIGIN` | CORS origin for the frontend (e.g. `https://your-app.azurestaticapps.net`) |

### `hvac-dashboard/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL for REST calls (e.g. `http://localhost:3001`) |
| `VITE_WS_URL` | WebSocket server URL (e.g. `http://localhost:3001`) |
| `VITE_API_KEY` | Must match `API_KEY` on the backend |

---

## How it works

On boot, the backend seeds 14 devices and starts a 3-second tick loop. Each tick applies random-walk + mean-reversion to five sensors (temp, humidity, airflow, pressure, power), probabilistically injects faults, re-derives device status, and broadcasts `telemetry.updated` to all connected clients over Socket.IO.

The React app loads the initial fleet and alert feed over REST on mount, then keeps state live by subscribing to three WebSocket events: `telemetry.updated` (patches device state and appends a history point), `alert.created` (prepends to the alert feed), and `alert.acknowledged` (removes a dismissed alert). All rendered data — KPI cards, device table, charts — flows from a single `devices[]` array at the root, scoped by a site filter.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full data model, simulation parameters, state layout, and API reference.

---

## API reference (summary)

| Method | Path | Description |
|---|---|---|
| `GET` | `/devices` | All 14 devices with full state |
| `GET` | `/devices/:id` | Single device including maintenance log |
| `GET` | `/devices/:id/telemetry` | Last 30 telemetry points |
| `GET` | `/alerts` | Active alert feed (max 50) |
| `POST` | `/alerts/:id/acknowledge` | Dismiss an alert |
| `GET` | `/sites` | Building names for the site filter |

All REST requests require an `x-api-key` header. WebSocket connections authenticate with `{ auth: { key } }` in the Socket.IO handshake.

---

## Infrastructure

Terraform in `infrastructure/` provisions:

- **Azure Container Registry (ACR)** — stores the `hvac-api` Docker image
- **Azure Container Apps** — runs the API (0.25 vCPU / 512 MB, scales 0–2 replicas)
- **Log Analytics Workspace** — 30-day container log retention

> **The Container App requires the Docker image to exist in ACR before `terraform apply` runs.** The correct first-time deployment order is:
>
> 1. Apply only the registry: `terraform apply -target=azurerm_container_registry.main`
> 2. Build and push the image (see Docker section below)
> 3. Apply the rest: `terraform apply`

```bash
cd infrastructure
terraform init
terraform apply -var-file="terraform.tfvars"
```

After the first apply, every push to `main` that touches `hvac-api/` triggers the `deploy-api.yml` workflow, which builds the image, pushes it to ACR, and deploys a new Container App revision automatically.

### Required GitHub Actions secrets

| Secret | Where to get it |
|---|---|
| `ACR_LOGIN_SERVER` | `terraform output container_registry_login_server` |
| `ACR_USERNAME` | `terraform output container_registry_username` |
| `ACR_PASSWORD` | `terraform output -raw container_registry_password` |
| `AZURE_CREDENTIALS` | JSON from `az ad sp create-for-rbac --sdk-auth` |
| `VITE_API_URL` | Container App URL from `terraform output api_url` |
| `VITE_WS_URL` | Same as `VITE_API_URL` |
| `VITE_API_KEY` | The `api_key` value from `terraform.tfvars` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_NICE_SKY_00BC14F10` | Azure Portal → Static Web App → Manage deployment token |

---

## Docker (API)

```bash
cd hvac-api
docker build -t hvac-api .
docker run -p 3001:3001 --env-file .env hvac-api
```

To push manually to ACR (e.g. for the initial first-time deploy):

```bash
az acr login --name crhvacdev
docker build -t crhvacdev.azurecr.io/hvac-api:latest ./hvac-api
docker push crhvacdev.azurecr.io/hvac-api:latest
```

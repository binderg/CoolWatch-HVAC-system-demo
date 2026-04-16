import { Chart } from 'primereact/chart'
import { useMemo } from 'react'
import type { Device } from '../types'

interface Props {
  device: Device | null
}

export function LiveCharts({ device }: Props) {
  const { tempData, tempOptions, envData, envOptions } = useMemo(() => {
    const history = device?.history ?? []
    const labels = history.map((p) => {
      const d = new Date(p.time)
      return `${String(d.getMinutes()).padStart(2, '0')}:${String(
        d.getSeconds(),
      ).padStart(2, '0')}`
    })

    const tempData = {
      labels,
      datasets: [
        {
          label: 'Temperature (°F)',
          data: history.map((p) => p.temp),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    }

    const axisTick = { color: '#94a3b8', font: { size: 10 } }
    const gridColor = '#f1f5f9'

    const tempOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          titleColor: '#111827',
          bodyColor: '#4b5563',
          padding: 10,
          displayColors: false,
        },
      },
      scales: {
        x: {
          grid: { color: gridColor, drawTicks: false },
          border: { display: false },
          ticks: { ...axisTick, maxTicksLimit: 6 },
        },
        y: {
          grid: { color: gridColor, drawTicks: false },
          border: { display: false },
          ticks: axisTick,
          suggestedMin: 65,
          suggestedMax: 90,
        },
      },
    }

    const envData = {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Humidity (%)',
          data: history.map((p) => p.humidity),
          backgroundColor: 'rgba(99, 102, 241, 0.55)',
          borderRadius: 3,
          yAxisID: 'y',
          barThickness: 8,
        },
        {
          type: 'line',
          label: 'Airflow (CFM)',
          data: history.map((p) => p.airflow),
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
          fill: false,
          yAxisID: 'y1',
        },
      ],
    }

    const envOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: {
          position: 'top' as const,
          align: 'end' as const,
          labels: {
            color: '#6b7280',
            boxWidth: 10,
            boxHeight: 10,
            font: { size: 11 },
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          titleColor: '#111827',
          bodyColor: '#4b5563',
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { color: gridColor, drawTicks: false },
          border: { display: false },
          ticks: { ...axisTick, maxTicksLimit: 6 },
        },
        y: {
          position: 'left' as const,
          grid: { color: gridColor, drawTicks: false },
          border: { display: false },
          ticks: { color: '#6366f1', font: { size: 10 } },
        },
        y1: {
          position: 'right' as const,
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#f59e0b', font: { size: 10 } },
        },
      },
    }

    return { tempData, tempOptions, envData, envOptions }
  }, [device])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ChartShell
        title="Temperature Trend"
        subtitle="Last 30 readings · 5 sec interval"
        device={device}
      >
        <Chart
          type="line"
          data={tempData}
          options={tempOptions}
          className="h-full w-full"
        />
      </ChartShell>

      <ChartShell
        title="Humidity & Airflow"
        subtitle="Dual-axis environmental trend"
        device={device}
      >
        <Chart data={envData} options={envOptions} className="h-full w-full" />
      </ChartShell>
    </div>
  )
}

function ChartShell({
  title,
  subtitle,
  device,
  children,
}: {
  title: string
  subtitle: string
  device: Device | null
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 whitespace-nowrap">
            {title}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
            {subtitle}
          </div>
        </div>
        {device ? (
          <div className="inline-flex items-center gap-2 shrink-0 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 whitespace-nowrap">
            <i className="pi pi-microchip text-slate-400 text-[10px]" />
            <span className="text-[11px] font-semibold text-slate-700">
              {device.id}
            </span>
            <span className="text-[11px] text-slate-400">
              · {device.location.split('•')[0].trim()}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 italic whitespace-nowrap">
            Select a device
          </span>
        )}
      </div>
      <div className="h-[260px]">{children}</div>
    </div>
  )
}

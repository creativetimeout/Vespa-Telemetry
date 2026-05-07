import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

const TARGET_POINTS = 500

function decimate(rows, target = TARGET_POINTS) {
  if (rows.length <= target) return rows
  const step = Math.ceil(rows.length / target)
  const out = []
  for (let i = 0; i < rows.length; i += step) out.push(rows[i])
  if (out[out.length - 1] !== rows[rows.length - 1]) out.push(rows[rows.length - 1])
  return out
}

// Build chart series. When two consecutive samples are further apart than
// `gapMs`, insert a null point so Recharts breaks the line instead of
// interpolating across the inter-trip gap.
function buildSeries(rows, key, gapMs = 60_000) {
  const out = []
  let lastT = null
  for (const r of rows) {
    if (!Number.isFinite(r[key]) || !Number.isFinite(r.ts_ms)) continue
    if (lastT != null && r.ts_ms - lastT > gapMs) {
      out.push({ t: lastT + 1, v: null })
    }
    out.push({ t: r.ts_ms, v: r[key] })
    lastT = r.ts_ms
  }
  return out
}

function fmtTimeOfDay(ms, locale) {
  return new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function Chart({ title, unit, data, color, yDomain, locale }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(t) => fmtTimeOfDay(t, locale)}
              tick={{ fontSize: 11 }}
              stroke="currentColor"
            />
            <YAxis
              domain={yDomain ?? ['auto', 'auto']}
              tick={{ fontSize: 11 }}
              stroke="currentColor"
              width={36}
            />
            <Tooltip
              formatter={(v) => [v?.toFixed?.(1) ?? v, unit]}
              labelFormatter={(t) => fmtTimeOfDay(t, locale)}
              contentStyle={{ fontSize: 12 }}
            />
            <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={1.5} isAnimationActive={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function TelemetryCharts({ telemetry, points }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage
  const charts = useMemo(() => {
    const tel = decimate(telemetry)
    const p = decimate(points)
    return {
      speed: buildSeries(tel, 'speed_kmh'),
      rpm: buildSeries(tel, 'rpm'),
      throttle: buildSeries(tel, 'throttle_pct'),
      elevation: buildSeries(p, 'alt'),
      engineTemp: buildSeries(tel, 'engine_temp_c'),
      battery: buildSeries(tel, 'battery_v'),
    }
  }, [telemetry, points])

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Chart title={t('charts.speed')} unit="km/h" data={charts.speed} color="#0ea5e9" yDomain={[0, 'auto']} locale={locale} />
      <Chart title={t('charts.elevation')} unit="m" data={charts.elevation} color="#10b981" locale={locale} />
      <Chart title={t('charts.rpm')} unit="rpm" data={charts.rpm} color="#a855f7" yDomain={[0, 'auto']} locale={locale} />
      <Chart title={t('charts.throttle')} unit="%" data={charts.throttle} color="#f59e0b" yDomain={[0, 100]} locale={locale} />
      <Chart title={t('charts.engineTemp')} unit="°C" data={charts.engineTemp} color="#ef4444" locale={locale} />
      <Chart title={t('charts.battery')} unit="V" data={charts.battery} color="#6366f1" locale={locale} />
    </div>
  )
}

import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import { getRoute, getRoutePoints, getRouteTelemetry } from '@/lib/db/queries'
import { formatKm, formatDuration, formatLper100km, formatDateLocal } from '@/lib/format'
import { buildGpx, downloadGpx } from '@/lib/gpx'
import MapView from '@/components/MapView'
import TelemetryCharts from '@/components/TelemetryCharts'

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}

export default function RoutePage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage
  const { ready } = useDb()

  const routeQ = useDbQuery(() => getRoute(id), [id])
  const pointsQ = useDbQuery(() => getRoutePoints(id), [id])
  const telemetryQ = useDbQuery(() => getRouteTelemetry(id), [id])

  const route = routeQ.data
  const points = pointsQ.data ?? []
  const telemetry = telemetryQ.data ?? []

  const tracks = useMemo(
    () => [
      {
        id,
        points: points
          .map((p) => [p.lat, p.lng])
          .filter((q) => Number.isFinite(q[0]) && Number.isFinite(q[1])),
      },
    ],
    [id, points]
  )

  const stats = useMemo(() => {
    let maxSpeed = 0
    let maxRpm = 0
    for (const r of telemetry) {
      if (Number.isFinite(r.speed_kmh) && r.speed_kmh > maxSpeed) maxSpeed = r.speed_kmh
      if (Number.isFinite(r.rpm) && r.rpm > maxRpm) maxRpm = r.rpm
    }
    return { maxSpeed, maxRpm }
  }, [telemetry])

  function onExport() {
    const gpx = buildGpx(
      [{ name: route?.id ?? 'route', points }],
      { metadataName: route?.id ?? 'route' }
    )
    downloadGpx(`${route?.id ?? 'route'}.gpx`, gpx)
  }

  if (!ready) return null
  if (routeQ.data === null) {
    return <p className="text-slate-500">{t('pages.route.notFound')}</p>
  }
  if (!route) return null

  const consumption =
    route.distance_km > 0 && route.liters_consumed > 0
      ? formatLper100km(route.distance_km / route.liters_consumed, locale)
      : '—'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {formatDateLocal(route.started_at_ms, locale)}
          </h1>
          <p className="text-sm text-slate-500 tabular-nums">
            {new Date(route.started_at_ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            {' → '}
            {new Date(route.ended_at_ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {formatKm(route.distance_km, locale)}
            {' · '}
            {formatDuration(route.duration_s)}
            {' · '}
            {consumption}
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={points.length === 0}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          {t('pages.route.exportGpx')}
        </button>
      </div>

      <MapView tracks={tracks} height={420} />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t('pages.route.stats.maxSpeed')} value={`${stats.maxSpeed.toFixed(1)} km/h`} />
        <Stat label={t('pages.route.stats.maxRpm')} value={Math.round(stats.maxRpm).toLocaleString(locale)} />
        <Stat
          label={t('pages.route.stats.fuel')}
          value={
            Number.isFinite(route.liters_consumed)
              ? `${route.liters_consumed.toFixed(2)} L`
              : '—'
          }
        />
        <Stat
          label={t('pages.route.stats.tcInterventions')}
          value={route.traction_control_counter ?? 0}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('pages.route.telemetry')}
        </h2>
        {telemetry.length > 0 || points.length > 0 ? (
          <TelemetryCharts telemetry={telemetry} points={points} />
        ) : null}
      </section>
    </div>
  )
}

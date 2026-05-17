import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import { getRoutesForDay, getRoutePoints, getRouteTelemetry } from '@/lib/db/queries'
import { formatKm, formatDuration, formatLper100km, formatDateLocal } from '@/lib/format'
import { buildGpx, downloadGpx } from '@/lib/gpx'
import MapView, { TRACK_COLORS } from '@/components/MapView'
import TelemetryCharts from '@/components/TelemetryCharts'
import AddToCollectionMenu from '@/components/AddToCollectionMenu'

function timeOnly(ms, locale) {
  if (!Number.isFinite(ms)) return '—'
  return new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

export default function Day() {
  const { date } = useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage
  const { ready } = useDb()
  const [cursor, setCursor] = useState(null)
  const [range, setRange] = useState(null)
  const [zoomRange, setZoomRange] = useState(null)

  const routesQ = useDbQuery(() => getRoutesForDay(date), [date])
  const routes = routesQ.data ?? []

  // Fetch points + telemetry for every route; recomputed when the route list changes.
  const routeIdsKey = routes.map((r) => r.id).join('|')
  const routePointsQ = useDbQuery(
    () => routes.map((r) => ({ id: r.id, points: getRoutePoints(r.id) })),
    [routeIdsKey]
  )
  const routePoints = routePointsQ.data ?? []

  const routeTelemetryQ = useDbQuery(
    () => routes.map((r) => ({ id: r.id, rows: getRouteTelemetry(r.id) })),
    [routeIdsKey]
  )
  const routeTelemetry = routeTelemetryQ.data ?? []

  const tracks = useMemo(
    () =>
      routePoints.map((rp) => ({
        id: rp.id,
        points: rp.points.map((p) => [p.lat, p.lng]).filter((q) => Number.isFinite(q[0]) && Number.isFinite(q[1])),
      })),
    [routePoints]
  )

  const allPoints = useMemo(
    () => routePoints.flatMap((rp) => rp.points).sort((a, b) => a.ts_ms - b.ts_ms),
    [routePoints]
  )
  const allTelemetry = useMemo(
    () => routeTelemetry.flatMap((rt) => rt.rows).sort((a, b) => a.ts_ms - b.ts_ms),
    [routeTelemetry]
  )

  const totals = useMemo(() => {
    let distance = 0
    let duration = 0
    let liters = 0
    for (const r of routes) {
      distance += r.distance_km ?? 0
      duration += r.duration_s ?? 0
      liters += r.liters_consumed ?? 0
    }
    return { distance, duration, liters }
  }, [routes])

  function onExportDay() {
    const gpxTracks = routePoints.map((rp, i) => ({
      name: `${date} #${i + 1}`,
      points: rp.points,
    }))
    const gpx = buildGpx(gpxTracks, { metadataName: `Vespa ${date}` })
    downloadGpx(`vespa-${date}.gpx`, gpx)
  }

  if (!ready) return null

  const dayDate = routes[0]?.started_at_ms

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {dayDate ? formatDateLocal(dayDate, locale) : t('pages.day.title', { date })}
          </h1>
          <p className="text-sm text-slate-500 tabular-nums">
            {routes.length} · {formatKm(totals.distance, locale)} · {formatDuration(totals.duration)}
            {totals.distance > 0 && totals.liters > 0
              ? ` · ${formatLper100km(totals.distance / totals.liters, locale)}`
              : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onExportDay}
          disabled={tracks.every((t) => t.points.length === 0)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          {t('pages.day.exportGpx')}
        </button>
      </div>

      {routes.length === 0 ? (
        <p className="text-slate-500">{t('pages.day.noRoutes')}</p>
      ) : (
        <>
          <MapView tracks={tracks} rawPoints={allPoints} cursor={cursor} range={range} zoomRange={zoomRange} height={420} />

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('pages.day.routes')}
            </h2>
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {routes.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900">
                  <Link to={`/route/${r.id}`} className="flex flex-1 items-center gap-3">
                    <span
                      aria-hidden
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: TRACK_COLORS[i % TRACK_COLORS.length] }}
                    />
                    <span className="tabular-nums">
                      {timeOnly(r.started_at_ms, locale)} → {timeOnly(r.ended_at_ms, locale)}
                    </span>
                    <span className="ml-auto text-sm text-slate-500 tabular-nums">
                      {formatKm(r.distance_km, locale)} · {formatDuration(r.duration_s)}
                      {r.distance_km > 0 && r.liters_consumed > 0
                        ? ` · ${formatLper100km(r.distance_km / r.liters_consumed, locale)}`
                        : ''}
                    </span>
                  </Link>
                  <AddToCollectionMenu routeId={r.id} compact />
                </li>
              ))}
            </ul>
          </section>

          {allTelemetry.length > 0 || allPoints.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t('pages.route.telemetry')}
              </h2>
              <TelemetryCharts
                telemetry={allTelemetry}
                points={allPoints}
                cursor={cursor}
                range={range}
                zoomRange={zoomRange}
                onCursorChange={setCursor}
                onRangeChange={setRange}
                onZoomChange={setZoomRange}
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

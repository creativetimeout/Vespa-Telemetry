import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import {
  getCollection,
  getCollectionRoutes,
  getDays,
  getRoutesForDay,
  getRoutePoints,
  getRouteTelemetry,
  addRouteToCollection,
  removeRouteFromCollection,
  renameCollection,
  deleteCollection,
} from '@/lib/db/queries'
import {
  formatKm,
  formatDuration,
  formatLper100km,
  formatDateLocal,
} from '@/lib/format'
import { buildGpx, downloadGpx } from '@/lib/gpx'
import MapView, { TRACK_COLORS } from '@/components/MapView'
import TelemetryCharts from '@/components/TelemetryCharts'

function timeOnly(ms, locale) {
  if (!Number.isFinite(ms)) return '—'
  return new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function AddTripsPanel({ collectionId, memberIds, onClose }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage
  const { bump } = useDb()
  const daysQ = useDbQuery(getDays)
  const days = daysQ.data ?? []
  const [openDay, setOpenDay] = useState(null)
  const dayRoutesQ = useDbQuery(
    () => (openDay ? getRoutesForDay(openDay) : []),
    [openDay]
  )
  const dayRoutes = dayRoutesQ.data ?? []

  function add(routeId) {
    addRouteToCollection(collectionId, routeId)
    bump()
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('pages.tours.addTrips')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          {t('pages.tours.cancel')}
        </button>
      </div>
      <ul className="max-h-96 divide-y divide-slate-200 overflow-y-auto rounded border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {days.map((d) => (
          <li key={`${d.day}-${d.vehicle_id}`}>
            <button
              type="button"
              onClick={() => setOpenDay((cur) => (cur === d.day ? null : d.day))}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="font-medium">{formatDateLocal(d.first_start_ms, locale)}</span>
              <span className="text-xs text-slate-500 tabular-nums">
                {d.routes} · {formatKm(d.distance_km, locale)}
              </span>
            </button>
            {openDay === d.day && (
              <ul className="bg-slate-50/60 dark:bg-slate-950/40">
                {dayRoutes.map((r) => {
                  const inTour = memberIds.has(r.id)
                  return (
                    <li
                      key={r.id}
                      className="flex items-center gap-2 px-5 py-1.5 text-sm"
                    >
                      <span className="tabular-nums">
                        {timeOnly(r.started_at_ms, locale)} → {timeOnly(r.ended_at_ms, locale)}
                      </span>
                      <span className="ml-auto text-xs text-slate-500 tabular-nums">
                        {formatKm(r.distance_km, locale)}
                      </span>
                      <button
                        type="button"
                        disabled={inTour}
                        onClick={() => add(r.id)}
                        className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        {inTour ? '✓' : '+'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function TourDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage
  const { ready, bump } = useDb()

  const tourQ = useDbQuery(() => getCollection(id), [id])
  const routesQ = useDbQuery(() => getCollectionRoutes(id), [id])
  const tour = tourQ.data
  const routes = routesQ.data ?? []

  const routeIdsKey = routes.map((r) => r.id).join('|')
  const routePointsQ = useDbQuery(
    () => routes.map((r) => ({ id: r.id, points: getRoutePoints(r.id) })),
    [routeIdsKey]
  )
  const routeTelemetryQ = useDbQuery(
    () => routes.map((r) => ({ id: r.id, rows: getRouteTelemetry(r.id) })),
    [routeIdsKey]
  )
  const routePoints = routePointsQ.data ?? []
  const routeTelemetry = routeTelemetryQ.data ?? []

  const tracks = useMemo(
    () =>
      routePoints.map((rp) => ({
        id: rp.id,
        points: rp.points
          .map((p) => [p.lat, p.lng])
          .filter((q) => Number.isFinite(q[0]) && Number.isFinite(q[1])),
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

  const memberIds = useMemo(() => new Set(routes.map((r) => r.id)), [routes])

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')

  if (!ready) return null
  if (tourQ.data === null) {
    return <p className="text-slate-500">{t('pages.route.notFound')}</p>
  }
  if (!tour) return null

  function onExport() {
    const gpxTracks = routePoints.map((rp, i) => ({
      name: `${tour.name} #${i + 1}`,
      points: rp.points,
    }))
    const safe = (tour.name || 'tour').replace(/[^a-z0-9-_]+/gi, '-')
    const gpx = buildGpx(gpxTracks, { metadataName: tour.name })
    downloadGpx(`${safe}.gpx`, gpx)
  }

  function onRemove(routeId) {
    removeRouteFromCollection(tour.id, routeId)
    bump()
  }

  function onDelete() {
    if (!confirm(t('pages.tours.confirmDelete'))) return
    deleteCollection(tour.id)
    bump()
    navigate('/tours')
  }

  function onSaveName(e) {
    e.preventDefault()
    const trimmed = editName.trim()
    if (!trimmed) return
    renameCollection(tour.id, trimmed, tour.notes ?? null)
    setEditing(false)
    bump()
  }

  const consumption =
    tour.total_distance_km > 0 && tour.total_liters > 0
      ? formatLper100km(tour.total_distance_km / tour.total_liters, locale)
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-baseline lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          {editing ? (
            <form onSubmit={onSaveName} className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xl font-semibold dark:border-slate-700 dark:bg-slate-900"
              />
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
              >
                {t('pages.tours.save')}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
              >
                {t('pages.tours.cancel')}
              </button>
            </form>
          ) : (
            <h1
              className="cursor-pointer text-2xl font-semibold tracking-tight"
              onClick={() => {
                setEditName(tour.name)
                setEditing(true)
              }}
              title={t('pages.tours.rename')}
            >
              {tour.name}
            </h1>
          )}
          <p className="text-sm text-slate-500 tabular-nums">
            {tour.route_count} · {formatKm(tour.total_distance_km, locale)} ·{' '}
            {formatDuration(tour.total_duration_s)}
            {consumption ? ` · ${consumption}` : ''}
          </p>
          {tour.notes && <p className="mt-1 text-sm text-slate-500">{tour.notes}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            {t('pages.tours.addTrips')}
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={routes.length === 0}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            {t('pages.tours.exportGpx')}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {t('pages.tours.delete')}
          </button>
        </div>
      </div>

      {showAdd && (
        <AddTripsPanel
          collectionId={tour.id}
          memberIds={memberIds}
          onClose={() => setShowAdd(false)}
        />
      )}

      {routes.length === 0 ? (
        <p className="text-slate-500">{t('pages.tours.noneInTour')}</p>
      ) : (
        <>
          <MapView tracks={tracks} height={420} />

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('pages.tours.trips')}
            </h2>
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {routes.map((r, i) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <Link to={`/route/${r.id}`} className="flex flex-1 items-center gap-3">
                    <span
                      aria-hidden
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: TRACK_COLORS[i % TRACK_COLORS.length] }}
                    />
                    <span className="tabular-nums">
                      {formatDateLocal(r.started_at_ms, locale)}
                    </span>
                    <span className="text-sm text-slate-500 tabular-nums">
                      {timeOnly(r.started_at_ms, locale)} → {timeOnly(r.ended_at_ms, locale)}
                    </span>
                    <span className="ml-auto text-sm text-slate-500 tabular-nums">
                      {formatKm(r.distance_km, locale)} · {formatDuration(r.duration_s)}
                      {r.distance_km > 0 && r.liters_consumed > 0
                        ? ` · ${formatLper100km(r.distance_km / r.liters_consumed, locale)}`
                        : ''}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onRemove(r.id)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                    {t('pages.tours.removeFromTour')}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {allTelemetry.length > 0 || allPoints.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t('pages.route.telemetry')}
              </h2>
              <TelemetryCharts telemetry={allTelemetry} points={allPoints} />
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

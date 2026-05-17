import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'

export const TRACK_COLORS = ['#0ea5e9', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6']

function FitBounds({ fitPoints }) {
  const map = useMap()
  useEffect(() => {
    if (!fitPoints || fitPoints.length === 0) return
    map.fitBounds(fitPoints, { padding: [24, 24] })
  }, [map, fitPoints])
  return null
}

function nearestPoint(rawPoints, cursorMs) {
  if (!rawPoints?.length || cursorMs == null) return null
  let best = null
  let bestDist = Infinity
  for (const p of rawPoints) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue
    const d = Math.abs(p.ts_ms - cursorMs)
    if (d < bestDist) { bestDist = d; best = p }
  }
  return best
}

// tracks: [{ id, points: [[lat, lng], ...] }]
// rawPoints: [{ ts_ms, lat, lng }] — used for cursor + range overlay
export default function MapView({ tracks, rawPoints, cursor, range, zoomRange, height = 360, className = '' }) {
  const hasAny = tracks.some((t) => t.points.length > 0)

  const cursorPoint = useMemo(
    () => nearestPoint(rawPoints, cursor),
    [rawPoints, cursor]
  )

  const rangePositions = useMemo(() => {
    if (!range || !rawPoints?.length) return []
    return rawPoints
      .filter((p) => p.ts_ms >= range[0] && p.ts_ms <= range[1] && Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => [p.lat, p.lng])
  }, [rawPoints, range])

  const fitPoints = useMemo(() => {
    if (zoomRange && rawPoints?.length) {
      const inRange = rawPoints
        .filter((p) => p.ts_ms >= zoomRange[0] && p.ts_ms <= zoomRange[1] && Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p) => [p.lat, p.lng])
      if (inRange.length > 0) return inRange
    }
    return tracks.flatMap((t) => t.points).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
  }, [tracks, rawPoints, zoomRange])

  return (
    <div
      className={`overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 ${className}`}
      style={{ height }}
    >
      {hasAny ? (
        <MapContainer
          center={[0, 0]}
          zoom={2}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {tracks.map((t, i) => (
            <Polyline
              key={t.id}
              positions={t.points}
              pathOptions={{ color: TRACK_COLORS[i % TRACK_COLORS.length], weight: 4, opacity: 0.85 }}
            />
          ))}
          {rangePositions.length > 1 && (
            <Polyline
              positions={rangePositions}
              pathOptions={{ color: 'white', weight: 6, opacity: 0.9 }}
            />
          )}
          {cursorPoint && (
            <CircleMarker
              center={[cursorPoint.lat, cursorPoint.lng]}
              radius={6}
              pathOptions={{ color: 'white', fillColor: 'white', fillOpacity: 1, weight: 2 }}
            />
          )}
          <FitBounds fitPoints={fitPoints} />
        </MapContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          —
        </div>
      )}
    </div>
  )
}

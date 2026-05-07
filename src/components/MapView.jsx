import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'

export const TRACK_COLORS = ['#0ea5e9', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6']

function FitBounds({ tracks }) {
  const map = useMap()
  useEffect(() => {
    const all = tracks.flatMap((t) => t.points).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
    if (all.length === 0) return
    map.fitBounds(all, { padding: [24, 24] })
  }, [map, tracks])
  return null
}

// tracks: [{ id, points: [[lat, lng], ...] }]
export default function MapView({ tracks, height = 360, className = '' }) {
  const hasAny = tracks.some((t) => t.points.length > 0)
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
          <FitBounds tracks={tracks} />
        </MapContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          —
        </div>
      )}
    </div>
  )
}

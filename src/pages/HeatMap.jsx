import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Popup, useMap, useMapEvents } from 'react-leaflet'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import { getAllRoutePoints } from '@/lib/db/queries'
import HeatLayer from '@/components/HeatLayer'
import HeatMapLegend from '@/components/HeatMapLegend'

const CLICK_RADIUS_PX = 15

function FitAllPoints({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length === 0) return
    map.fitBounds(
      points.map((p) => [p.lat, p.lng]),
      { padding: [24, 24] }
    )
  }, [map, points])
  return null
}

function ClickInfo({ points }) {
  const { t } = useTranslation()
  const [popup, setPopup] = useState(null)

  const map = useMapEvents({
    click(e) {
      const clickPt = map.latLngToContainerPoint(e.latlng)
      let count = 0
      for (const p of points) {
        const pt = map.latLngToContainerPoint([p.lat, p.lng])
        if (pt.distanceTo(clickPt) <= CLICK_RADIUS_PX) count++
      }
      setPopup(count > 0 ? { latlng: e.latlng, count } : null)
    },
  })

  if (!popup) return null

  return (
    <Popup position={popup.latlng} eventHandlers={{ remove: () => setPopup(null) }}>
      {t('pages.heatMap.pointsNearby', { count: popup.count })}
    </Popup>
  )
}

export default function HeatMap() {
  const { t } = useTranslation()
  const { ready } = useDb()
  const { data: points } = useDbQuery(getAllRoutePoints)

  const hasPoints = useMemo(() => points && points.length > 0, [points])

  if (!ready) return null

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('pages.heatMap.title')}</h1>
      {!hasPoints ? (
        <p className="text-slate-500">{t('pages.heatMap.empty')}</p>
      ) : (
        <div
          className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
          style={{ height: 600 }}
        >
          <MapContainer center={[0, 0]} zoom={2} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HeatLayer points={points} />
            <ClickInfo points={points} />
            <FitAllPoints points={points} />
          </MapContainer>
          <HeatMapLegend />
        </div>
      )}
    </div>
  )
}

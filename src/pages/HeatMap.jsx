import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Popup, useMap, useMapEvents } from 'react-leaflet'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import { getAllRoutePoints } from '@/lib/db/queries'
import { buildHeatCells } from '@/lib/heatgrid'
import {
  CELL_SIZE_OPTIONS_M,
  WINDOW_OPTIONS_MINUTES,
  getStoredCellSizeM,
  getStoredWindowMinutes,
  setStoredCellSizeM,
  setStoredWindowMinutes,
} from '@/lib/heatSettings'
import HeatLayer from '@/components/HeatLayer'
import HeatMapLegend from '@/components/HeatMapLegend'

const CLICK_RADIUS_PX = 15

function FitAllPoints({ cells }) {
  const map = useMap()
  useEffect(() => {
    if (!cells || cells.length === 0) return
    map.fitBounds(
      cells.map((c) => [c.lat, c.lng]),
      { padding: [24, 24] }
    )
  }, [map, cells])
  return null
}

function ClickInfo({ cells }) {
  const { t } = useTranslation()
  const [popup, setPopup] = useState(null)

  const map = useMapEvents({
    click(e) {
      const clickPt = map.latLngToContainerPoint(e.latlng)
      let count = 0
      for (const c of cells) {
        const pt = map.latLngToContainerPoint([c.lat, c.lng])
        if (pt.distanceTo(clickPt) <= CLICK_RADIUS_PX) count += c.count
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

  const [cellSizeM, setCellSizeM] = useState(() => getStoredCellSizeM())
  const [windowMinutes, setWindowMinutes] = useState(() => getStoredWindowMinutes())

  function handleCellSizeChange(e) {
    const value = Number(e.target.value)
    setCellSizeM(value)
    setStoredCellSizeM(value)
  }

  function handleWindowChange(e) {
    const value = Number(e.target.value)
    setWindowMinutes(value)
    setStoredWindowMinutes(value)
  }

  const cells = useMemo(() => {
    if (!points || points.length === 0) return []
    return buildHeatCells(points, { cellSizeM, windowMs: windowMinutes * 60_000 })
  }, [points, cellSizeM, windowMinutes])

  const hasCells = useMemo(() => cells && cells.length > 0, [cells])

  if (!ready) return null

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('pages.heatMap.title')}</h1>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">{t('pages.heatMap.cellSizeLabel')}</span>
          <select
            value={cellSizeM}
            onChange={handleCellSizeChange}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {CELL_SIZE_OPTIONS_M.map((v) => (
              <option key={v} value={v}>
                {v} m
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">{t('pages.heatMap.windowLabel')}</span>
          <select
            value={windowMinutes}
            onChange={handleWindowChange}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {WINDOW_OPTIONS_MINUTES.map((v) => (
              <option key={v} value={v}>
                {v} min
              </option>
            ))}
          </select>
        </label>
      </div>
      {!hasCells ? (
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
            <HeatLayer cells={cells} />
            <ClickInfo cells={cells} />
            <FitAllPoints cells={cells} />
          </MapContainer>
          <HeatMapLegend />
        </div>
      )}
    </div>
  )
}

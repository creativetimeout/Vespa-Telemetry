import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

export default function HeatLayer({ cells }) {
  const map = useMap()

  useEffect(() => {
    if (!cells || cells.length === 0) return
    const heatPoints = cells.map((c) => [c.lat, c.lng, c.count])
    const sortedCounts = cells.map((c) => c.count).sort((a, b) => a - b)
    const p95Index = Math.floor(sortedCounts.length * 0.95)
    const max = Math.max(sortedCounts[p95Index] ?? sortedCounts[sortedCounts.length - 1], 1)
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 20,
      blur: 15,
      maxZoom: 17,
      max,
      gradient: { 0.2: 'green', 0.5: 'yellow', 0.8: 'orange', 1.0: 'red' },
    }).addTo(map)
    return () => map.removeLayer(heatLayer)
  }, [map, cells])

  return null
}

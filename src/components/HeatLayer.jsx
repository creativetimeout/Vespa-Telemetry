import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

export default function HeatLayer({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!points || points.length === 0) return
    const heatPoints = points.map((p) => [p.lat, p.lng, 1])
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 20,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.2: 'green', 0.5: 'yellow', 0.8: 'orange', 1.0: 'red' },
    }).addTo(map)
    return () => map.removeLayer(heatLayer)
  }, [map, points])

  return null
}

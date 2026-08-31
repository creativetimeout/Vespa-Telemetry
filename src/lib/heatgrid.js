const METERS_PER_DEG_LAT = 111_320

function averageLatRad(points) {
  const sum = points.reduce((acc, p) => acc + p.lat, 0)
  return (sum / points.length) * (Math.PI / 180)
}

function metersPerDegLng(avgLatRad) {
  return METERS_PER_DEG_LAT * Math.cos(avgLatRad)
}

/**
 * Aggregates raw GPS points into a fixed-size grid, counting one "visit"
 * per cell unless the same cell was already counted within `windowMs`
 * (tracked independently per route_id).
 *
 * @param {Array<{route_id: number, seq: number, ts_ms: number, lat: number, lng: number}>} points
 *   Must be pre-sorted ascending by (route_id, seq/ts_ms).
 * @param {{cellSizeM: number, windowMs: number}} options
 * @returns {Array<{lat: number, lng: number, count: number}>}
 */
export function buildHeatCells(points, { cellSizeM, windowMs }) {
  if (!points || points.length === 0) return []

  const mPerLng = metersPerDegLng(averageLatRad(points))

  function cellIndex(p) {
    const x = p.lng * mPerLng
    const y = p.lat * METERS_PER_DEG_LAT
    return [Math.floor(x / cellSizeM), Math.floor(y / cellSizeM)]
  }

  const counts = new Map() // cellKey -> count
  const lastCountedByRoute = new Map() // route_id -> Map(cellKey -> lastTsMs)

  for (const p of points) {
    const [ix, iy] = cellIndex(p)
    const cellKey = `${ix}:${iy}`

    let lastCounted = lastCountedByRoute.get(p.route_id)
    if (!lastCounted) {
      lastCounted = new Map()
      lastCountedByRoute.set(p.route_id, lastCounted)
    }

    const last = lastCounted.get(cellKey)
    if (last === undefined || p.ts_ms - last >= windowMs) {
      counts.set(cellKey, (counts.get(cellKey) || 0) + 1)
      lastCounted.set(cellKey, p.ts_ms)
    }
  }

  return [...counts.entries()].map(([cellKey, count]) => {
    const [ix, iy] = cellKey.split(':').map(Number)
    const centerX = (ix + 0.5) * cellSizeM
    const centerY = (iy + 0.5) * cellSizeM
    return {
      lat: centerY / METERS_PER_DEG_LAT,
      lng: centerX / mPerLng,
      count,
    }
  })
}

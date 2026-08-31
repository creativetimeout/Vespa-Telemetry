import { describe, it, expect } from 'vitest'
import { buildHeatCells } from './heatgrid'

const TEN_MIN_MS = 10 * 60_000

describe('buildHeatCells', () => {
  it('returns an empty array for no points', () => {
    expect(buildHeatCells([], { cellSizeM: 50, windowMs: TEN_MIN_MS })).toEqual([])
  })

  it('collapses many points at a traffic light into a single visit', () => {
    // 20 points, all within the same ~50m cell, spread across 3 minutes
    const points = Array.from({ length: 20 }, (_, i) => ({
      route_id: 1,
      seq: i,
      ts_ms: i * 9_000, // 9s apart -> spans 171s (< 3 min... adjust below)
      lat: 49.6 + i * 0.000001,
      lng: 8.6 + i * 0.000001,
      alt: 100,
    }))
    const cells = buildHeatCells(points, { cellSizeM: 50, windowMs: TEN_MIN_MS })
    expect(cells).toHaveLength(1)
    expect(cells[0].count).toBe(1)
  })

  it('counts a revisit of the same cell after the window has elapsed', () => {
    const points = [
      { route_id: 1, seq: 0, ts_ms: 0, lat: 49.6, lng: 8.6, alt: 100 },
      { route_id: 1, seq: 1, ts_ms: 15 * 60_000, lat: 49.6, lng: 8.6, alt: 100 },
    ]
    const cells = buildHeatCells(points, { cellSizeM: 50, windowMs: TEN_MIN_MS })
    expect(cells).toHaveLength(1)
    expect(cells[0].count).toBe(2)
  })
})

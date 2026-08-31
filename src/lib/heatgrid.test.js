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

  it('counts revisits of the same spot on different routes independently of time gap', () => {
    const points = [
      { route_id: 1, seq: 0, ts_ms: 0, lat: 49.6, lng: 8.6, alt: 100 },
      // same location, same route, only 1 minute later -> route 1 stays at count 1
      { route_id: 1, seq: 1, ts_ms: 60_000, lat: 49.6, lng: 8.6, alt: 100 },
      // different route, arbitrary timestamp gap -> counts as a separate visit
      { route_id: 2, seq: 0, ts_ms: 120_000, lat: 49.6, lng: 8.6, alt: 100 },
    ]
    const cells = buildHeatCells(points, { cellSizeM: 50, windowMs: TEN_MIN_MS })
    expect(cells).toHaveLength(1)
    expect(cells[0].count).toBe(2)
  })

  it('does not reset the window on ignored points during sustained slow traffic', () => {
    // 15 points, 1 minute apart, all in the same cell, spanning 14 minutes total.
    // If the timer reset on every point, count would stay 1 forever (each gap < 10min).
    // If it resets only on counted points, point at minute 10 should start a new visit
    // once >= windowMs has passed since the last COUNTED point (minute 0).
    const points = Array.from({ length: 15 }, (_, i) => ({
      route_id: 1,
      seq: i,
      ts_ms: i * 60_000,
      lat: 49.6,
      lng: 8.6,
      alt: 100,
    }))
    const cells = buildHeatCells(points, { cellSizeM: 50, windowMs: TEN_MIN_MS })
    expect(cells).toHaveLength(1)
    // minute 0 counted, minute 10 (10*60_000 - 0 >= 600_000) counted again
    expect(cells[0].count).toBe(2)
  })

  it('keeps points on opposite sides of a cell boundary in separate cells', () => {
    // cellSizeM = 50; construct two points ~60m apart in longitude so they
    // fall in adjacent cells at the equator-ish latitude used here.
    const points = [
      { route_id: 1, seq: 0, ts_ms: 0, lat: 49.6, lng: 8.6, alt: 100 },
      { route_id: 1, seq: 1, ts_ms: 0, lat: 49.6, lng: 8.60083, alt: 100 }, // ~60m east
    ]
    const cells = buildHeatCells(points, { cellSizeM: 50, windowMs: TEN_MIN_MS })
    expect(cells).toHaveLength(2)
    expect(cells.every((c) => c.count === 1)).toBe(true)
  })
})

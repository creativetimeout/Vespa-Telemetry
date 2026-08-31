import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_CELL_SIZE_M,
  DEFAULT_WINDOW_MINUTES,
  getStoredCellSizeM,
  getStoredWindowMinutes,
  setStoredCellSizeM,
  setStoredWindowMinutes,
} from './heatSettings'

beforeEach(() => {
  localStorage.clear()
})

describe('heatSettings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(getStoredCellSizeM()).toBe(DEFAULT_CELL_SIZE_M)
    expect(getStoredWindowMinutes()).toBe(DEFAULT_WINDOW_MINUTES)
  })

  it('round-trips a valid stored value', () => {
    setStoredCellSizeM(25)
    setStoredWindowMinutes(30)
    expect(getStoredCellSizeM()).toBe(25)
    expect(getStoredWindowMinutes()).toBe(30)
  })

  it('falls back to the default for an out-of-range stored value', () => {
    localStorage.setItem('vespa.heatmap.cellSizeM', '9999')
    expect(getStoredCellSizeM()).toBe(DEFAULT_CELL_SIZE_M)
  })
})

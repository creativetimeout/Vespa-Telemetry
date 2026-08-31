const CELL_SIZE_KEY = 'vespa.heatmap.cellSizeM'
const WINDOW_KEY = 'vespa.heatmap.windowMinutes'

export const CELL_SIZE_OPTIONS_M = [15, 25, 50, 100]
export const WINDOW_OPTIONS_MINUTES = [5, 10, 15, 30]

export const DEFAULT_CELL_SIZE_M = 50
export const DEFAULT_WINDOW_MINUTES = 10

function readStored(key, fallback, allowedValues) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const n = Number(raw)
    return allowedValues.includes(n) ? n : fallback
  } catch {
    return fallback
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // localStorage unavailable (private browsing, quota) — setting is
    // simply not persisted; the in-memory React state still works.
  }
}

export function getStoredCellSizeM() {
  return readStored(CELL_SIZE_KEY, DEFAULT_CELL_SIZE_M, CELL_SIZE_OPTIONS_M)
}

export function getStoredWindowMinutes() {
  return readStored(WINDOW_KEY, DEFAULT_WINDOW_MINUTES, WINDOW_OPTIONS_MINUTES)
}

export function setStoredCellSizeM(value) {
  writeStored(CELL_SIZE_KEY, value)
}

export function setStoredWindowMinutes(value) {
  writeStored(WINDOW_KEY, value)
}

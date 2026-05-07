import { loadSqlJs } from './sqljs'
import { runMigrations } from './schema'
import { loadDbBytes, saveDbBytes, clearDbBytes } from './persist'

let dbInstance = null
let saveTimer = null
const SAVE_DEBOUNCE_MS = 500

async function newDb() {
  const SQL = await loadSqlJs()
  return new SQL.Database()
}

async function openFromBytes(bytes) {
  const SQL = await loadSqlJs()
  return new SQL.Database(bytes)
}

export async function openDb() {
  if (dbInstance) return dbInstance
  const bytes = await loadDbBytes()
  dbInstance = bytes ? await openFromBytes(bytes) : await newDb()
  runMigrations(dbInstance)
  return dbInstance
}

function persistSoon() {
  if (!dbInstance) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    saveTimer = null
    if (!dbInstance) return
    try {
      const bytes = dbInstance.export()
      await saveDbBytes(bytes)
    } catch (err) {
      console.error('Failed to persist DB', err)
    }
  }, SAVE_DEBOUNCE_MS)
}

export async function persistNow() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (!dbInstance) return
  const bytes = dbInstance.export()
  await saveDbBytes(bytes)
}

// Run a write statement and trigger a debounced persist.
export function run(sql, params) {
  if (!dbInstance) throw new Error('DB not open')
  dbInstance.run(sql, params)
  persistSoon()
}

// Run a `BEGIN; ...; COMMIT;` style block of writes via a callback that
// receives the raw db. Persists once at the end.
export function tx(fn) {
  if (!dbInstance) throw new Error('DB not open')
  dbInstance.exec('BEGIN')
  try {
    fn(dbInstance)
    dbInstance.exec('COMMIT')
  } catch (err) {
    dbInstance.exec('ROLLBACK')
    throw err
  }
  persistSoon()
}

// Read-only query. Returns an array of row objects.
export function all(sql, params = []) {
  if (!dbInstance) throw new Error('DB not open')
  const stmt = dbInstance.prepare(sql)
  try {
    stmt.bind(params)
    const out = []
    while (stmt.step()) out.push(stmt.getAsObject())
    return out
  } finally {
    stmt.free()
  }
}

export function one(sql, params = []) {
  const rows = all(sql, params)
  return rows[0] ?? null
}

export async function exportBytes() {
  if (!dbInstance) await openDb()
  return dbInstance.export()
}

export async function replaceWithBytes(bytes) {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (dbInstance) {
    try {
      dbInstance.close()
    } catch {
      // ignore
    }
    dbInstance = null
  }
  dbInstance = await openFromBytes(bytes)
  runMigrations(dbInstance)
  await persistNow()
  return dbInstance
}

export async function clearAll() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (dbInstance) {
    try {
      dbInstance.close()
    } catch {
      // ignore
    }
    dbInstance = null
  }
  await clearDbBytes()
  await openDb()
}

// For tests / introspection only.
export function _getDb() {
  return dbInstance
}

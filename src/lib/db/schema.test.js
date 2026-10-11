import { describe, it, expect, beforeAll } from 'vitest'
import initSqlJs from 'sql.js'
import { runMigrations, validateSchema } from './schema'

let SQL

beforeAll(async () => {
  SQL = await initSqlJs()
})

function migratedDb() {
  const db = new SQL.Database()
  runMigrations(db)
  return db
}

describe('validateSchema', () => {
  it('accepts a freshly migrated database', () => {
    expect(() => validateSchema(migratedDb())).not.toThrow()
  })

  it('rejects a database that skipped migrations via a spoofed schema_version', () => {
    const db = new SQL.Database()
    db.run("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT); INSERT INTO meta VALUES ('schema_version', '999')")
    runMigrations(db)
    expect(() => validateSchema(db)).toThrow(/missing/i)
  })

  it('rejects a database with a missing view', () => {
    const db = migratedDb()
    db.run('DROP VIEW day_summary')
    expect(() => validateSchema(db)).toThrow(/day_summary/)
  })

  it('rejects a database containing triggers', () => {
    const db = migratedDb()
    db.run('CREATE TRIGGER wipe AFTER INSERT ON route BEGIN DELETE FROM tour_collection; END')
    expect(() => validateSchema(db)).toThrow(/trigger/i)
  })
})

// Smoke-test the normalize step against the example file.
// (We can't run the Vite worker or sql.js bundle here; this just exercises
// pure logic to make sure the normalized payload looks right.)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decryptVespaExport } from '../src/lib/import/decrypt.js'
import { buildImportPayload } from '../src/lib/import/normalize.js'

if (!globalThis.atob) globalThis.atob = (b) => Buffer.from(b, 'base64').toString('binary')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fileText = fs.readFileSync(
  path.resolve(__dirname, '..', 'input', 'Vespa_2605061756.json'),
  'utf8'
)
const decrypted = decryptVespaExport(fileText)
const p = buildImportPayload(decrypted)

console.log('user_id:', p.user_id)
console.log('vehicles:', p.vehicles.length)
const v = p.vehicles[0]
console.log('  vehicle[0]:', {
  id: v.id, name: v.name, model: v.model, vin: v.vin,
  total_mileage: v.total_mileage,
  last_service_date_ms: v.last_service_date_ms,
  last_service_date: v.last_service_date_ms ? new Date(v.last_service_date_ms).toISOString() : null,
  has_image: !!v.image_data_raw,
  image_b64_chars: v.image_data_raw?.length ?? 0,
})

console.log('routes:', p.routes.length)
const r = p.routes[0]
console.log('  route[0]:', {
  id: r.id,
  vehicle_id: r.vehicle_id,
  started_at_ms: r.started_at_ms,
  started_at: new Date(r.started_at_ms).toISOString(),
  ended_at: new Date(r.ended_at_ms).toISOString(),
  duration_s: r.duration_s,
  distance_km: r.distance_km,
  liters_consumed: r.liters_consumed,
  avg_consumption_kml: r.avg_consumption_kml,
  points: r.points.length,
  telemetry: r.telemetry.length,
})

console.log('  point[0]:', r.points[0])
console.log('  point[last]:', r.points[r.points.length - 1])
console.log('  telem[0]:', r.telemetry[0])
console.log('  telem[last]:', r.telemetry[r.telemetry.length - 1])

const totalPoints = p.routes.reduce((a, x) => a + x.points.length, 0)
const totalTelem = p.routes.reduce((a, x) => a + x.telemetry.length, 0)
console.log()
console.log('Total points across all routes:', totalPoints)
console.log('Total telemetry rows across all routes:', totalTelem)

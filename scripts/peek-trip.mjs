// Quick peek at the first trip's tripData (telemetry CSV) and tripGPS shape.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decryptVespaExport } from '../src/lib/import/decrypt.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
if (!globalThis.atob) {
  globalThis.atob = (b64) => Buffer.from(b64, 'base64').toString('binary')
}
const fileText = fs.readFileSync(path.join(root, 'input', 'Vespa_2605061756.json'), 'utf8')
const { data } = decryptVespaExport(fileText)

console.log('Trips count:', data.trips.length)
console.log('Activities count:', data.activities.length)
console.log()

const trip = data.trips[0]
console.log('Trip[0].id:', trip.id)
console.log('Trip[0] keys:', Object.keys(trip))

function csvSummary(label, csv) {
  const lines = csv.split('\n').filter(Boolean)
  console.log(`\n--- ${label} ---`)
  console.log('Lines:', lines.length)
  console.log('Header:', lines[0])
  console.log('Row[0]:', lines[1])
  console.log('Row[1]:', lines[2])
  console.log('Row[last]:', lines[lines.length - 1])
}

csvSummary('tripGPS', trip.tripGPS)
csvSummary('tripData', trip.tripData)

console.log('\nActivity[0]:')
console.log(JSON.stringify(data.activities[0], null, 2))

const act = data.activities[0]
const tripById = Object.fromEntries(data.trips.map((t) => [t.id, t]))
console.log('\nactivity.id matches a trip.id?', !!tripById[act.id])

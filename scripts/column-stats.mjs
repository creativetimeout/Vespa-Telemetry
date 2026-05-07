// Compute per-column min/avg/max across ALL tripData rows, to figure out
// which column averages ~15% (likely throttle position).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decryptVespaExport } from '../src/lib/import/decrypt.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
if (!globalThis.atob) globalThis.atob = (b) => Buffer.from(b, 'base64').toString('binary')

const fileText = fs.readFileSync(
  path.resolve(__dirname, '..', 'input', 'Vespa_2605061756.json'),
  'utf8'
)
const { data } = decryptVespaExport(fileText)

const stats = {}
for (const trip of data.trips) {
  const lines = trip.tripData.split('\n').filter(Boolean)
  const header = lines[0].split(';')
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';')
    for (let c = 0; c < header.length; c++) {
      const name = header[c]
      const v = parseFloat(cols[c])
      if (!Number.isFinite(v)) continue
      if (!stats[name]) stats[name] = { min: Infinity, max: -Infinity, sum: 0, n: 0, nonZero: 0 }
      const s = stats[name]
      if (v < s.min) s.min = v
      if (v > s.max) s.max = v
      s.sum += v
      s.n++
      if (v !== 0) s.nonZero++
    }
  }
}

console.log('Column'.padEnd(28), 'min'.padStart(10), 'avg'.padStart(10), 'max'.padStart(10), 'nonZero%'.padStart(10))
for (const [name, s] of Object.entries(stats)) {
  console.log(
    name.padEnd(28),
    s.min.toFixed(3).padStart(10),
    (s.sum / s.n).toFixed(3).padStart(10),
    s.max.toFixed(3).padStart(10),
    ((s.nonZero / s.n) * 100).toFixed(1).padStart(9) + '%'
  )
}

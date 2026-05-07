// Discovery: decrypt the example Vespa export and dump its shape.
// Run: node scripts/discover-shape.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decryptVespaExport } from '../src/lib/import/decrypt.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const inputPath = path.join(root, 'input', 'Vespa_2605061756.json')
const outPath = path.join(root, 'documentation', 'decrypted-shape.md')

if (!globalThis.atob) {
  globalThis.atob = (b64) => Buffer.from(b64, 'base64').toString('binary')
}

const fileText = fs.readFileSync(inputPath, 'utf8')
console.log(`Read ${inputPath} (${fileText.length} chars)`)

const { header, data } = decryptVespaExport(fileText)
console.log('Decrypted OK')

function describe(value, depth = 0, maxDepth = 3) {
  if (value === null) return 'null'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array<empty>'
    const sample = value[0]
    return `array(${value.length}) of ${describe(sample, depth + 1, maxDepth)}`
  }
  const t = typeof value
  if (t !== 'object') return t
  if (depth >= maxDepth) return 'object{...}'
  const keys = Object.keys(value)
  const parts = keys.map((k) => `${k}: ${describe(value[k], depth + 1, maxDepth)}`)
  return `{ ${parts.join(', ')} }`
}

function summarizeArrayOfObjects(arr, sampleSize = 1) {
  const keys = new Set()
  const types = {}
  for (const item of arr) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (const k of Object.keys(item)) {
        keys.add(k)
        const v = item[k]
        const tt = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v
        types[k] = types[k] || new Set()
        types[k].add(tt)
      }
    }
  }
  const fieldRows = [...keys].map(
    (k) => `  - \`${k}\`: ${[...types[k]].join(' | ')}`
  )
  return {
    fieldRows,
    sample: arr.slice(0, sampleSize),
  }
}

const lines = []
lines.push('# Decrypted Vespa export — shape')
lines.push('')
lines.push(`Source: \`input/${path.basename(inputPath)}\``)
lines.push(`Generated: ${new Date().toISOString()}`)
lines.push('')
lines.push('## Header')
lines.push('```json')
lines.push(JSON.stringify(header, null, 2))
lines.push('```')
lines.push('')
lines.push('## Top-level structure of `data`')
lines.push('')
const dataType = Array.isArray(data) ? 'array' : typeof data
lines.push(`Type: \`${dataType}\``)
lines.push('')

if (Array.isArray(data)) {
  lines.push(`Length: ${data.length}`)
  lines.push('')
  const { fieldRows, sample } = summarizeArrayOfObjects(data, 1)
  lines.push('### Item fields (union across all items)')
  lines.push(...fieldRows)
  lines.push('')
  lines.push('### First item (sample)')
  lines.push('```json')
  lines.push(JSON.stringify(sample[0], null, 2).slice(0, 4000))
  lines.push('```')
} else if (data && typeof data === 'object') {
  lines.push('### Top-level keys')
  for (const k of Object.keys(data)) {
    const v = data[k]
    lines.push(`- \`${k}\`: ${describe(v, 0, 1)}`)
  }
  lines.push('')
  for (const k of Object.keys(data)) {
    const v = data[k]
    lines.push(`### \`${k}\``)
    if (Array.isArray(v)) {
      lines.push(`Array of ${v.length} items.`)
      lines.push('')
      if (v.length > 0 && typeof v[0] === 'object' && v[0] !== null && !Array.isArray(v[0])) {
        const { fieldRows, sample } = summarizeArrayOfObjects(v, 1)
        lines.push('Fields (union):')
        lines.push(...fieldRows)
        lines.push('')
        lines.push('Sample:')
        lines.push('```json')
        lines.push(JSON.stringify(sample[0], null, 2).slice(0, 3000))
        lines.push('```')
      } else if (v.length > 0) {
        lines.push('Sample:')
        lines.push('```json')
        lines.push(JSON.stringify(v.slice(0, 3), null, 2).slice(0, 2000))
        lines.push('```')
      }
    } else if (v && typeof v === 'object') {
      lines.push('```json')
      lines.push(JSON.stringify(v, null, 2).slice(0, 3000))
      lines.push('```')
    } else {
      lines.push(`Value: \`${JSON.stringify(v)}\``)
    }
    lines.push('')
  }
}

fs.writeFileSync(outPath, lines.join('\n') + '\n')
console.log(`Wrote ${outPath}`)

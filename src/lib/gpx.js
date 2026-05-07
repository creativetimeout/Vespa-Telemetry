// Build GPX 1.1 documents from route(s).
// A "track" maps to one route. Each route's points list is one trkseg.

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>'
const GPX_OPEN =
  '<gpx version="1.1" creator="Vespa Telemetry" xmlns="http://www.topografix.com/GPX/1/1">'
const GPX_CLOSE = '</gpx>'

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function fmtNum(n, digits = 7) {
  if (!Number.isFinite(n)) return null
  return n.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')
}

function trkpt(p) {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return ''
  const lat = fmtNum(p.lat)
  const lon = fmtNum(p.lng)
  const parts = [`<trkpt lat="${lat}" lon="${lon}">`]
  if (Number.isFinite(p.alt)) parts.push(`<ele>${fmtNum(p.alt, 2)}</ele>`)
  if (Number.isFinite(p.ts_ms)) parts.push(`<time>${new Date(p.ts_ms).toISOString()}</time>`)
  parts.push('</trkpt>')
  return parts.join('')
}

// tracks: [{ name: string, points: [{ ts_ms, lat, lng, alt }] }]
export function buildGpx(tracks, { metadataName } = {}) {
  const out = [XML_HEADER, GPX_OPEN]
  if (metadataName) {
    out.push(
      `<metadata><name>${escapeXml(metadataName)}</name><time>${new Date().toISOString()}</time></metadata>`
    )
  }
  for (const t of tracks) {
    out.push('<trk>')
    if (t.name) out.push(`<name>${escapeXml(t.name)}</name>`)
    out.push('<trkseg>')
    for (const p of t.points) {
      const x = trkpt(p)
      if (x) out.push(x)
    }
    out.push('</trkseg></trk>')
  }
  out.push(GPX_CLOSE)
  return out.join('\n')
}

export function downloadGpx(filename, gpxText) {
  const blob = new Blob([gpxText], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

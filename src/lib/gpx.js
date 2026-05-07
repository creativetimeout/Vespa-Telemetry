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

function pointXml(tag, p) {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return ''
  const lat = fmtNum(p.lat)
  const lon = fmtNum(p.lng)
  const parts = [`<${tag} lat="${lat}" lon="${lon}">`]
  if (Number.isFinite(p.alt)) parts.push(`<ele>${fmtNum(p.alt, 2)}</ele>`)
  if (Number.isFinite(p.ts_ms)) parts.push(`<time>${new Date(p.ts_ms).toISOString()}</time>`)
  if (p.name) parts.push(`<name>${escapeXml(p.name)}</name>`)
  parts.push(`</${tag}>`)
  return parts.join('')
}

function downsample(points, target) {
  if (points.length <= target) return points
  const step = Math.ceil(points.length / target)
  const out = []
  for (let i = 0; i < points.length; i += step) out.push(points[i])
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1])
  return out
}

// tracks: [{ name: string, points: [{ ts_ms, lat, lng, alt }] }]
// Emits <wpt> (start/end of each track), <rte>/<rtept> (downsampled), and
// <trk>/<trkseg>/<trkpt> (full resolution) so every flavour of GPX importer
// (myTracks, myrouteapp.com, Garmin, etc.) finds what it expects.
export function buildGpx(tracks, { metadataName } = {}) {
  const out = [XML_HEADER, GPX_OPEN]
  if (metadataName) {
    out.push(
      `<metadata><name>${escapeXml(metadataName)}</name><time>${new Date().toISOString()}</time></metadata>`
    )
  }

  // Waypoints: first + last valid point of each track.
  for (const t of tracks) {
    const valid = t.points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    if (valid.length === 0) continue
    const first = valid[0]
    const last = valid[valid.length - 1]
    const base = t.name ? escapeXml(t.name) : ''
    const wptStart = pointXml('wpt', { ...first, name: base ? `${base} – start` : 'Start' })
    if (wptStart) out.push(wptStart)
    if (last !== first) {
      const wptEnd = pointXml('wpt', { ...last, name: base ? `${base} – end` : 'End' })
      if (wptEnd) out.push(wptEnd)
    }
  }

  // Routes: downsampled (myrouteapp imports rtept as a navigable route).
  for (const t of tracks) {
    const valid = t.points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    if (valid.length === 0) continue
    out.push('<rte>')
    if (t.name) out.push(`<name>${escapeXml(t.name)}</name>`)
    for (const p of downsample(valid, 500)) {
      const x = pointXml('rtept', p)
      if (x) out.push(x)
    }
    out.push('</rte>')
  }

  // Tracks: full resolution (preferred by mapping/playback tools).
  for (const t of tracks) {
    out.push('<trk>')
    if (t.name) out.push(`<name>${escapeXml(t.name)}</name>`)
    out.push('<trkseg>')
    for (const p of t.points) {
      const x = pointXml('trkpt', p)
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

// Apple/Cocoa epoch (2001-01-01 UTC) → unix epoch in milliseconds.
const APPLE_EPOCH_OFFSET_S = 978307200

export function appleSecondsToUnixMs(appleSeconds) {
  if (!Number.isFinite(appleSeconds)) return null
  return Math.round((appleSeconds + APPLE_EPOCH_OFFSET_S) * 1000)
}

export function unixSecondsToMs(s) {
  if (!Number.isFinite(s)) return null
  return Math.round(s * 1000)
}

function parseCsv(text) {
  const lines = text.split('\n')
  let start = 0
  while (start < lines.length && lines[start].trim() === '') start++
  if (start >= lines.length) return { header: [], rows: [] }
  const header = lines[start].split(';').map((s) => s.trim())
  const rows = []
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.trim() === '') continue
    rows.push(line.split(';'))
  }
  return { header, rows }
}

function num(s) {
  if (s == null || s === '') return null
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : null
}

function bool01(s) {
  const v = num(s)
  if (v == null) return null
  return v !== 0 ? 1 : 0
}

export function parseTripGps(csv) {
  const { header, rows } = parseCsv(csv)
  // Expected: ts;lat;lng;alt
  const idx = {
    ts: header.indexOf('ts'),
    lat: header.indexOf('lat'),
    lng: header.indexOf('lng'),
    alt: header.indexOf('alt'),
  }
  return rows.map((cols, i) => ({
    seq: i,
    ts_ms: idx.ts >= 0 ? Math.round(num(cols[idx.ts]) ?? 0) : 0,
    lat: idx.lat >= 0 ? num(cols[idx.lat]) : null,
    lng: idx.lng >= 0 ? num(cols[idx.lng]) : null,
    alt: idx.alt >= 0 ? num(cols[idx.alt]) : null,
  }))
}

export function parseTripData(csv) {
  const { header, rows } = parseCsv(csv)
  const i = {
    ts: header.indexOf('ts'),
    distance: header.indexOf('distance'),
    speed: header.indexOf('speed'),
    rpm: header.indexOf('rpm'),
    consumption: header.indexOf('consumption'),
    avg_consumption: header.indexOf('avg_consumption'),
    gas: header.indexOf('gas'),
    acceleration: header.indexOf('acceleration'),
    batteryVoltage: header.indexOf('batteryVoltage'),
    EcuWarningLamp: header.indexOf('EcuWarningLamp'),
    MilLamp: header.indexOf('MilLamp'),
    EcuUrgentServiceFlag: header.indexOf('EcuUrgentServiceFlag'),
    oilAlarm: header.indexOf('oilAlarm'),
    engineTemp: header.indexOf('engineTemp'),
    wheelSlip: header.indexOf('wheelSlip'),
  }
  const get = (cols, k) => (i[k] >= 0 ? cols[i[k]] : undefined)
  return rows.map((cols, seq) => ({
    seq,
    ts_ms: Math.round(num(get(cols, 'ts')) ?? 0),
    distance_km: num(get(cols, 'distance')),
    speed_kmh: num(get(cols, 'speed')),
    rpm: num(get(cols, 'rpm')),
    consumption_kml: num(get(cols, 'consumption')),
    avg_consumption_kml: num(get(cols, 'avg_consumption')),
    throttle_pct: num(get(cols, 'gas')),
    acceleration: num(get(cols, 'acceleration')),
    battery_v: num(get(cols, 'batteryVoltage')),
    ecu_warning: bool01(get(cols, 'EcuWarningLamp')),
    mil_lamp: bool01(get(cols, 'MilLamp')),
    ecu_urgent_service: bool01(get(cols, 'EcuUrgentServiceFlag')),
    oil_alarm: bool01(get(cols, 'oilAlarm')),
    engine_temp_c: num(get(cols, 'engineTemp')),
    wheel_slip: num(get(cols, 'wheelSlip')),
  }))
}

// Build a normalized payload from the decrypted Vespa export.
export function buildImportPayload({ header, data }) {
  const tripsById = Object.fromEntries(
    (data.trips ?? []).map((t) => [t.id, t])
  )

  const vehicles = (data.vehicles ?? []).map((v) => ({
    id: v.id,
    user_id: v.userId ?? null,
    vin: v.vin ?? null,
    serial: v.serial ?? null,
    name: v.name ?? null,
    model: v.model ?? null,
    model_id: v.modelId ?? null,
    model_year: v.modelYear ?? null,
    engine_size: v.engineSize ?? null,
    total_mileage: v.totalMileage ?? null,
    battery_voltage: v.batteryVoltage ?? null,
    last_service_date_ms: unixSecondsToMs(v.lastServiceDate),
    last_service_odometer: v.lastServiceOdometer ?? null,
    latest_update_ms: unixSecondsToMs(v.latestUpdate),
    is_km: v.isKm ? 1 : 0,
    is_celsius: v.isCelsius ? 1 : 0,
    is_associated: v.isAssociated ? 1 : 0,
    image_filename: v.imageFilename ?? null,
    image_data_raw: v.imageFileData ?? null, // compressed by main thread before insert
    raw_json: JSON.stringify({ ...v, imageFileData: undefined }),
  }))

  const routes = []
  for (const a of data.activities ?? []) {
    const trip = tripsById[a.id]
    routes.push({
      id: a.id,
      vehicle_id: a.vehicleId ?? null,
      started_at_ms: appleSecondsToUnixMs(a.startTimestamp),
      ended_at_ms: appleSecondsToUnixMs(a.endTimestamp),
      duration_s: a.duration ?? null,
      distance_km: a.distance ?? null,
      liters_consumed: a.tripLitersConsumed ?? null,
      avg_consumption_kml: a.avgTripFuelConsumption ?? null,
      traction_control_counter: a.tractionControlCounter ?? null,
      raw_activity_json: JSON.stringify(a),
      points: trip ? parseTripGps(trip.tripGPS ?? '') : [],
      telemetry: trip ? parseTripData(trip.tripData ?? '') : [],
    })
  }

  return {
    user_id: header?.userId ?? null,
    vehicles,
    routes,
  }
}

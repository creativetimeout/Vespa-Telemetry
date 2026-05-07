import { openDb, tx } from '@/lib/db'
import { compressJpegBase64 } from './imageCompress'

let workerInstance = null
function getWorker() {
  if (!workerInstance) {
    workerInstance = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module',
    })
  }
  return workerInstance
}

function runWorker(fileText, onStage) {
  return new Promise((resolve, reject) => {
    const w = getWorker()
    const id = crypto.randomUUID()
    const handler = (e) => {
      if (e.data?.id !== id) return
      if (e.data.stage === 'done') {
        w.removeEventListener('message', handler)
        resolve(e.data.payload)
      } else if (e.data.stage === 'error') {
        w.removeEventListener('message', handler)
        reject(new Error(e.data.error))
      } else {
        onStage?.(e.data.stage)
      }
    }
    w.addEventListener('message', handler)
    w.postMessage({ id, fileText })
  })
}

async function compressVehicleImages(vehicles) {
  for (const v of vehicles) {
    if (v.image_data_raw) {
      v.image_data = await compressJpegBase64(v.image_data_raw, {
        maxWidth: 256,
        quality: 0.7,
      })
    } else {
      v.image_data = null
    }
    delete v.image_data_raw
  }
}

function insertImportLog(db, fileName, userId) {
  db.run(
    'INSERT INTO import_log(imported_at, file_name, user_id) VALUES (?, ?, ?)',
    [new Date().toISOString(), fileName, userId]
  )
  const res = db.exec('SELECT last_insert_rowid() AS id')
  return res[0].values[0][0]
}

function upsertVehicle(db, v) {
  db.run(
    `INSERT INTO vehicle(
       id, user_id, vin, serial, name, model, model_id, model_year, engine_size,
       total_mileage, battery_voltage, last_service_date_ms, last_service_odometer,
       latest_update_ms, is_km, is_celsius, is_associated, image_filename, image_data,
       raw_json
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       user_id=excluded.user_id,
       vin=excluded.vin, serial=excluded.serial, name=excluded.name,
       model=excluded.model, model_id=excluded.model_id, model_year=excluded.model_year,
       engine_size=excluded.engine_size, total_mileage=excluded.total_mileage,
       battery_voltage=excluded.battery_voltage,
       last_service_date_ms=excluded.last_service_date_ms,
       last_service_odometer=excluded.last_service_odometer,
       latest_update_ms=excluded.latest_update_ms,
       is_km=excluded.is_km, is_celsius=excluded.is_celsius,
       is_associated=excluded.is_associated,
       image_filename=excluded.image_filename,
       image_data=excluded.image_data,
       raw_json=excluded.raw_json`,
    [
      v.id, v.user_id, v.vin, v.serial, v.name, v.model, v.model_id, v.model_year,
      v.engine_size, v.total_mileage, v.battery_voltage, v.last_service_date_ms,
      v.last_service_odometer, v.latest_update_ms, v.is_km, v.is_celsius,
      v.is_associated, v.image_filename, v.image_data, v.raw_json,
    ]
  )
}

function insertRouteRows(db, route, sourceImportId) {
  // Try to insert the route. If it already exists (same id), skip child rows.
  const check = db.prepare('SELECT 1 FROM route WHERE id = ?')
  let exists = false
  try {
    check.bind([route.id])
    exists = check.step()
  } finally {
    check.free()
  }
  if (exists) return false

  db.run(
    `INSERT INTO route(
       id, vehicle_id, started_at_ms, ended_at_ms, duration_s, distance_km,
       liters_consumed, avg_consumption_kml, traction_control_counter,
       source_import_id, raw_activity_json
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      route.id, route.vehicle_id, route.started_at_ms, route.ended_at_ms,
      route.duration_s, route.distance_km, route.liters_consumed,
      route.avg_consumption_kml, route.traction_control_counter,
      sourceImportId, route.raw_activity_json,
    ]
  )

  if (route.points.length > 0) {
    const stmt = db.prepare(
      'INSERT INTO route_point(route_id, seq, ts_ms, lat, lng, alt) VALUES (?,?,?,?,?,?)'
    )
    try {
      for (const p of route.points) {
        stmt.run([route.id, p.seq, p.ts_ms, p.lat, p.lng, p.alt])
      }
    } finally {
      stmt.free()
    }
  }

  if (route.telemetry.length > 0) {
    const stmt = db.prepare(
      `INSERT INTO route_telemetry(
         route_id, seq, ts_ms, distance_km, speed_kmh, rpm, consumption_kml,
         avg_consumption_kml, throttle_pct, acceleration, battery_v,
         ecu_warning, mil_lamp, ecu_urgent_service, oil_alarm,
         engine_temp_c, wheel_slip
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    try {
      for (const r of route.telemetry) {
        stmt.run([
          route.id, r.seq, r.ts_ms, r.distance_km, r.speed_kmh, r.rpm,
          r.consumption_kml, r.avg_consumption_kml, r.throttle_pct,
          r.acceleration, r.battery_v, r.ecu_warning, r.mil_lamp,
          r.ecu_urgent_service, r.oil_alarm, r.engine_temp_c, r.wheel_slip,
        ])
      }
    } finally {
      stmt.free()
    }
  }

  return true
}

export async function importFile(file, { onStage } = {}) {
  await openDb()
  onStage?.('reading')
  const fileText = await file.text()

  const payload = await runWorker(fileText, onStage)

  onStage?.('compressing')
  await compressVehicleImages(payload.vehicles)

  onStage?.('inserting')
  let added = 0
  let skipped = 0
  let importId = null
  tx((db) => {
    importId = insertImportLog(db, file.name, payload.user_id)
    for (const v of payload.vehicles) upsertVehicle(db, v)
    for (const r of payload.routes) {
      if (insertRouteRows(db, r, importId)) added++
      else skipped++
    }
  })

  onStage?.('done')
  return {
    added,
    skipped,
    vehicles: payload.vehicles.length,
    importId,
    totalRoutes: payload.routes.length,
  }
}

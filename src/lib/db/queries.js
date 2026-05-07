import { all, one, run, tx } from './index'

export function getVehicles() {
  return all('SELECT * FROM vehicle ORDER BY name COLLATE NOCASE')
}

export function getVehicle(id) {
  return one('SELECT * FROM vehicle WHERE id = ?', [id])
}

export function getDays() {
  return all(
    `SELECT day, vehicle_id, routes, distance_km, duration_s, liters_consumed,
            first_start_ms, last_end_ms
     FROM day_summary
     ORDER BY day DESC`
  )
}

export function getRoutesForDay(day) {
  return all(
    `SELECT id, vehicle_id, started_at_ms, ended_at_ms, duration_s,
            distance_km, liters_consumed, avg_consumption_kml,
            traction_control_counter
     FROM route
     WHERE date(started_at_ms / 1000, 'unixepoch', 'localtime') = ?
     ORDER BY started_at_ms ASC`,
    [day]
  )
}

export function getRoute(id) {
  return one('SELECT * FROM route WHERE id = ?', [id])
}

export function getRoutePoints(routeId) {
  return all(
    'SELECT seq, ts_ms, lat, lng, alt FROM route_point WHERE route_id = ? ORDER BY seq',
    [routeId]
  )
}

export function getRouteTelemetry(routeId) {
  return all(
    `SELECT seq, ts_ms, distance_km, speed_kmh, rpm, consumption_kml,
            avg_consumption_kml, throttle_pct, acceleration, battery_v,
            ecu_warning, mil_lamp, ecu_urgent_service, oil_alarm,
            engine_temp_c, wheel_slip
     FROM route_telemetry WHERE route_id = ? ORDER BY seq`,
    [routeId]
  )
}

export function getTotals() {
  return (
    one(
      `SELECT COUNT(*) AS routes,
              COALESCE(SUM(distance_km), 0) AS distance_km,
              COALESCE(SUM(duration_s), 0)  AS duration_s,
              COALESCE(SUM(liters_consumed), 0) AS liters_consumed,
              MIN(started_at_ms) AS first_start_ms,
              MAX(ended_at_ms)   AS last_end_ms
       FROM route`
    ) ?? { routes: 0, distance_km: 0, duration_s: 0, liters_consumed: 0 }
  )
}

export function getLastImport() {
  return one(
    'SELECT id, imported_at, file_name, user_id FROM import_log ORDER BY id DESC LIMIT 1'
  )
}

// ---------- Tour collections ----------

export function getCollections() {
  return all(
    `SELECT c.id, c.name, c.notes, c.created_at_ms,
            COUNT(r.id)                          AS route_count,
            COALESCE(SUM(r.distance_km), 0)      AS total_distance_km,
            COALESCE(SUM(r.duration_s), 0)       AS total_duration_s,
            COALESCE(SUM(r.liters_consumed), 0)  AS total_liters,
            MIN(r.started_at_ms)                 AS first_start_ms,
            MAX(r.ended_at_ms)                   AS last_end_ms
       FROM tour_collection c
       LEFT JOIN tour_collection_route tcr ON tcr.collection_id = c.id
       LEFT JOIN route r ON r.id = tcr.route_id
      GROUP BY c.id
      ORDER BY c.created_at_ms DESC`
  )
}

export function getCollection(id) {
  return one(
    `SELECT c.id, c.name, c.notes, c.created_at_ms,
            COUNT(r.id)                          AS route_count,
            COALESCE(SUM(r.distance_km), 0)      AS total_distance_km,
            COALESCE(SUM(r.duration_s), 0)       AS total_duration_s,
            COALESCE(SUM(r.liters_consumed), 0)  AS total_liters,
            MIN(r.started_at_ms)                 AS first_start_ms,
            MAX(r.ended_at_ms)                   AS last_end_ms
       FROM tour_collection c
       LEFT JOIN tour_collection_route tcr ON tcr.collection_id = c.id
       LEFT JOIN route r ON r.id = tcr.route_id
      WHERE c.id = ?
      GROUP BY c.id`,
    [id]
  )
}

export function getCollectionRoutes(collectionId) {
  return all(
    `SELECT r.id, r.vehicle_id, r.started_at_ms, r.ended_at_ms, r.duration_s,
            r.distance_km, r.liters_consumed, r.avg_consumption_kml,
            r.traction_control_counter
       FROM tour_collection_route tcr
       JOIN route r ON r.id = tcr.route_id
      WHERE tcr.collection_id = ?
      ORDER BY r.started_at_ms ASC`,
    [collectionId]
  )
}

export function getCollectionsForRoute(routeId) {
  return all(
    `SELECT c.id, c.name
       FROM tour_collection c
       JOIN tour_collection_route tcr ON tcr.collection_id = c.id
      WHERE tcr.route_id = ?
      ORDER BY c.name COLLATE NOCASE`,
    [routeId]
  )
}

// ---------- Tour collection mutations ----------

export function createCollection(name, notes = null) {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  run(
    'INSERT INTO tour_collection (id, name, notes, created_at_ms) VALUES (?, ?, ?, ?)',
    [id, name, notes, Date.now()]
  )
  return id
}

export function renameCollection(id, name, notes = null) {
  run('UPDATE tour_collection SET name = ?, notes = ? WHERE id = ?', [name, notes, id])
}

export function deleteCollection(id) {
  tx((db) => {
    db.run('DELETE FROM tour_collection_route WHERE collection_id = ?', [id])
    db.run('DELETE FROM tour_collection WHERE id = ?', [id])
  })
}

export function addRouteToCollection(collectionId, routeId) {
  run(
    `INSERT INTO tour_collection_route (collection_id, route_id, added_at_ms)
     VALUES (?, ?, ?)
     ON CONFLICT(collection_id, route_id) DO NOTHING`,
    [collectionId, routeId, Date.now()]
  )
}

export function removeRouteFromCollection(collectionId, routeId) {
  run(
    'DELETE FROM tour_collection_route WHERE collection_id = ? AND route_id = ?',
    [collectionId, routeId]
  )
}

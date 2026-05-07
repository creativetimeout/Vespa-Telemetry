import { all, one } from './index'

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

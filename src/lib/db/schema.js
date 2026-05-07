// Schema migrations. Each migration is run once, in order, the first time
// its index is greater than the stored schema_version in `meta`.

const migrations = [
  // v1 — initial schema
  `
  CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE import_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    imported_at TEXT NOT NULL,
    file_name   TEXT,
    user_id     TEXT
  );

  CREATE TABLE vehicle (
    id                    TEXT PRIMARY KEY,
    user_id               TEXT,
    vin                   TEXT,
    serial                TEXT,
    name                  TEXT,
    model                 TEXT,
    model_id              TEXT,
    model_year            INTEGER,
    engine_size           INTEGER,
    total_mileage         REAL,
    battery_voltage       REAL,
    last_service_date_ms  INTEGER,
    last_service_odometer REAL,
    latest_update_ms      INTEGER,
    is_km                 INTEGER,
    is_celsius            INTEGER,
    is_associated         INTEGER,
    image_filename        TEXT,
    image_data            TEXT, -- compressed base64 JPEG
    raw_json              TEXT
  );

  CREATE TABLE route (
    id                       TEXT PRIMARY KEY,
    vehicle_id               TEXT REFERENCES vehicle(id),
    started_at_ms            INTEGER NOT NULL,
    ended_at_ms              INTEGER NOT NULL,
    duration_s               REAL,
    distance_km              REAL,
    liters_consumed          REAL,
    avg_consumption_kml      REAL,
    traction_control_counter INTEGER,
    source_import_id         INTEGER REFERENCES import_log(id),
    raw_activity_json        TEXT
  );
  CREATE INDEX idx_route_started ON route(started_at_ms);
  CREATE INDEX idx_route_vehicle ON route(vehicle_id);

  CREATE TABLE route_point (
    route_id TEXT NOT NULL REFERENCES route(id) ON DELETE CASCADE,
    seq      INTEGER NOT NULL,
    ts_ms    INTEGER NOT NULL,
    lat      REAL,
    lng      REAL,
    alt      REAL,
    PRIMARY KEY (route_id, seq)
  );

  CREATE TABLE route_telemetry (
    route_id            TEXT NOT NULL REFERENCES route(id) ON DELETE CASCADE,
    seq                 INTEGER NOT NULL,
    ts_ms               INTEGER NOT NULL,
    distance_km         REAL,
    speed_kmh           REAL,
    rpm                 REAL,
    consumption_kml     REAL,
    avg_consumption_kml REAL,
    throttle_pct        REAL,
    acceleration        REAL,
    battery_v           REAL,
    ecu_warning         INTEGER,
    mil_lamp            INTEGER,
    ecu_urgent_service  INTEGER,
    oil_alarm           INTEGER,
    engine_temp_c       REAL,
    wheel_slip          REAL,
    PRIMARY KEY (route_id, seq)
  );

  CREATE VIEW day_summary AS
  SELECT
    date(started_at_ms / 1000, 'unixepoch', 'localtime') AS day,
    vehicle_id,
    COUNT(*)              AS routes,
    SUM(distance_km)      AS distance_km,
    SUM(duration_s)       AS duration_s,
    SUM(liters_consumed)  AS liters_consumed,
    MIN(started_at_ms)    AS first_start_ms,
    MAX(ended_at_ms)      AS last_end_ms
  FROM route
  GROUP BY day, vehicle_id;
  `,
]

function getSchemaVersion(db) {
  try {
    const res = db.exec("SELECT value FROM meta WHERE key = 'schema_version'")
    if (!res.length || !res[0].values.length) return 0
    return parseInt(res[0].values[0][0], 10) || 0
  } catch {
    return 0
  }
}

function setSchemaVersion(db, version) {
  db.run(
    "INSERT INTO meta(key, value) VALUES ('schema_version', ?) " +
      'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [String(version)]
  )
}

export function runMigrations(db) {
  const current = getSchemaVersion(db)
  for (let i = current; i < migrations.length; i++) {
    db.exec('BEGIN')
    try {
      db.exec(migrations[i])
      setSchemaVersion(db, i + 1)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }
  return migrations.length
}

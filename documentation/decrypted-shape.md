# Decrypted Vespa export — shape

## File envelope (before decryption)

```
file (text) = base64( JSON.stringify({ header, payload }) )
header = { platform, brand, userId }
payload = base64( Blowfish-ECB-PKCS5( JSON.stringify(data), key=userId ) )
```

## Decrypted `data` — top-level keys

| Key                     | Type         | Notes                                         |
| ----------------------- | ------------ | --------------------------------------------- |
| `vehicles`              | `Vehicle[]`  | Usually 1                                     |
| `activities`            | `Activity[]` | Trip summaries; **linked to `trips` by `id`** |
| `trips`                 | `Trip[]`     | Raw GPS + telemetry CSV strings               |
| `userSettings`          | object       | display + sync preferences                    |
| `notificationSettings`  | object       | push prefs                                    |
| `versionInfo`           | object       | app version, platform                         |
| `userProfile`           | `{ id }`     | matches header.userId                         |
| `navigatorSavedPlace`   | `[]`         | empty in sample                               |
| `navigatorHistoryPlace` | `[]`         | empty in sample                               |
| `reminders`             | `[]`         | empty in sample                               |

## `Vehicle`

```
id: string                 // primary key
userId: string
vin: string
serial: string
name: string               // user-given name
model: string              // e.g. model name
modelId: string
modelYear: number
engineSize: number
totalMileage: number       // km (or mi if !isKm)
batteryVoltage: number
lastServiceDate: number    // unix epoch seconds
lastServiceOdometer: number
latestUpdate: number       // unix epoch seconds
isKm: boolean
isCelsius: boolean
isAssociated: boolean
imageFilename: string
imageFileData: string      // base64 JPEG, can be large
```

## `Activity` — trip summary

```
id: string                 // e.g. "trip_1778073091438" — matches a Trip.id
type: "trip"
userId: string
vehicleId: string          // → Vehicle.id
startTimestamp: number     // Apple epoch seconds (float)
endTimestamp: number       // Apple epoch seconds (float)
duration: number           // seconds (≈ end - start)
distance: number           // km (matches tripData last `distance`)
tripLitersConsumed: number
avgTripFuelConsumption: number   // km/L (or L/100km — verify)
tractionControlCounter: number
emittedCO2: number | null
totalEarnedKm: number | null
totalRecoveredEnergy: number | null
tripRecoveredEnergy: number | null
tripConsGPL: number | null         // gas-vehicles
avgTripEnergyConsumption: number | null  // electric-vehicles
avgAcceleration: number | null
```

Nullable fields suggest the schema is shared between gas and electric Vespas.

## `Trip` — raw payload (CSV-in-JSON)

```
id: string                 // matches Activity.id
tripGPS: string            // CSV with header — see below
tripData: string           // CSV with header — see below
```

### `tripGPS` columns (`;` separated)

```
ts;lat;lng;alt
```

- `ts` — unix milliseconds, written as float with `.0` (e.g. `1778069750682.0`)
- `lat`, `lng` — decimal degrees (WGS84)
- `alt` — meters

Sample row: `1778069750682.0;49.8666158776;8.35582418173;80.3`

Sampling rate ≈ 1 Hz. ~3300 rows ≈ 55 min trip in the example.

### `tripData` columns (`;` separated)

```
ts;distance;speed;rpm;consumption;avg_consumption;gas;acceleration;batteryVoltage;EcuWarningLamp;MilLamp;EcuUrgentServiceFlag;oilAlarm;engineTemp;wheelSlip
```

- `ts` — unix milliseconds (float). Slightly offset from `tripGPS.ts` (telemetry stream is independent, ~1 Hz too).
- `distance` — cumulative km from trip start
- `speed` — km/h
- `rpm` — engine RPM
- `consumption` — instantaneous (L/100km?)
- `avg_consumption` — running average
- `gas` — **throttle position 0–100%**. (Confirmed via column stats across 8 trips: avg ~11%, max 100%, 0 when stopped.)
- `acceleration` — m/s² (signed)
- `batteryVoltage` — V
- `EcuWarningLamp`, `MilLamp`, `EcuUrgentServiceFlag`, `oilAlarm` — boolean-as-0/1 flags
- `engineTemp` — °C
- `wheelSlip` — measured wheel slip intensity (0–~44 in sample). Distinct from `Activity.tractionControlCounter`, which counts actual TC interventions.

## Time encoding cheat sheet

- `Activity.startTimestamp / endTimestamp` — **Apple/Cocoa epoch** (seconds since `2001-01-01 00:00:00 UTC`). Convert: `unixSeconds = appleSeconds + 978307200`.
- `Activity.duration` — plain seconds.
- `Vehicle.lastServiceDate`, `Vehicle.latestUpdate` — **plain unix epoch seconds** (NOT Apple — confirmed via test). Multiply by 1000 for ms.
- CSV `ts` (in both `tripGPS` and `tripData`) — unix milliseconds.

## Implications for SQLite schema (Phase 2)

- `vehicle(id PK, …)` — store `imageFileData` as a separate blob/column or strip it on import (it's big).
- `route(id PK = activity.id, vehicle_id, started_at, ended_at, duration_s, distance_km, …summary fields…)` — populated from **both** `Activity` and aggregates of `Trip`.
- `route_point(route_id, seq, ts_ms, lat, lng, alt)` — parsed from `tripGPS`. Composite PK `(route_id, seq)`.
- `route_telemetry(route_id, seq, ts_ms, distance_km, speed_kmh, rpm, consumption, avg_consumption, gas, acceleration, battery_v, ecu_warning, mil, ecu_urgent_service, oil_alarm, engine_temp_c, wheel_slip)` — parsed from `tripData`.
- Dedupe on `route.id` with `INSERT OR IGNORE`.
- Day grouping: `DATE(started_at_iso, 'localtime')` from a SQL view.

## Decisions (resolved)

1. **Consumption units** — source is km/L. UI converts to L/100km: `L_per_100km = 100 / km_per_L` (guard div-by-zero). Raw km/L stays in the DB.
2. **`gas` column** — throttle position 0–100% (confirmed via column-stats across 8 trips).
3. **GPS + telemetry storage** — two separate tables (`route_point`, `route_telemetry`) joined on `(route_id, seq)`. Each keeps its own `ts`.
4. **Vehicle image** — store in SQLite, but **compress on import** to a reasonable size (target ~256 px wide JPEG, < 50 KB) before insert. Keep the original filename for reference.

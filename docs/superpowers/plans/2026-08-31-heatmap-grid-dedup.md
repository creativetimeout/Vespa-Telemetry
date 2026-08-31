# Heatmap Grid-Deduplizierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Heatmap-Seite zeigt statt roher GPS-Punktdichte eine Raster-basierte Besuchshäufigkeit pro Zelle, mit Ampel-/Stau-Deduplizierung über ein einstellbares Zeitfenster — vollständig client-seitig, ohne Backend oder externe Services.

**Architecture:** Eine neue reine Funktion `buildHeatCells()` aggregiert die vorhandenen GPS-Rohpunkte (`getAllRoutePoints()`) zu Raster-Zellen (`{ lat, lng, count }`), unter Einhaltung eines gleitenden Zeitfensters pro Route. `HeatMap.jsx` berechnet die Zellen per `useMemo` aus zwei nutzerseitig einstellbaren, in `localStorage` persistierten Parametern (Zellgröße, Zeitfenster) und reicht sie an `HeatLayer` (Kartendarstellung) und `ClickInfo` (Klick-Popup) weiter, statt der Rohpunkte.

**Tech Stack:** React 19, Vite 8, react-leaflet 5 / leaflet.heat, react-i18next, Tailwind 4, sql.js (Rohdaten-Query bleibt SQL, Aggregation ist reines JS), Vitest (neu, für Unit-Tests der Aggregationsfunktion).

**Spec:** `docs/superpowers/specs/2026-08-31-heatmap-grid-dedup-design.md`

## Global Constraints

- Keine externen Services, keine neue Backend-Komponente — alles läuft im Browser (Spec, Ziel).
- `buildHeatCells` ist eine reine Funktion ohne DOM-/localStorage-Zugriff (Spec, Architektur).
- Zeitfenster-Logik ist pro `route_id` isoliert — kein State wird zwischen Routen weitergegeben (Spec, Abschnitt "Zeitfenster-Logik").
- Zellgröße-Default: **50 m**, Optionen 15/25/50/100 m (Spec, UI-Änderungen).
- Zeitfenster-Default: **10 Minuten**, Optionen 5/10/15/30 Minuten (Spec, UI-Änderungen).
- localStorage-Keys: `vespa.heatmap.cellSizeM`, `vespa.heatmap.windowMinutes` (Spec, UI-Änderungen).
- `L.heatLayer` bekommt `count` als drittes Array-Element (Gewicht) statt der bisherigen konstanten `1` — keine eigene Normalisierungslogik (Spec, Farbskala).
- `lastCountedTsMs` einer Zelle wird nur bei einem tatsächlich **gezählten** Punkt aktualisiert, nie bei einem ignorierten (Spec, Zeitfenster-Logik).

---

## File Structure

| Datei | Aktion | Zweck |
|---|---|---|
| `src/lib/heatgrid.js` | Neu | Reine Funktion `buildHeatCells(points, opts)` — Meter-Umrechnung, Zellzuordnung, Zeitfenster-Dedup pro Route |
| `src/lib/heatgrid.test.js` | Neu | Vitest-Unittests für `buildHeatCells` |
| `src/lib/heatSettings.js` | Neu | localStorage-Persistenz für Zellgröße/Zeitfenster (Get/Set + Optionslisten), analog `src/lib/theme.js` |
| `src/lib/db/queries.js` | Ändern (Z. 76-80) | `getAllRoutePoints()` bekommt `ORDER BY route_id, seq` |
| `src/components/HeatLayer.jsx` | Ändern | Nimmt `cells` (`{lat,lng,count}[]`) statt `points` entgegen |
| `src/pages/HeatMap.jsx` | Ändern | Zwei `<select>`-Steuerelemente, `useMemo`-Aggregation, reicht `cells` an `HeatLayer`/`ClickInfo` weiter |
| `src/i18n/en.json`, `src/i18n/de.json` | Ändern | `pages.heatMap.*`-Texte auf "Besuche" umgestellt, neue Keys für Zellgröße-/Zeitfenster-Label; `pages.datenschutz.localStorage.body` erwähnt die zwei neuen Keys |
| `vite.config.js` | Ändern | `test`-Block für Vitest ergänzt |
| `package.json` | Ändern | `vitest` als devDependency, `"test"`-Script |

---

### Task 1: Vitest einrichten + erste `buildHeatCells`-Tests (Grundfälle)

**Files:**
- Create: `src/lib/heatgrid.js`
- Create: `src/lib/heatgrid.test.js`
- Modify: `vite.config.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `buildHeatCells(points, { cellSizeM, windowMs }) -> Array<{ lat, lng, count }>`, exportiert aus `src/lib/heatgrid.js`. `points` ist ein Array von `{ route_id, seq, ts_ms, lat, lng, alt }` (gleiche Form wie `getAllRoutePoints()`-Ergebnis), muss pro `route_id` aufsteigend nach `seq`/`ts_ms` sortiert übergeben werden.

- [ ] **Step 1: Vitest installieren**

```bash
npm install -D vitest
```

- [ ] **Step 2: `test`-Script in `package.json` ergänzen**

In `package.json` im `"scripts"`-Block (neben `"lint": "eslint ."`) ergänzen:

```json
"test": "vitest run"
```

- [ ] **Step 3: Vitest-Config in `vite.config.js` ergänzen**

In `vite.config.js` das `defineConfig({...})`-Objekt um einen `test`-Block erweitern (nach `build: { chunkSizeWarningLimit: 1500 },`):

```js
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
```

- [ ] **Step 4: Fehlschlagenden Test schreiben**

`src/lib/heatgrid.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildHeatCells } from './heatgrid'

const TEN_MIN_MS = 10 * 60_000

describe('buildHeatCells', () => {
  it('returns an empty array for no points', () => {
    expect(buildHeatCells([], { cellSizeM: 50, windowMs: TEN_MIN_MS })).toEqual([])
  })

  it('collapses many points at a traffic light into a single visit', () => {
    // 20 points, all within the same ~50m cell, spread across 3 minutes
    const points = Array.from({ length: 20 }, (_, i) => ({
      route_id: 1,
      seq: i,
      ts_ms: i * 9_000, // 9s apart -> spans 171s (< 3 min... adjust below)
      lat: 49.6 + i * 0.000001,
      lng: 8.6 + i * 0.000001,
      alt: 100,
    }))
    const cells = buildHeatCells(points, { cellSizeM: 50, windowMs: TEN_MIN_MS })
    expect(cells).toHaveLength(1)
    expect(cells[0].count).toBe(1)
  })

  it('counts a revisit of the same cell after the window has elapsed', () => {
    const points = [
      { route_id: 1, seq: 0, ts_ms: 0, lat: 49.6, lng: 8.6, alt: 100 },
      { route_id: 1, seq: 1, ts_ms: 15 * 60_000, lat: 49.6, lng: 8.6, alt: 100 },
    ]
    const cells = buildHeatCells(points, { cellSizeM: 50, windowMs: TEN_MIN_MS })
    expect(cells).toHaveLength(1)
    expect(cells[0].count).toBe(2)
  })
})
```

- [ ] **Step 5: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test`
Expected: FAIL — `src/lib/heatgrid.js` existiert nicht / exportiert `buildHeatCells` nicht.

- [ ] **Step 6: Minimale Implementierung schreiben**

`src/lib/heatgrid.js`:

```js
const METERS_PER_DEG_LAT = 111_320

function averageLatRad(points) {
  const sum = points.reduce((acc, p) => acc + p.lat, 0)
  return (sum / points.length) * (Math.PI / 180)
}

function metersPerDegLng(avgLatRad) {
  return METERS_PER_DEG_LAT * Math.cos(avgLatRad)
}

/**
 * Aggregates raw GPS points into a fixed-size grid, counting one "visit"
 * per cell unless the same cell was already counted within `windowMs`
 * (tracked independently per route_id).
 *
 * @param {Array<{route_id: number, seq: number, ts_ms: number, lat: number, lng: number}>} points
 *   Must be pre-sorted ascending by (route_id, seq/ts_ms).
 * @param {{cellSizeM: number, windowMs: number}} options
 * @returns {Array<{lat: number, lng: number, count: number}>}
 */
export function buildHeatCells(points, { cellSizeM, windowMs }) {
  if (!points || points.length === 0) return []

  const mPerLng = metersPerDegLng(averageLatRad(points))

  function cellIndex(p) {
    const x = p.lng * mPerLng
    const y = p.lat * METERS_PER_DEG_LAT
    return [Math.floor(x / cellSizeM), Math.floor(y / cellSizeM)]
  }

  const counts = new Map() // cellKey -> count
  const lastCountedByRoute = new Map() // route_id -> Map(cellKey -> lastTsMs)

  for (const p of points) {
    const [ix, iy] = cellIndex(p)
    const cellKey = `${ix}:${iy}`

    let lastCounted = lastCountedByRoute.get(p.route_id)
    if (!lastCounted) {
      lastCounted = new Map()
      lastCountedByRoute.set(p.route_id, lastCounted)
    }

    const last = lastCounted.get(cellKey)
    if (last === undefined || p.ts_ms - last >= windowMs) {
      counts.set(cellKey, (counts.get(cellKey) || 0) + 1)
      lastCounted.set(cellKey, p.ts_ms)
    }
  }

  return [...counts.entries()].map(([cellKey, count]) => {
    const [ix, iy] = cellKey.split(':').map(Number)
    const centerX = (ix + 0.5) * cellSizeM
    const centerY = (iy + 0.5) * cellSizeM
    return {
      lat: centerY / METERS_PER_DEG_LAT,
      lng: centerX / mPerLng,
      count,
    }
  })
}
```

- [ ] **Step 7: Test ausführen, Erfolg verifizieren**

Run: `npm run test`
Expected: PASS (3 Tests)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js src/lib/heatgrid.js src/lib/heatgrid.test.js
git commit -m "feat: add buildHeatCells grid aggregation with vitest setup"
```

---

### Task 2: `buildHeatCells` — Edge Cases (Routen-Isolation, Dauerstau, Zellgrenzen)

**Files:**
- Modify: `src/lib/heatgrid.test.js`

**Interfaces:**
- Consumes: `buildHeatCells` aus Task 1, unveränderte Signatur.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

In `src/lib/heatgrid.test.js`, innerhalb des bestehenden `describe('buildHeatCells', ...)`-Blocks ergänzen:

```js
  it('counts revisits of the same spot on different routes independently of time gap', () => {
    const points = [
      { route_id: 1, seq: 0, ts_ms: 0, lat: 49.6, lng: 8.6, alt: 100 },
      // same location, same route, only 1 minute later -> route 1 stays at count 1
      { route_id: 1, seq: 1, ts_ms: 60_000, lat: 49.6, lng: 8.6, alt: 100 },
      // different route, arbitrary timestamp gap -> counts as a separate visit
      { route_id: 2, seq: 0, ts_ms: 120_000, lat: 49.6, lng: 8.6, alt: 100 },
    ]
    const cells = buildHeatCells(points, { cellSizeM: 50, windowMs: TEN_MIN_MS })
    expect(cells).toHaveLength(1)
    expect(cells[0].count).toBe(2)
  })

  it('does not reset the window on ignored points during sustained slow traffic', () => {
    // 15 points, 1 minute apart, all in the same cell, spanning 14 minutes total.
    // If the timer reset on every point, count would stay 1 forever (each gap < 10min).
    // If it resets only on counted points, point at minute 10 should start a new visit
    // once >= windowMs has passed since the last COUNTED point (minute 0).
    const points = Array.from({ length: 15 }, (_, i) => ({
      route_id: 1,
      seq: i,
      ts_ms: i * 60_000,
      lat: 49.6,
      lng: 8.6,
      alt: 100,
    }))
    const cells = buildHeatCells(points, { cellSizeM: 50, windowMs: TEN_MIN_MS })
    expect(cells).toHaveLength(1)
    // minute 0 counted, minute 10 (10*60_000 - 0 >= 600_000) counted again
    expect(cells[0].count).toBe(2)
  })

  it('keeps points on opposite sides of a cell boundary in separate cells', () => {
    // cellSizeM = 50; construct two points ~60m apart in longitude so they
    // fall in adjacent cells at the equator-ish latitude used here.
    const points = [
      { route_id: 1, seq: 0, ts_ms: 0, lat: 49.6, lng: 8.6, alt: 100 },
      { route_id: 1, seq: 1, ts_ms: 0, lat: 49.6, lng: 8.60083, alt: 100 }, // ~60m east
    ]
    const cells = buildHeatCells(points, { cellSizeM: 50, windowMs: TEN_MIN_MS })
    expect(cells).toHaveLength(2)
    expect(cells.every((c) => c.count === 1)).toBe(true)
  })
```

- [ ] **Step 2: Tests ausführen, Fehlschlag/Erfolg verifizieren**

Run: `npm run test`
Expected: Die ersten beiden neuen Tests sollten mit der Implementierung aus Task 1 bereits PASS sein (Verhalten ist implizit durch die Map-pro-Route-Struktur bereits korrekt) — das bestätigt, dass Task 1 die Edge Cases schon richtig behandelt. Der dritte Test (Zellgrenzen) sollte ebenfalls PASS sein, da `Math.floor` benachbarte Zellen sauber trennt. Falls einer der drei fehlschlägt, in Schritt 3 beheben.

- [ ] **Step 3: Bei Fehlschlag: Implementierung korrigieren**

Falls ein Test fehlschlägt, `src/lib/heatgrid.js` entsprechend anpassen (z. B. Rundungsfehler bei der Meter-Umrechnung). Andernfalls diesen Schritt überspringen.

- [ ] **Step 4: Tests ausführen, Erfolg verifizieren**

Run: `npm run test`
Expected: PASS (6 Tests gesamt)

- [ ] **Step 5: Commit**

```bash
git add src/lib/heatgrid.test.js
git commit -m "test: cover route isolation, sustained-traffic, and cell-boundary cases"
```

---

### Task 3: `heatSettings.js` — localStorage-Persistenz für Zellgröße/Zeitfenster

**Files:**
- Create: `src/lib/heatSettings.js`
- Create: `src/lib/heatSettings.test.js`

**Interfaces:**
- Produces (für Task 5):
  - `CELL_SIZE_OPTIONS_M = [15, 25, 50, 100]`
  - `WINDOW_OPTIONS_MINUTES = [5, 10, 15, 30]`
  - `DEFAULT_CELL_SIZE_M = 50`
  - `DEFAULT_WINDOW_MINUTES = 10`
  - `getStoredCellSizeM(): number`
  - `getStoredWindowMinutes(): number`
  - `setStoredCellSizeM(value: number): void`
  - `setStoredWindowMinutes(value: number): void`

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/lib/heatSettings.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_CELL_SIZE_M,
  DEFAULT_WINDOW_MINUTES,
  getStoredCellSizeM,
  getStoredWindowMinutes,
  setStoredCellSizeM,
  setStoredWindowMinutes,
} from './heatSettings'

beforeEach(() => {
  localStorage.clear()
})

describe('heatSettings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(getStoredCellSizeM()).toBe(DEFAULT_CELL_SIZE_M)
    expect(getStoredWindowMinutes()).toBe(DEFAULT_WINDOW_MINUTES)
  })

  it('round-trips a valid stored value', () => {
    setStoredCellSizeM(25)
    setStoredWindowMinutes(30)
    expect(getStoredCellSizeM()).toBe(25)
    expect(getStoredWindowMinutes()).toBe(30)
  })

  it('falls back to the default for an out-of-range stored value', () => {
    localStorage.setItem('vespa.heatmap.cellSizeM', '9999')
    expect(getStoredCellSizeM()).toBe(DEFAULT_CELL_SIZE_M)
  })
})
```

- [ ] **Step 2: `environment: 'node'` reicht hier nicht — Vitest-Config auf `happy-dom` umstellen**

`heatSettings.test.js` braucht einen globalen `localStorage` (im `node`-Environment nicht vorhanden). `happy-dom` installieren:

```bash
npm install -D happy-dom
```

In `vite.config.js` den in Task 1 ergänzten `test`-Block anpassen:

```js
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.js'],
  },
```

(`heatgrid.test.js` aus Task 1/2 bleibt davon unberührt — reine Funktion, kein DOM-Zugriff, läuft unter `happy-dom` identisch.)

- [ ] **Step 3: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test`
Expected: FAIL — `src/lib/heatSettings.js` existiert nicht.

- [ ] **Step 4: Minimale Implementierung schreiben**

`src/lib/heatSettings.js`:

```js
const CELL_SIZE_KEY = 'vespa.heatmap.cellSizeM'
const WINDOW_KEY = 'vespa.heatmap.windowMinutes'

export const CELL_SIZE_OPTIONS_M = [15, 25, 50, 100]
export const WINDOW_OPTIONS_MINUTES = [5, 10, 15, 30]

export const DEFAULT_CELL_SIZE_M = 50
export const DEFAULT_WINDOW_MINUTES = 10

function readStored(key, fallback, allowedValues) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const n = Number(raw)
    return allowedValues.includes(n) ? n : fallback
  } catch {
    return fallback
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // localStorage unavailable (private browsing, quota) — setting is
    // simply not persisted; the in-memory React state still works.
  }
}

export function getStoredCellSizeM() {
  return readStored(CELL_SIZE_KEY, DEFAULT_CELL_SIZE_M, CELL_SIZE_OPTIONS_M)
}

export function getStoredWindowMinutes() {
  return readStored(WINDOW_KEY, DEFAULT_WINDOW_MINUTES, WINDOW_OPTIONS_MINUTES)
}

export function setStoredCellSizeM(value) {
  writeStored(CELL_SIZE_KEY, value)
}

export function setStoredWindowMinutes(value) {
  writeStored(WINDOW_KEY, value)
}
```

- [ ] **Step 5: Test ausführen, Erfolg verifizieren**

Run: `npm run test`
Expected: PASS (alle Tests aus Task 1-3, insgesamt 9)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.js src/lib/heatSettings.js src/lib/heatSettings.test.js
git commit -m "feat: persist heatmap cell size / time window to localStorage"
```

---

### Task 4: `getAllRoutePoints()` sortiert zurückgeben

**Files:**
- Modify: `src/lib/db/queries.js:76-80`

**Interfaces:**
- Consumes: nichts Neues.
- Produces: `getAllRoutePoints()` liefert weiterhin `{route_id, seq, ts_ms, lat, lng, alt}[]`, jetzt garantiert aufsteigend nach `(route_id, seq)` sortiert — Voraussetzung für die Zeitfenster-Logik in `buildHeatCells` (Task 1).

- [ ] **Step 1: Query anpassen**

In `src/lib/db/queries.js`, Zeile 76-80, `ORDER BY route_id, seq` ergänzen:

```js
export function getAllRoutePoints() {
  return all(
    'SELECT route_id, seq, ts_ms, lat, lng, alt FROM route_point WHERE lat IS NOT NULL AND lng IS NOT NULL ORDER BY route_id, seq'
  )
}
```

- [ ] **Step 2: Manuell verifizieren**

Run: `npm run dev`, Heatmap-Seite öffnen (mit vorhandenen Importdaten) — Seite muss weiterhin fehlerfrei laden und Punkte anzeigen (unverändertes Verhalten, da v1 noch nicht auf Zellen umgestellt ist). Kein automatisierter Test nötig — reine SQL-Änderung ohne Test-Infrastruktur für `queries.js` in diesem Projekt (Konsistenz mit Spec: nur `buildHeatCells` wird unittestbar gemacht).

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/queries.js
git commit -m "fix: order getAllRoutePoints by route_id, seq for stable point sequencing"
```

---

### Task 5: i18n-Texte umstellen ("Punkte" → "Besuche") + neue Labels

**Files:**
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/de.json`

**Interfaces:**
- Produces: i18n-Keys, die Task 6 konsumiert:
  - `pages.heatMap.legendFew`, `pages.heatMap.legendMany` (Text geändert)
  - `pages.heatMap.pointsNearby`, `pages.heatMap.pointsNearby_other` (Text geändert, Interpolation `{{count}}` unverändert)
  - `pages.heatMap.cellSizeLabel` (neu)
  - `pages.heatMap.windowLabel` (neu)
  - `pages.datenschutz.localStorage.body` (Text erweitert)

- [ ] **Step 1: `src/i18n/en.json` anpassen**

Im Block `pages.heatMap` (Zeilen 92-99) ersetzen durch:

```json
		"heatMap": {
			"title": "Heat Map",
			"empty": "No GPS points recorded yet.",
			"legendFew": "few visits",
			"legendMany": "many visits",
			"pointsNearby": "{{count}} visit at this spot",
			"pointsNearby_other": "{{count}} visits at this spot",
			"cellSizeLabel": "Cell size",
			"windowLabel": "Time window"
		},
```

Im Block `pages.datenschutz.localStorage.body` (Zeile 161) den Text erweitern (IndexedDB-Absatz bleibt, davor ein neuer Satz zum ersten Absatz):

Alt:
```
"body": "localStorage: the key i18nextLng stores your selected interface language. This is strictly necessary for operating the application and does not require consent (§ 25 (2) no. 2 TTDSG / § 25 (2) no. 2 TDDDG).\n\nIndexedDB: ..."
```

Neu:
```
"body": "localStorage: the key i18nextLng stores your selected interface language, and the keys vespa.heatmap.cellSizeM / vespa.heatmap.windowMinutes store your chosen Heat Map display settings. This is strictly necessary for operating the application and does not require consent (§ 25 (2) no. 2 TTDSG / § 25 (2) no. 2 TDDDG).\n\nIndexedDB: ..."
```

- [ ] **Step 2: `src/i18n/de.json` anpassen**

Im Block `pages.heatMap` ersetzen durch:

```json
		"heatMap": {
			"title": "Heatmap",
			"empty": "Noch keine GPS-Punkte erfasst.",
			"legendFew": "wenige Besuche",
			"legendMany": "viele Besuche",
			"pointsNearby": "{{count}} Besuch an dieser Stelle",
			"pointsNearby_other": "{{count}} Besuche an dieser Stelle",
			"cellSizeLabel": "Zellgröße",
			"windowLabel": "Zeitfenster"
		},
```

Im Block `pages.datenschutz.localStorage.body` analog erweitern:

Alt:
```
"body": "localStorage: Der Schlüssel i18nextLng speichert deine gewählte Oberflächensprache. Diese Speicherung ist für den Betrieb der Anwendung unbedingt erforderlich und einwilligungsfrei (§ 25 Abs. 2 Nr. 2 TTDSG / TDDDG).\n\nIndexedDB: ..."
```

Neu:
```
"body": "localStorage: Der Schlüssel i18nextLng speichert deine gewählte Oberflächensprache, die Schlüssel vespa.heatmap.cellSizeM / vespa.heatmap.windowMinutes speichern deine gewählten Heatmap-Anzeigeeinstellungen. Diese Speicherung ist für den Betrieb der Anwendung unbedingt erforderlich und einwilligungsfrei (§ 25 Abs. 2 Nr. 2 TTDSG / TDDDG).\n\nIndexedDB: ..."
```

- [ ] **Step 3: JSON-Validität prüfen**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/en.json'))" && node -e "JSON.parse(require('fs').readFileSync('src/i18n/de.json'))"`
Expected: Kein Fehler (kein Output = beide Dateien sind gültiges JSON).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.json src/i18n/de.json
git commit -m "i18n: rename heatmap copy from points to visits, document new localStorage keys"
```

---

### Task 6: `HeatLayer` auf Zellen umstellen

**Files:**
- Modify: `src/components/HeatLayer.jsx`

**Interfaces:**
- Consumes: Prop `cells: Array<{lat, lng, count}>` (von Task 1 `buildHeatCells`, verdrahtet in Task 8).
- Produces: unverändertes Rendering-Verhalten (kein Export, reine Komponente), aber `heatPoints` nutzt jetzt `c.count` statt der bisherigen Konstante `1`.

- [ ] **Step 1: Komponente anpassen**

`src/components/HeatLayer.jsx` komplett ersetzen durch:

```jsx
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

export default function HeatLayer({ cells }) {
  const map = useMap()

  useEffect(() => {
    if (!cells || cells.length === 0) return
    const heatPoints = cells.map((c) => [c.lat, c.lng, c.count])
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 20,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.2: 'green', 0.5: 'yellow', 0.8: 'orange', 1.0: 'red' },
    }).addTo(map)
    return () => map.removeLayer(heatLayer)
  }, [map, cells])

  return null
}
```

- [ ] **Step 2: Manuell verifizieren**

Diese Komponente wird erst in Task 8 wieder mit echten Daten verdrahtet (aktuell würde `HeatMap.jsx` noch `points` statt `cells` übergeben und die Karte bliebe leer). Kein eigenständiger Verifikationsschritt hier — wird in Task 8 End-to-End geprüft. Sicherstellen, dass `npm run lint` keine neuen Fehler in dieser Datei meldet:

Run: `npx eslint src/components/HeatLayer.jsx`
Expected: Keine Ausgabe (keine Lint-Fehler).

- [ ] **Step 3: Commit**

```bash
git add src/components/HeatLayer.jsx
git commit -m "refactor: HeatLayer consumes aggregated cells instead of raw points"
```

---

### Task 7: `HeatMap.jsx` — Einstellungen-UI, Aggregation, `ClickInfo` auf Zellen umstellen

**Files:**
- Modify: `src/pages/HeatMap.jsx`

**Interfaces:**
- Consumes:
  - `buildHeatCells` aus `src/lib/heatgrid.js` (Task 1)
  - `getStoredCellSizeM, getStoredWindowMinutes, setStoredCellSizeM, setStoredWindowMinutes, CELL_SIZE_OPTIONS_M, WINDOW_OPTIONS_MINUTES` aus `src/lib/heatSettings.js` (Task 3)
  - `HeatLayer` mit Prop `cells` (Task 6)
  - i18n-Keys `pages.heatMap.cellSizeLabel`, `pages.heatMap.windowLabel`, `pages.heatMap.pointsNearby[_other]` (Task 5)

- [ ] **Step 1: Datei komplett ersetzen**

`src/pages/HeatMap.jsx`:

```jsx
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Popup, useMap, useMapEvents } from 'react-leaflet'
import { useDb, useDbQuery } from '@/lib/db/DbProvider'
import { getAllRoutePoints } from '@/lib/db/queries'
import { buildHeatCells } from '@/lib/heatgrid'
import {
  CELL_SIZE_OPTIONS_M,
  WINDOW_OPTIONS_MINUTES,
  getStoredCellSizeM,
  getStoredWindowMinutes,
  setStoredCellSizeM,
  setStoredWindowMinutes,
} from '@/lib/heatSettings'
import HeatLayer from '@/components/HeatLayer'
import HeatMapLegend from '@/components/HeatMapLegend'

const CLICK_RADIUS_PX = 15

function FitAllPoints({ cells }) {
  const map = useMap()
  useEffect(() => {
    if (!cells || cells.length === 0) return
    map.fitBounds(
      cells.map((c) => [c.lat, c.lng]),
      { padding: [24, 24] }
    )
  }, [map, cells])
  return null
}

function ClickInfo({ cells }) {
  const { t } = useTranslation()
  const [popup, setPopup] = useState(null)

  const map = useMapEvents({
    click(e) {
      const clickPt = map.latLngToContainerPoint(e.latlng)
      let count = 0
      for (const c of cells) {
        const pt = map.latLngToContainerPoint([c.lat, c.lng])
        if (pt.distanceTo(clickPt) <= CLICK_RADIUS_PX) count += c.count
      }
      setPopup(count > 0 ? { latlng: e.latlng, count } : null)
    },
  })

  if (!popup) return null

  return (
    <Popup position={popup.latlng} eventHandlers={{ remove: () => setPopup(null) }}>
      {t('pages.heatMap.pointsNearby', { count: popup.count })}
    </Popup>
  )
}

export default function HeatMap() {
  const { t } = useTranslation()
  const { ready } = useDb()
  const { data: points } = useDbQuery(getAllRoutePoints)

  const [cellSizeM, setCellSizeM] = useState(() => getStoredCellSizeM())
  const [windowMinutes, setWindowMinutes] = useState(() => getStoredWindowMinutes())

  function handleCellSizeChange(e) {
    const value = Number(e.target.value)
    setCellSizeM(value)
    setStoredCellSizeM(value)
  }

  function handleWindowChange(e) {
    const value = Number(e.target.value)
    setWindowMinutes(value)
    setStoredWindowMinutes(value)
  }

  const cells = useMemo(() => {
    if (!points || points.length === 0) return []
    return buildHeatCells(points, { cellSizeM, windowMs: windowMinutes * 60_000 })
  }, [points, cellSizeM, windowMinutes])

  const hasCells = useMemo(() => cells && cells.length > 0, [cells])

  if (!ready) return null

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('pages.heatMap.title')}</h1>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">{t('pages.heatMap.cellSizeLabel')}</span>
          <select
            value={cellSizeM}
            onChange={handleCellSizeChange}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {CELL_SIZE_OPTIONS_M.map((v) => (
              <option key={v} value={v}>
                {v} m
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">{t('pages.heatMap.windowLabel')}</span>
          <select
            value={windowMinutes}
            onChange={handleWindowChange}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {WINDOW_OPTIONS_MINUTES.map((v) => (
              <option key={v} value={v}>
                {v} min
              </option>
            ))}
          </select>
        </label>
      </div>
      {!hasCells ? (
        <p className="text-slate-500">{t('pages.heatMap.empty')}</p>
      ) : (
        <div
          className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
          style={{ height: 600 }}
        >
          <MapContainer center={[0, 0]} zoom={2} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HeatLayer cells={cells} />
            <ClickInfo cells={cells} />
            <FitAllPoints cells={cells} />
          </MapContainer>
          <HeatMapLegend />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Lint prüfen**

Run: `npx eslint src/pages/HeatMap.jsx`
Expected: Keine Ausgabe (keine Lint-Fehler).

- [ ] **Step 3: Manuell im Browser verifizieren**

Run: `npm run dev`, HeatMap-Seite (`/heat-map`, sofern Importdaten vorhanden) öffnen:
- Karte zeigt weiterhin eine Heatmap.
- Beide `<select>`-Steuerelemente sind sichtbar mit Defaults 50 m / 10 min (bei erstem Aufruf ohne gespeicherte Werte).
- Ändern eines Wertes lässt die Karte neu aggregieren (visuell ggf. subtile Änderung, je nach Datensatz).
- Reload der Seite: gewählte Werte bleiben erhalten (aus `localStorage`).
- Klick auf einen farbigen Bereich zeigt ein Popup mit Besuchsanzahl-Text (z. B. "3 Besuche an dieser Stelle").
- Sprachumschaltung (Settings → Language) zeigt die übersetzten Label/Popup-Texte korrekt in beiden Sprachen.

- [ ] **Step 4: Commit**

```bash
git add src/pages/HeatMap.jsx
git commit -m "feat: wire heatmap cell size / time window controls into HeatMap page"
```

---

### Task 8: Gesamten Testlauf + Build verifizieren

**Files:**
- Keine Änderungen — reiner Verifikationsschritt.

- [ ] **Step 1: Alle Unit-Tests ausführen**

Run: `npm run test`
Expected: PASS, alle Tests aus Task 1-3 (insgesamt 9 Tests).

- [ ] **Step 2: Lint über das gesamte Projekt**

Run: `npm run lint`
Expected: Keine neuen Fehler (bestehende, unveränderte Dateien dürfen keine neuen Warnungen durch diese Änderung bekommen).

- [ ] **Step 3: Produktionsbuild**

Run: `npm run build`
Expected: Build erfolgreich, keine Fehler (insbesondere kein Bruch durch die neuen i18n-Keys oder den neuen `test`-Block in `vite.config.js`).

- [ ] **Step 4: Commit (falls durch die Schritte oben noch Änderungen entstanden sind)**

Falls Schritt 1-3 keine Code-Änderungen erforderten, keinen Commit nötig — dieser Task dient nur der Verifikation.

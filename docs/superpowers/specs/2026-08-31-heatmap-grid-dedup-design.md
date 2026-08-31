# Heatmap: Grid-/Quadranten-Näherung mit zeitlicher Deduplizierung

Status: approved, ready for implementation planning
Bezug: Nextcloud Deck Board "Vespa Telemetry", Karte 436 ("Heat Map: Straßenabschnitt-genaues
Map-Matching"), Option 4.

## Problem

Die bestehende Heatmap (v1, `src/pages/HeatMap.jsx` + `src/components/HeatLayer.jsx`) speist
`leaflet.heat` direkt mit allen rohen GPS-Punkten aus `getAllRoutePoints()`. Das führt zu zwei
Verzerrungen:

1. Ampeln, Staus und langsamer Verkehr erzeugen viele GPS-Punkte am selben Fleck und lassen
   diese Stellen fälschlich "heißer" erscheinen als tatsächlich stark befahrene, aber zügig
   durchfahrene Strecken.
2. Echtes Map-Matching auf Straßensegmente (Optionen 1–3 in Karte 436) würde entweder GPS-Traces
   an einen externen Dienst schicken (Datenschutz-Bruch mit der bisher rein lokalen Architektur)
   oder eine neue Backend-Komponente erfordern (architektonischer Sprung für eine App, die aktuell
   komplett client-seitig ist).

## Ziel

Eine rein client-seitige Näherung, die deutlich aussagekräftiger ist als v1, ohne externe
Services oder Backend: die Karte wird in ein festes Meter-Raster unterteilt; GPS-Punkte werden
Zellen zugeordnet; mehrfache Punkte derselben Zelle innerhalb eines Zeitfensters (z. B. durch
Stillstand) zählen nur als ein "Besuch". Die Heatmap-Farbe basiert auf der Besuchshäufigkeit pro
Zelle statt auf roher Punktdichte.

## Nicht-Ziele

- Kein echtes Map-Matching auf Straßensegmente (bleibt Gegenstand der Optionen 1–3 in Karte 436,
  falls später doch benötigt).
- Keine Filterung nach Zeitraum/Fahrzeug (separate mögliche Folge-Story).

## Architektur

### Ort der Berechnung

Reine JS-Funktion, kein SQL-Aggregat, kein Backend. Neues Modul `src/lib/heatgrid.js`:

```
buildHeatCells(points, { cellSizeM, windowMs }) -> Array<{ lat, lng, count }>
```

`points` ist das unveränderte Ergebnis von `getAllRoutePoints()` (Felder `route_id`, `seq`,
`ts_ms`, `lat`, `lng`, `alt`). `HeatMap.jsx` ruft `buildHeatCells` per `useMemo` auf (abhängig
von `points`, `cellSizeM`, `windowMs`) und reicht das Ergebnis an `HeatLayer` und `ClickInfo`
weiter, statt der Rohpunkte.

**Query-Änderung:** `getAllRoutePoints()` in `src/lib/db/queries.js` muss `ORDER BY route_id, seq`
ergänzen — die aktuelle Query garantiert keine Reihenfolge, die Zeitfenster-Logik braucht aber
eine pro Route aufsteigend sortierte Punktfolge.

### Rasterkoordinaten

Äquirechteck-Näherung (Lat/Lng → Meter), referenziert auf den **Durchschnitts-Breitengrad aller
Punkte** (einmalig berechnet, nicht pro Punkt):

```
metersPerDegLat = 111_320
metersPerDegLng = 111_320 * cos(avgLatRad)
x = lng * metersPerDegLng
y = lat * metersPerDegLat
ix = floor(x / cellSizeM)
iy = floor(y / cellSizeM)
cellKey = `${ix}:${iy}`
```

Für die regionale Ausdehnung der App (Motorradtouren, keine interkontinentalen Sprünge) ist ein
einzelner Referenzbreitengrad für den gesamten Datensatz ausreichend genau. Bekannte Grenze: bei
Datensätzen mit sehr großer Nord-Süd-Ausdehnung würde die Zellbreite (Ost-West) an den Rändern
leicht verzerrt — für dieses Projekt nicht relevant.

Der für die Heat-Layer-Position verwendete Punkt ist der **Zellmittelpunkt** (aus `ix, iy`
zurückgerechnet in Lat/Lng), nicht der Ersteintrittspunkt der Zelle.

### Zeitfenster-Logik (gleitend, pro Route)

Punkte werden nach `route_id` gruppiert; die Zeitfenster-Logik läuft **pro Route unabhängig**
(kein Zustand wird zwischen Routen weitergegeben) — eine Wiederbefahrung derselben Stelle an
einem anderen Tag/einer anderen Fahrt zählt immer als eigener Besuch, unabhängig vom zeitlichen
Abstand zur vorigen Fahrt.

Innerhalb einer Route: `Map<cellKey, lastCountedTsMs>`.

```
für jeden Punkt p (aufsteigend nach seq/ts_ms) einer Route:
  cellKey = cellFor(p)
  last = lastCountedTsMs.get(cellKey)
  wenn last == undefined ODER p.ts_ms - last >= windowMs:
    cellCounts[cellKey] += 1
    lastCountedTsMs.set(cellKey, p.ts_ms)
  sonst:
    // Punkt wird ignoriert; lastCountedTsMs bleibt unverändert
```

Wichtig: `lastCountedTsMs` wird nur bei einem **gezählten** Punkt aktualisiert, nicht bei einem
ignorierten. Sonst würde durchgehend langsamer Verkehr (viele Punkte, aber nie ≥ windowMs
Abstand) das Fenster ständig neu starten und nie einen zweiten Besuch zulassen — was korrekt so
gewollt ist (ein langer Stau an einer Stelle bleibt ein Besuch), aber die Implementierung muss
das absichtlich so behandeln und nicht aus Versehen den Timer bei jedem Punkt zurücksetzen.

### Farbskala

`L.heatLayer` normalisiert Gewichte bereits intern relativ zum Maximum aller übergebenen Punkte
(kein `max`-Override nötig). Es reicht, `count` statt der bisherigen konstanten `1` als drittes
Element in den Punkt-Arrays zu übergeben:

```js
const heatPoints = cells.map((c) => [c.lat, c.lng, c.count])
```

Damit ist die Kalibrierung "rot = meistbesuchte Zelle(n) im aktuellen Datensatz" praktisch
kostenlos vorhanden — keine zusätzliche Normalisierungslogik nötig.

## UI-Änderungen

### Einstellungen: Zellgröße & Zeitfenster

Zwei Steuerelemente oberhalb der Karte in `HeatMap.jsx`:

- **Zellgröße** — Dropdown/Slider, Optionen 15 / 25 / 50 / 100 m, Default **50 m**.
- **Zeitfenster** — Dropdown/Slider, Optionen 5 / 10 / 15 / 30 Minuten, Default **10 Minuten**.

Änderungen lösen ein Neu-Aggregieren via `useMemo` aus — keine DB-Anfrage, reine
JS-Neuberechnung auf den bereits geladenen Punkten.

**Persistenz:** Werte werden in `localStorage` gespeichert, analog zu `src/lib/theme.js`:

- Key `vespa.heatmap.cellSizeM`
- Key `vespa.heatmap.windowMinutes`

Beim Laden der Seite werden gespeicherte Werte übernommen, falls vorhanden, sonst die Defaults.

### Klick-Popup (`ClickInfo`)

Bekommt die aggregierten Zellen (`{ lat, lng, count }`) statt der Rohpunkte übergeben. Der
Klick-Radius bleibt pixelbasiert wie bisher (`CLICK_RADIUS_PX = 15`), trifft jetzt aber auf
Zellmittelpunkte statt Rohpunkte — bei Klick wird der `count`-Wert der am nächsten getroffenen
Zelle(n) angezeigt (Summe, falls mehrere Zellen im Radius liegen, analog zur bisherigen Logik,
die auch mehrere Punkte summierte).

### Legende & i18n

Bestehende Keys in `src/i18n/de.json` / `en.json` unter `pages.heatMap` werden von "Punkte" auf
"Besuche" umformuliert:

| Key | Alt (de) | Neu (de) |
|---|---|---|
| `legendFew` | "wenige Punkte" | "wenige Besuche" |
| `legendMany` | "viele Punkte" | "viele Besuche" |
| `pointsNearby` / `pointsNearby_other` | "{{count}} GPS-Punkt(e) in der Nähe" | "{{count}} Besuch(e) an dieser Stelle" |

Analoge Anpassung der `en.json`-Pendants. Neue i18n-Keys für die beiden Slider-Labels
(Zellgröße/Zeitfenster) werden ergänzt.

## Testing

Das Projekt hat aktuell kein Test-Framework. Für dieses Feature wird **Vitest** neu eingeführt
(passt zum bestehenden Vite-Setup, minimaler Zusatzaufwand: 1 Dev-Dependency + `npm run test`
Script).

`buildHeatCells` ist eine reine Funktion und wird direkt unittestbar gemacht
(`src/lib/heatgrid.test.js`). Mindestens abzudeckende Fälle:

- Ampel-Stopp: 20 Punkte derselben Zelle innerhalb von 3 Minuten → `count = 1`.
- Erneuter Besuch derselben Zelle nach 15 Minuten (bei 10-Minuten-Fenster) → `count = 2`.
- Zwei unterschiedliche Routen an derselben Stelle, beliebiger zeitlicher Abstand → `count = 2`
  (Fenster wird pro Route zurückgesetzt).
- Durchgehend langsamer Verkehr über > windowMs mit stets < windowMs Abstand zwischen
  aufeinanderfolgenden Punkten → bleibt bei `count = 1` (Timer wird nicht bei ignorierten Punkten
  zurückgesetzt).
- Punkte exakt auf einer Zellgrenze (Rundungsverhalten von `floor`).
- Leerer Punkte-Array → leeres Ergebnis, keine Exceptions.

UI-seitig (Slider-Interaktion, Popup, Legende) wird manuell im Browser verifiziert (kein
Component-Test-Aufwand für dieses Feature vorgesehen).

## Offene Punkte für die Implementierungsplanung

Keine — alle Designentscheidungen sind im Dialog getroffen. Details zu genauen UI-Komponenten
(z. B. `<select>` vs. Custom-Slider-Komponente) und der exakten Dateistruktur werden im
Implementierungsplan (writing-plans) festgelegt.

# Vespa Telemetry

Visualize routes, daily aggregates, and telemetry data from your Vespa app export — entirely in your browser.

## What it does

- **Drag-and-drop import** of the encrypted JSON export from the Vespa iOS app (`Vespa_*.json`).
- **Daily aggregation** — a recent-days list with totals (distance, duration, fuel).
- **Route map** with all polylines for a day (Leaflet + OpenStreetMap), color-coded.
- **Telemetry charts** — speed, elevation, RPM, throttle, engine temperature, battery — per route or for a whole day, with visible breaks between trips.
- **GPX export** — single route or whole-day, openable in Garmin BaseCamp, gpx.studio, Google Earth, etc.
- **Vespa metadata** — model, VIN, mileage, last service.
- **DE / EN UI** with a one-click language toggle.

## Privacy

Everything runs **client-side**. Your export is decrypted in a Web Worker, normalized into a SQLite database (sql.js, WebAssembly), and persisted to your browser's **IndexedDB**. Nothing is uploaded, no backend exists. You can download the raw `.sqlite` for backup at any time from Settings → Database.

## How to use it

1. In the Vespa iOS app, export your data — you'll get a file named like `Vespa_<id>.json`.
2. Open the app (locally for now: `http://localhost:5173/` after `npm run dev`).
3. Drop the JSON onto the **Import** page (or click to pick).
4. Browse days from the dashboard, drill into routes, export GPX as needed.

Re-importing the same export is safe — routes are deduplicated by id (you'll see "0 added, N skipped").

## Run locally

Requires **Node ≥ 20.19** (or ≥ 22.12).

```sh
npm install
npm run dev      # http://localhost:5173/
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | react-router-dom v7 |
| Map | Leaflet + react-leaflet |
| Charts | Recharts |
| Storage | sql.js (WASM SQLite) persisted to IndexedDB |
| Decryption | egoroof-blowfish (Blowfish ECB / PKCS5) |
| i18n | react-i18next |
| Imports | Web Worker for decrypt + parse |

## Project layout

```
src/
  pages/         Dashboard, Import, Day, Route, Vespa, Settings
  components/    Header, MapView, TelemetryCharts
  lib/
    db/          sql.js setup, schema migrations, IndexedDB persistence, queries
    import/      decrypt → normalize → bulk insert pipeline (incl. Web Worker)
    gpx.js       GPX 1.1 writer
    format.js    km/L ↔ L/100km, locale-aware formatters
  i18n/          en.json, de.json
documentation/   decrypted-shape.md, inputfile.md
input/           example export
```

## Data format

The export envelope and decrypted schema (vehicle, activity, trip, GPS / telemetry CSVs) are documented in [`documentation/decrypted-shape.md`](documentation/decrypted-shape.md). The decryption recipe is in [`documentation/inputfile.md`](documentation/inputfile.md).

## Status

Personal project, MVP complete. Issues and PRs welcome.

## License

MIT — see [`LICENSE`](LICENSE).

## Author

Built by Jens Vossen — [Creative Timeout](https://creativetimeout.de).

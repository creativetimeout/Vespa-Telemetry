# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev       # dev server at http://localhost:5173/
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

Requires Node ≥ 20.19 (or ≥ 22.12).

## Architecture

### Data flow

1. **Import** — user drops a `Vespa_*.json` file on the Import page. A Web Worker (`src/lib/import/worker.js`) decrypts it (Blowfish ECB/PKCS5 via `egoroof-blowfish`) and calls `buildImportPayload` to normalize it.
2. **Storage** — normalized data is inserted into an in-memory SQLite database (`sql.js` / WASM) via `src/lib/db/index.js`, then debounce-persisted to **IndexedDB** (`src/lib/db/persist.js`). On reload, the DB bytes are rehydrated from IndexedDB.
3. **Schema migrations** — `src/lib/db/schema.js` holds an ordered `migrations[]` array. Each entry is plain SQL. The version is stored in the `meta` table; `runMigrations` applies any un-run entries on every `openDb()` call.
4. **DB access in React** — `DbProvider` / `useDb` / `useDbQuery` (in `src/lib/db/DbProvider.jsx`) expose a `version` counter that bumps after writes, causing `useDbQuery` hooks to re-run their sync query functions.

### Key modules

| Path | Role |
|---|---|
| `src/lib/db/` | sql.js setup, schema, IndexedDB persistence, query helpers (`all`, `one`, `run`, `tx`) |
| `src/lib/import/` | decrypt → normalize → bulk-insert pipeline + Web Worker |
| `src/lib/format.js` | Locale-aware formatters. **Source data is km/L; UI always displays L/100km.** |
| `src/lib/gpx.js` | GPX 1.1 writer for single-route and whole-day export |
| `src/lib/theme.js` | Dark/light theme management |
| `src/i18n/` | react-i18next string bundles (en/de). Legal pages use `*.local.json` overrides (gitignored). |
| `src/components/` | Sidebar, MapView (Leaflet), TelemetryCharts (Recharts), shared UI |
| `src/pages/` | One file per route: Dashboard, Import, Day, Route, Vespa, Tours, TourDetail, Settings, Impressum, Datenschutz |

### Routing

`App.jsx` mounts all routes. Most pages are `lazy()`-loaded. Path structure: `/` dashboard, `/day/:date`, `/route/:id`, `/tour/:id`, `/tours`, `/vespa`, `/import`, `/settings`.

### Path alias

`@` maps to `./src` (configured in `vite.config.js`).

### i18n

UI strings: `src/i18n/en.json` and `src/i18n/de.json`. Legal pages (`Impressum`, `Datenschutz`) use `legal.{en,de}.json` as templates with `[PLACEHOLDER]` values and `legal.{en,de}.local.json` as gitignored private overrides that are deep-merged at startup via `import.meta.glob`.

### Consumption units

The raw database stores consumption as **km/L** (`avg_consumption_kml`, `consumption_kml`). All UI display must convert to **L/100km** using `kmplToLper100km` / `formatLper100km` from `src/lib/format.js`.

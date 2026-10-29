# Dar es Salaam 3D Map

An interactive 3D city map focused on central Dar es Salaam. Explore extruded CBD buildings, inspect building-height provenance, adjust the map's lighting and style, and follow a five-stop story tour from the city centre to the harbour.

## Run locally

Requirements: Node.js and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Use the map controls to zoom, rotate, and tilt the map. Select a story stop to move the camera, or click a building to view its name when available, height, and height source. The interface adapts to desktop and smaller screens. The OpenFreeMap basemap does not require an API key.

Create a production build with:

```sh
npm run build
```

## Map data

The app ships processed OpenStreetMap data for CBD building footprints and named places. Building heights use an OSM `height` tag when present, otherwise `building:levels` multiplied by 3.2 m, or a deterministic type-based estimate. The app labels the source and distinguishes estimates; these values should not be treated as surveyed measurements. The current dataset contains 16,686 building footprints. Five have explicit OSM height tags.

The five-stop story tour covers Askari Monument, Clock Tower, Kariakoo Market, Kivukoni Fish Market, and Kigamboni Ferry. Each story links to its source. The map does not show live transit or ferry operations.

## Rebuild the CBD data

After installing dependencies, fetch and process the CBD data:

```sh
npm run data:build:cbd
```

The fetch script caches the Overpass response in `data/raw/`; it reuses that cache unless refreshed. The processor writes generated intermediates to `data/processed/` and the app's processed datasets to `public/data/`. Raw responses and generated intermediates are gitignored. A fresh fetch reflects the current Overpass data, so source changes can change the generated files. To regenerate from an existing cached response, run `npm run data:process:cbd`. To refresh the response, run:

```sh
npm run data:fetch:cbd -- --force
npm run data:process:cbd
```

Optional, cited, hand-verified landmark height overrides can be supplied in `data/landmarks.json`. Do not put downloaded raw data in `public/` or commit files from `data/raw/`.

## Attribution and sources

The basemap is provided by [OpenFreeMap](https://openfreemap.org/) and uses OpenStreetMap-derived data. The map displays attribution to [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright). OSM data is available under the Open Database License (ODbL). See [Data sources and provenance](docs/data-sources.md) for the CBD query, processing details, height coverage, and source records.

## Stack

- React, TypeScript, and Vite
- MapLibre GL JS and Three.js
- OpenFreeMap Bright style

Dependency versions are pinned in `package.json` and `package-lock.json`.

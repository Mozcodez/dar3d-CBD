# AGENTS.md: Dar es Salaam 3D Map

## Mission
Build an interactive 3D map of Dar es Salaam with extruded buildings, running in the browser. Start with ONE district, get it polished, then expand. Realistic feel matters more than perfect accuracy, but never present guessed data as measured data.

## Phases
1. **First deliverable (do all of this in one go)**: scaffold, basemap, CBD
   building data, heights, and extruded 3D buildings visible at pitch 60.
   Don't stop at an empty map.
2. Polish: colors, landmarks, search/fly-to, mobile layout.
3. Overlays: one useful layer.
4. Scale: more districts via PMTiles.
5. Optional three.js layer, then ship.

## Stack
- React + Vite + TypeScript, MapLibre GL JS (via `react-map-gl/maplibre` or direct), optional three.js
- Data tools: osmium-tool, GDAL (`ogr2ogr`), tippecanoe, PMTiles CLI, Node scripts in `/scripts`
- Optional backend for overlays and venue data: Supabase
- Hosting: static deploy (Vercel or similar)

## Repo layout
```
/src            app code (components, map/, layers/, hooks/)
/public/data    small static data (landmarks.json, overlays)
/data/raw       downloaded source files (gitignored)
/data/processed generated GeoJSON/PMTiles (gitignored if large)
/scripts        data pipeline scripts, each runnable with `node` or `npm run`
/docs           data sources, decisions, licenses
```

## Rules
- **Data honesty**: every height is tagged with its source: `osm` (from tags), `landmark` (hand-verified), or `estimated`. Never claim estimated heights are real. Show this in the UI or README.
- **Licensing**: all OSM-derived data requires visible attribution "© OpenStreetMap contributors" (ODbL). Check the license of any other dataset (Microsoft/Google building footprints, flood data) before using it and record it in `/docs/data-sources.md`.
- **Don't create one mesh per building.** Use MapLibre `fill-extrusion`, vector tiles, merged geometry, or instancing.
- **Work district by district.** Don't download or render the whole city until the pipeline is proven.
- **No secrets in the repo.** API keys go in `.env` (gitignored); provide `.env.example`.
- **Pin dependency versions** and check the installed MapLibre/three.js version before using API examples from memory; both change.
- **Ask before** large downloads (>200 MB), paid services, or adding heavy dependencies.
- **Verify, don't assume**: check live URLs, dataset coverage, and tag names by running a small query first. Print counts (e.g. "1,842 buildings, 61% have height data").
- Keep commits small, one concern each. Write scripts so they can be re-run safely (idempotent).

## Definition of done (per phase)
- Builds with no TypeScript or console errors
- Runs smoothly on a mid-range phone (aim 50+ fps while panning in the target district)
- Attribution visible, data sources documented
- README section updated with how to reproduce the data

## Skills available (in `.claude/skills/`)
| Skill | Use when |
|---|---|
| osm-data-acquisition | fetching and cleaning building footprints |
| building-height-heuristics | assigning heights and landmark overrides |
| tile-pipeline | converting GeoJSON to PMTiles/vector tiles |
| maplibre-3d-scene | building the map, extrusion, camera, styling, React integration |
| threejs-custom-layer | adding three.js content on top of the map |
| data-overlays | flood zones, routes, venues, Supabase-backed layers |
| perf-qa-deploy | profiling, testing, deployment |

Read the relevant skill before starting related work.

## Communication
Report progress briefly: what changed, how to run it, what's next, and any decision needed from the owner. Flag data gaps and assumptions explicitly.

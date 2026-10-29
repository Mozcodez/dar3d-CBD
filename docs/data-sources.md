# Data sources and provenance

## Current basemap

- **Provider:** [OpenFreeMap](https://openfreemap.org/), Bright style at `https://tiles.openfreemap.org/styles/bright`.
- **Underlying data:** OpenStreetMap-derived map tiles. The style credits OpenMapTiles and OpenStreetMap; the UI also presents a direct OpenStreetMap copyright link.
- **License/attribution:** OpenStreetMap data is available under the Open Database License (ODbL). Preserve attribution to © OpenStreetMap contributors.
- **Usage:** Basemap display only. No local copy of the provider's tile data is included in this repository.

## CBD buildings

- **Source:** OpenStreetMap via the [Overpass API](https://overpass-api.de/api/interpreter).
- **Retrieved:** 2026-10-29.
- **Bounding box (south, west, north, east):** `-6.835,39.265,-6.800,39.300`.
- **Query scope:** OSM ways and relations tagged `building` that intersect the CBD bounding box; Overpass returned complete member geometries for conversion.
- **License:** ODbL. Preserve visible attribution to © OpenStreetMap contributors.
- **Raw OSM building ways/relations:** 17,002.
- **Cleaned building footprints:** 16,686 Polygon/MultiPolygon features. No missing building geometry; 316 slivers under 5 m² were dropped; no duplicate OSM IDs.
- **Output:** `public/data/cbd-buildings.geojson` for the map; reproducible intermediate `data/processed/cbd-buildings.geojson` and raw response `data/raw/cbd-buildings.osm.json` are gitignored.
- **Reproduce:** `npm run data:fetch:cbd` (uses existing raw cache unless `--force`) followed by `npm run data:process:cbd`.

### Height provenance

Every feature has numeric `height`, numeric `min_height`, `height_source`, and `height_source_detail` properties. No landmarks have a verified override yet.

| Height source | Count | Share | Method |
|---|---:|---:|---|
| Explicit OSM `height` | 5 | 0.03% | Valid OSM height tag (metres or feet converted to metres) |
| OSM `building:levels` | 10,852 | 65.04% | OSM level count × 3.2 m; OSM-sourced but not a field-measured height |
| Type-based estimate | 5,829 | 34.93% | Deterministic range by `building=*` type, seeded by OSM ID |
| **Total** | **16,686** | **100%** | |

The `height_source` value is `osm` for explicit height and level-derived values, `estimated` for type-based values, and `landmark` only when a cited hand-verified override exists. The map differentiates estimated buildings with a desaturated palette, reports the level conversion in the coverage panel, and shows each building's provenance when clicked. Estimates must never be described as measured.

## Water mask and rendering

The first custom sea polygon was removed after its hand-closed endpoint edges incorrectly covered harbour land and the Kigamboni shore. Fetching an expanded Overpass coastline bbox was not available in the build environment, so the project uses Plan B: OpenFreeMap's own water polygons as the mask. This retains the basemap shoreline topology and avoids constructing a straight-edged water polygon. Append `?oceanOutline=1` to the app URL to draw the native water polygon boundaries in red for visual inspection. The water is phase-tinted (including twilight and night) in both quality tiers; the custom animated shader is not active.

The OSM building-centroid-in-custom-ocean-polygon check is not applicable because the custom ocean polygon was removed. Performance auto quality is now based on sustained MapLibre render FPS rather than forcing Low from CPU thread count or device pixel ratio alone. `?debug` keeps the FPS sampler visible. A feature-isolated FPS benchmark and visual screenshot review still require an enabled browser session; don't infer numeric per-feature FPS costs from the code alone.

### Cleaning and coverage report

Converted Overpass JSON with the pinned `osmtogeojson` package, kept only building Polygon/MultiPolygon features, removed sub-5 m² slivers, retained useful OSM tags, and assigned deterministic heights. The top `building=*` values are `yes` (5,950), `residential` (5,049), `commercial;residential` (2,241), `commercial` (1,702), and `public` (436). See `public/data/cbd-buildings-summary.json` for the complete generated breakdown.

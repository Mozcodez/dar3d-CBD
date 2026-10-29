---
name: osm-data-acquisition
description: Fetch, filter and clean OpenStreetMap building footprints for Dar es Salaam districts (CBD, Kariakoo, Masaki, etc.). Use whenever the task involves getting building data, Overpass queries, Geofabrik extracts, bounding boxes, converting OSM to GeoJSON, or checking data coverage, even if the user just says "get the buildings".
---

# OSM data acquisition

## Choose the method
- **Small area (one district)**: Overpass API. Fast, no big download.
- **Large area / repeatable**: Geofabrik Tanzania extract (`https://download.geofabrik.de/africa/tanzania.html`), then clip with `osmium extract -b W,S,E,N` and export with `osmium export -f geojson`.

## Bounding boxes (starting points, verify visually, format S,W,N,E for Overpass)
- CBD / Kivukoni: approx `-6.835,39.265,-6.800,39.300`
- Kariakoo: approx `-6.825,39.265,-6.812,39.285`
- Masaki/Oyster Bay: approx `-6.790,39.260,-6.760,39.295`
Check each bbox on the map before relying on it. Record the final bbox in `/docs/data-sources.md`.

## Overpass query
```
[out:json][timeout:90];
(
  way["building"](S,W,N,E);
  relation["building"](S,W,N,E);
);
out body; >; out skel qt;
```
Endpoint: `https://overpass-api.de/api/interpreter` (POST, `data=` form field). Convert with `osmtogeojson` (npm). Be polite: one query at a time, cache results in `/data/raw`, never re-fetch if the file exists unless `--force`.

## Cleaning steps
1. Keep only Polygon/MultiPolygon features.
2. Keep useful properties only: `building`, `height`, `building:levels`, `name`, `amenity`, `tourism`, `addr:*`, `@id`. Drop the rest to shrink files.
3. Fix invalid geometries (`ogr2ogr -makevalid`). Drop empty ones.
4. Remove duplicates and tiny slivers (area under ~5 m²).
5. Print a coverage report: total count, % with `height`, % with `building:levels`, top `building=*` values.

## Fallback datasets
If OSM coverage in an area is poor, consider Microsoft Building Footprints or Google Open Buildings. Both lack heights. Check licenses and dedupe against OSM before merging. Ask the owner first.

## Output
`/data/processed/<district>-buildings.geojson` plus a short coverage summary printed and saved to `/docs/data-sources.md`.

---
name: tile-pipeline
description: Convert processed building GeoJSON into vector tiles or PMTiles for fast loading and scaling to many districts or the whole city. Use when file sizes get large, the map stutters, the user wants city-wide data, or mentions tippecanoe, PMTiles, MBTiles or vector tiles.
---

# Tile pipeline

## When to use
- One district under ~20 MB GeoJSON: load directly as a GeoJSON source. Don't over-engineer.
- Multiple districts or city-wide: generate **PMTiles** (single static file, no tile server, works on static hosting).

## Steps
1. Input: `/data/processed/*.geojson` with `height`, `min_height`, `height_source`, `name`.
2. Build tiles (confirm flags with `tippecanoe --help` for the installed version):
```
tippecanoe -o data/processed/dar-buildings.pmtiles \
  -l buildings -Z 12 -z 16 \
  --drop-densest-as-needed --extend-zooms-if-still-dropping \
  data/processed/*.geojson
```
Don't drop the attributes needed for extrusion.
3. Inspect with `pmtiles show dar-buildings.pmtiles`, then load in the map and check building counts at zoom 15 to 16.
4. Serve: put the `.pmtiles` file in `/public` or object storage with HTTP range request support. Register the protocol:
```ts
import { Protocol } from 'pmtiles';
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);
// source: { type: 'vector', url: 'pmtiles:///data/dar-buildings.pmtiles' }
```
5. Use the layer name `buildings` consistently as `source-layer`.

## Tips
- Buildings only need to appear from about zoom 14 to 15; hide them below that.
- Keep attribute names short and stable.
- Record the exact command in `/scripts/build-tiles.sh` so the build is reproducible.

---
name: maplibre-3d-scene
description: Build the interactive 3D map with MapLibre GL JS in React/Vite: basemap, fill-extrusion buildings, camera pitch/bearing, colors by height or type, landmark highlighting, fly-to search, attribution, and mobile controls. Use for any map-rendering, styling or interaction work.
---

# MapLibre 3D scene

## Setup
- Install `maplibre-gl` (optionally `react-map-gl` via its `react-map-gl/maplibre` entry). Import `maplibre-gl/dist/maplibre-gl.css`.
- Basemap: use a free, key-less style (e.g. OpenFreeMap or self-hosted Protomaps/PMTiles). Verify the style URL works before committing. No paid keys in the repo.
- Initial CBD view: center about `[39.28, -6.818]`, zoom about 15.5, pitch 60, bearing -20. Adjust visually.
- One map component; layer definitions in `/src/layers/*.ts` as plain objects.

## Extruded buildings
```ts
map.addLayer({
  id: 'buildings-3d',
  type: 'fill-extrusion',
  source: 'buildings',            // geojson or vector source
  // 'source-layer': 'buildings', // if vector tiles
  minzoom: 14,
  paint: {
    'fill-extrusion-height': ['get', 'height'],
    'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
    'fill-extrusion-color': [
      'interpolate', ['linear'], ['get', 'height'],
      3, '#d8cfc0', 12, '#c9b79c', 30, '#8f9db5', 80, '#5b6b8c'
    ],
    'fill-extrusion-opacity': 0.92
  }
});
```
- Show data quality visually: estimated heights slightly desaturated, landmarks highlighted (`['match', ['get','height_source'], ...]`).
- Add a legend and an "estimated heights" notice.

## Interaction
- Click/hover a building: popup with name, height, `height_source`.
- Search box with `map.flyTo` to landmarks (keep pitch).
- NavigationControl with pitch visualization, reset north/tilt button, touch-friendly gestures.
- Optional day/night toggle via colors and background; avoid heavy lighting tricks.

## Must-haves
- Visible attribution including "© OpenStreetMap contributors".
- Graceful message if WebGL fails.
- `map.remove()` on unmount.
- Responsive full-height layout with collapsible panels on small screens.

---
name: threejs-custom-layer
description: Add three.js content (stylized buildings, glowing landmarks, animated vehicles, shaders, 3D models) on top of the MapLibre map using a custom layer, or build a standalone three.js city scene. Use when the user wants effects that fill-extrusion cannot do, or mentions three.js, shaders, glTF models, or React Three Fiber in this project.
---

# three.js custom layer

## Decide first
Use plain `fill-extrusion` for normal buildings. Reach for three.js only for:
- a handful of detailed landmark models (glTF)
- animated objects (buses, boats, pulses)
- custom shaders (glow, water, flood plane)
Don't recreate all buildings in three.js unless the owner wants a fully stylized scene (then use merged geometry or instancing).

## MapLibre custom layer pattern
- Implement `CustomLayerInterface` (`type: 'custom'`, `renderingMode: '3d'`, `onAdd`, `render`).
- Share the map's WebGL context: `new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl })`, `renderer.autoClear = false`, and call `renderer.resetState()` before `renderer.render(...)`.
- Place objects with `maplibregl.MercatorCoordinate.fromLngLat([lng, lat], altitude)` and scale with `meterInMercatorCoordinateUnits()`.
- Build the projection from the matrix MapLibre passes to `render`. **The `render` signature differs across MapLibre versions** (newer ones pass an options object). Check the installed version's docs and types first.
- Call `map.triggerRepaint()` only while something animates.

## Standalone scene (alternative)
Convert lat/lng to local meters around a district origin (equirectangular is fine for a few km), build footprints into `THREE.Shape`, use `ExtrudeGeometry`, merge by material with `BufferGeometryUtils.mergeGeometries`, or use `InstancedMesh` for repeated shapes. Add `OrbitControls`, hemisphere + directional light, and fog.

## Models and assets
- glTF/GLB only, Draco or Meshopt compressed, each landmark under ~1 MB.
- Credit and license every model in `/docs/data-sources.md`.

## Pitfalls
- Z-fighting and depth conflicts between map and three.js layers.
- Context state leaking: always `resetState()`.
- Dispose geometries, materials and textures on removal.

---
name: building-height-heuristics
description: Assign realistic heights to building footprints that lack height data, and manage landmark overrides. Use whenever extruding buildings, setting height/min_height, handling building:levels, or when the map looks flat, uniform or unrealistic.
---

# Building height heuristics

## Priority order (first match wins)
1. `landmark`: hand-verified height from `/public/data/landmarks.json`, matched by OSM id or name.
2. `osm` (tag `height`): parse values like `"12"`, `"12 m"`, `"12.5"`. Reject nonsense (under 2 or over 300).
3. `osm` (tag `building:levels`): `levels * 3.2` m.
4. `estimated`: by `building=*` type, with deterministic variation (seed from the OSM id).

## Default estimates (tune after looking at the map)
| building value | base height (m) |
|---|---|
| house, residential, detached, hut, shed | 3.5 to 5 |
| apartments | 12 to 20 |
| commercial, retail, office | 10 to 24 |
| industrial, warehouse | 6 to 9 |
| church, mosque, school | 6 to 10 |
| yes (unknown) | 4 to 8 |
Denser central areas (CBD, Kariakoo) should skew taller than outskirts.

## Rules
- Always write `height`, `min_height` (0 unless tagged), and `height_source` (`landmark|osm|estimated`).
- Estimates must be **deterministic**: hash the OSM id to a value in [0,1]; never `Math.random()`.
- Landmarks: keep a small JSON list (name, osm id or lat/lng, height, source URL). Only add heights you can cite. Mark unknown ones as estimated.
- Visually QA: render, look for floating or absurd buildings, adjust the table. Log what changed.

## Sketch
```js
const h = (f) => {
  const p = f.properties;
  if (landmarks[p['@id']]) return [landmarks[p['@id']].height, 'landmark'];
  const t = parseFloat(p.height);
  if (t >= 2 && t <= 300) return [t, 'osm'];
  const lv = parseFloat(p['building:levels']);
  if (lv > 0 && lv < 100) return [lv * 3.2, 'osm'];
  return [estimate(p.building, seed(p['@id'])), 'estimated'];
};
```

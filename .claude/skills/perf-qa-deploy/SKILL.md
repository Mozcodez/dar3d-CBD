---
name: perf-qa-deploy
description: Profile performance, test, and deploy the 3D map. Use when the map is slow or janky on phones, before releasing, when setting up hosting (Vercel/static), or when writing the README and final checks.
---

# Performance, QA and deployment

## Performance budget
- Initial JS under ~500 KB gzipped (MapLibre is large; lazy-load three.js and overlays).
- First meaningful map render under ~3 s on a mid-range phone with 4G.
- Panning ~50+ fps in the target district.
- Data per district: GeoJSON under ~20 MB, otherwise PMTiles.

## Profiling checklist
1. Chrome DevTools Performance panel plus an FPS meter on desktop and a real phone.
2. Check feature counts and oversized properties in tiles.
3. Reduce extrusion cost: hide below zoom 14, simplify geometries, drop unused attributes.
4. Lazy-load three.js code, models and overlay data.
5. Check memory after toggling layers (dispose three.js objects).

## QA checklist
- Latest Chrome, Safari (iOS) and Firefox; touch gestures OK.
- WebGL-unavailable fallback works.
- Attribution visible; data sources page complete.
- No console errors; `tsc --noEmit` and lint pass.
- Search/fly-to, popups, layer toggles, reset-view all tested.
- Heights labeled by source; "estimated" disclosure present.

## Deploy
- `npm run build`, deploy `dist/` (Vercel, Netlify or Cloudflare Pages).
- Large `.pmtiles`: host on object storage with HTTP range requests and CORS; don't commit big binaries.
- Env vars via the host dashboard; keep `.env.example` current.
- Add og-image and meta tags so shared links look good.

## README must include
What it is, screenshots/GIF, how to run, how data is built (commands), data sources and licenses, known limitations (height estimates), roadmap.

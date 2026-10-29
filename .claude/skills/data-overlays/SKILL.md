---
name: data-overlays
description: Add useful data layers to the Dar es Salaam 3D map, such as flood-prone areas, bus (DART/daladala) routes, event venues, or IoT sensor markers, optionally backed by Supabase. Use when adding anything beyond the base buildings, or when connecting live or user-managed data.
---

# Data overlays

## Pick one overlay at a time
1. **Flood-prone areas**: look for flood-risk or Ramani Huria datasets (community flood mapping in Dar). Verify availability, format and license before building. If none is usable, say so and propose an alternative.
2. **Bus routes**: check OSM `route=bus` relations and any public GTFS feed for Dar es Salaam. Render as lines, stops as circles.
3. **Event venues**: a table of venues (name, lat/lng, capacity, photos, link) in Supabase or JSON; clicking flies to the venue and shows details.
4. **IoT markers**: sensor readings via Supabase Realtime, shown as markers or color-coded buildings.

## Implementation rules
- Each overlay lives in `/src/layers/<name>.ts` with `add(map)`, `remove(map)` and a UI toggle.
- Static data in `/public/data/*.geojson`; dynamic data through Supabase with row-level security. Never expose service keys; use the anon key plus RLS.
- Keep overlays readable over extruded buildings (`line-width` interpolation, symbol layers with halos).
- Document for every overlay: source, date retrieved, license, limitations.
- Show a "data may be incomplete" note where coverage is uncertain.

## Supabase table sketch (venues)
`venues(id uuid pk, name text, lat double precision, lng double precision, capacity int, description text, photo_url text, created_at timestamptz default now())` with a public read policy and an authenticated write policy.

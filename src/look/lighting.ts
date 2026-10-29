import { cbdBuildingLayerId } from '../layers/cbd-buildings';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { LookState } from './state';
import { phasePalette, themes } from './themes';
import { getSunPosition } from './sun';

type PaintValue = string | number | boolean | unknown[] | null | undefined;
const originals = new WeakMap<MapLibreMap, Map<string, Record<string, PaintValue>>>();
const originalLayouts = new WeakMap<MapLibreMap, Map<string, Record<string, PaintValue>>>();

function preserve(map: MapLibreMap, id: string, key: string) {
  let layerValues = originals.get(map);
  if (!layerValues) { layerValues = new Map(); originals.set(map, layerValues); }
  const layer = map.getLayer(id);
  if (!layer) return;
  const values = layerValues.get(id) ?? {};
  if (!(key in values)) values[key] = map.getPaintProperty(id, key as never) as PaintValue;
  layerValues.set(id, values);
}

function restore(map: MapLibreMap) {
  for (const [id, values] of originals.get(map) ?? []) {
    for (const [key, value] of Object.entries(values)) {
      try { map.setPaintProperty(id, key as never, value as never); } catch { /* Style layers can be replaced while loading. */ }
    }
  }
  for (const [id, values] of originalLayouts.get(map) ?? []) {
    for (const [key, value] of Object.entries(values)) {
      try { map.setLayoutProperty(id, key as never, value as never); } catch { /* Style layers can be replaced while loading. */ }
    }
  }
}

function preserveLayout(map: MapLibreMap, id: string, key: string) {
  let layoutValues = originalLayouts.get(map);
  if (!layoutValues) { layoutValues = new Map(); originalLayouts.set(map, layoutValues); }
  const values = layoutValues.get(id) ?? {};
  if (!(key in values)) values[key] = map.getLayoutProperty(id, key as never) as PaintValue;
  layoutValues.set(id, values);
}

function buildingColors(theme: typeof themes.clay, night: number) {
  const base = theme.id === 'clay'
    ? ['interpolate', ['linear'], ['get', 'height'], 3, theme.buildingLow, 80, theme.buildingHigh]
    : ['interpolate', ['linear'], ['get', 'height'], 3, theme.buildingLow, 80, theme.buildingHigh];
  const withEstimate = ['match', ['get', 'height_source'], 'estimated', theme.estimated, 'landmark', theme.accent, base];
  if (night < 0.08) return withEstimate;
  return ['case', ['<', ['get', 'lit_rank'], 0.06 + 0.42 * night],
    ['interpolate', ['linear'], ['get', 'height'], 3, '#ffd27a', 80, '#ff9d42'], withEstimate];
}

export function applyLook(map: MapLibreMap, state: LookState) {
  if (!map.isStyleLoaded()) return;
  restore(map);
  const theme = themes[state.theme];
  const sun = getSunPosition(state.time);
  const palette = phasePalette(theme, sun.altitudeDeg);
  const preserveClayPaint = state.theme === 'clay' && sun.altitudeDeg >= 10;

  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    if (id.startsWith('debug-ocean-outline-')) continue;
    const sourceLayer = ('source-layer' in layer ? layer['source-layer'] : '')?.toLowerCase() ?? '';
    if (layer.id === cbdBuildingLayerId) {
      try {
        map.setPaintProperty(layer.id, 'fill-extrusion-color', buildingColors(theme, sun.nightFactor) as never);
        map.setPaintProperty(layer.id, 'fill-extrusion-opacity', theme.buildingOpacity);
      } catch { /* Layer may not have been added yet. */ }
      continue;
    }
    if (layer.type === 'fill-extrusion' && /(building|3d)/.test(`${id} ${sourceLayer}`)) {
      try { preserveLayout(map, layer.id, 'visibility'); map.setLayoutProperty(layer.id, 'visibility', 'none'); } catch { /* Optional basemap layer. */ }
      continue;
    }
    if (preserveClayPaint) continue;

    const isWater = /(water|waterway|ocean|sea|river|lake|harbour)/.test(`${id} ${sourceLayer}`);
    const isLand = /(park|landuse|landcover|land-use)/.test(`${id} ${sourceLayer}`);
    const isRoad = /(road|street|transport|bridge|tunnel|highway)/.test(`${id} ${sourceLayer}`);
    const isLabel = layer.type === 'symbol';
    if (layer.type === 'background' || (layer.type === 'fill' && (isWater || isLand)) || (layer.type === 'line' && (isRoad || isWater)) || isLabel) {
      const key = layer.type === 'background' ? 'background-color'
        : layer.type === 'line' ? 'line-color'
          : isLabel ? 'text-color' : 'fill-color';
      const color = layer.type === 'background' ? palette.background
        : isWater ? palette.water : isLand ? palette.land : isRoad ? palette.road : palette.label;
      try {
        preserve(map, layer.id, key);
        map.setPaintProperty(layer.id, key as never, color as never);
        if (isLabel) {
          const haloKey = 'text-halo-color';
          preserve(map, layer.id, haloKey);
          map.setPaintProperty(layer.id, haloKey, theme.darkUi ? '#102030' : '#f7f4ec');
        }
      } catch { /* Some symbol layers do not define every paint property. */ }
    }
  }

  const polar = Math.max(5, Math.min(88, 90 - sun.altitudeDeg));
  const lightColor = sun.phase === 'golden' ? '#ffb36b' : sun.nightFactor > 0.5 ? '#8ba5d0' : '#f5f4e9';
  const intensity = sun.nightFactor > 0.8 ? 0.18 : sun.phase === 'golden' ? 0.7 : 0.9;
  try { map.setLight({ anchor: 'map', position: [1.5, sun.azimuthDeg, polar], color: lightColor, intensity }); } catch { /* Older style implementations may omit light controls. */ }
  try {
    map.setSky({ 'sky-color': palette.sky, 'horizon-color': palette.horizon, 'fog-color': palette.fog,
      'fog-ground-blend': 0.35, 'horizon-fog-blend': 0.25, 'sky-horizon-blend': 0.4, 'atmosphere-blend': 0.45 });
  } catch { document.documentElement.style.setProperty('--sky-fog', palette.sky); }
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.style.setProperty('--look-bg', palette.background);
  document.documentElement.style.setProperty('--look-accent', theme.accent);
}

export { getSunPosition };

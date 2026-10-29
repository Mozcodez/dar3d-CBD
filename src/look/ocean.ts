import type { LineLayerSpecification, Map as MapLibreMap } from 'maplibre-gl';
import type { LookState, Quality } from './state';
import { getSunPosition } from './sun';
import { themes } from './themes';

const originalWater = new WeakMap<MapLibreMap, Map<string, unknown>>();
const isWaterLayer = (layer: { id: string; type: string; 'source-layer'?: string }) =>
  /(water|waterway|ocean|sea|river|lake|harbour)/i.test(layer.id + ' ' + (layer['source-layer'] ?? ''));

function blend(from: string, to: string, amount: number) {
  const a = from.match(/[\da-f]{2}/gi)!.map((v) => parseInt(v, 16));
  const b = to.match(/[\da-f]{2}/gi)!.map((v) => parseInt(v, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, '0')).join('');
}

function waterColor(base: string, altitude: number, theme: LookState['theme'], followTime: boolean) {
  if (!followTime) return base;
  const twilight = Math.max(0, Math.min(1, (10 - altitude) / 16));
  const darkness = Math.max(0, Math.min(1, (-altitude - 5) / 13));
  const dusk = theme === 'neon' ? '#433354' : theme === 'blueprint' ? '#42556c' : '#735966';
  const night = theme === 'neon' ? '#060711' : theme === 'blueprint' ? '#07172a' : '#122238';
  return blend(blend(base, dusk, twilight), night, darkness);
}

function addOutlineOverlay(map: MapLibreMap) {
  if (!new URLSearchParams(window.location.search).has('oceanOutline')) return;
  const style = map.getStyle();
  const beforeId = style.layers.find((layer) => layer.type === 'symbol')?.id;
  let number = 0;
  for (const layer of style.layers) {
    if (layer.type !== 'fill' || !isWaterLayer(layer) || !layer.source) continue;
    const source = map.getStyle().sources[layer.source];
    if (!source || source.type !== 'vector') continue;
    const line: LineLayerSpecification = {
      id: 'debug-ocean-outline-' + number++, type: 'line', source: layer.source,
      ...(layer['source-layer'] ? { 'source-layer': layer['source-layer'] } : {}),
      ...(layer.filter ? { filter: layer.filter } : {}),
      ...(layer.minzoom !== undefined ? { minzoom: layer.minzoom } : {}),
      ...(layer.maxzoom !== undefined ? { maxzoom: layer.maxzoom } : {}),
      paint: { 'line-color': '#ff1010', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.25, 13, 2.5], 'line-opacity': 0.96 },
    };
    map.addLayer(line, beforeId);
  }
  // Zoom out enough to include the central harbour, CBD coastline and Kigamboni shore.
  map.fitBounds([[39.20, -6.91], [39.37, -6.77]], { padding: 38, maxZoom: 11.2, duration: 0 });
}

/** Plan B: the basemap's own water polygons provide the accurate shoreline mask. */
export function installOcean(map: MapLibreMap) {
  addOutlineOverlay(map);
  let original = originalWater.get(map);
  if (!original) { original = new Map(); originalWater.set(map, original); }
  const layers = map.getStyle().layers.filter((layer) => isWaterLayer(layer) && (layer.type === 'fill' || layer.type === 'line'));
  for (const layer of layers) {
    const key = layer.type === 'fill' ? 'fill-color' : 'line-color';
    if (!original.has(layer.id)) original.set(layer.id, map.getPaintProperty(layer.id, key as never));
  }
  return (state: LookState, _tier: Quality) => {
    const altitude = getSunPosition(state.time).altitudeDeg;
    const theme = themes[state.theme];
    for (const layer of layers) {
      if (!map.getLayer(layer.id)) continue;
      const key = layer.type === 'fill' ? 'fill-color' : 'line-color';
      const originalColor = original!.get(layer.id);
      const clayDay = state.theme === 'clay' && altitude >= 10;
      const color = clayDay ? originalColor
        : state.seaOn ? waterColor(theme.water, altitude, state.theme, true) : theme.water;
      try { map.setPaintProperty(layer.id, key as never, color as never); } catch { /* A style may replace a layer during a reload. */ }
    }
  };
}

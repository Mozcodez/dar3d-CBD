import type { FeatureCollection } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { cbdBuildingLayerId } from '../layers/cbd-buildings';
import { getSunPosition } from './sun';
import type { LookState } from './state';

const sourceId = 'cbd-shadows';
const layerId = 'cbd-ground-shadows';

export function installShadows(map: MapLibreMap) {
  map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } as FeatureCollection });
  map.addLayer({ id: layerId, type: 'fill', source: sourceId, minzoom: 14,
    paint: { 'fill-color': '#263749', 'fill-opacity': 0.22 } }, cbdBuildingLayerId);
  const worker = new Worker(new URL('./shadow-worker.ts', import.meta.url), { type: 'module' });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest: LookState | undefined;
  let workerBusy = false;
  let requestPending = false;
  let lastSent = 0;
  const redraw = () => {
    if (!latest || latest.quality === 'low') return;
    const sun = getSunPosition(latest.time);
    const opacity = sun.altitudeDeg <= 0 ? 0 : Math.max(0, Math.min(0.28, sun.altitudeDeg / 30 * 0.28));
    map.setPaintProperty(layerId, 'fill-opacity', opacity);
    if (sun.altitudeDeg <= 0 || !map.getLayer(cbdBuildingLayerId) || map.getZoom() < 14) return;
    if (workerBusy || performance.now() - lastSent < 350) { requestPending = true; return; }
    const features = map.queryRenderedFeatures({ layers: [cbdBuildingLayerId] });
    const selected = features.sort((a, b) => Number(b.properties?.height ?? 0) - Number(a.properties?.height ?? 0)).slice(0, 400);
    workerBusy = true;
    lastSent = performance.now();
    requestPending = false;
    worker.postMessage({ features: selected.map((feature) => feature.toJSON()), altitudeDeg: sun.altitudeDeg, azimuthDeg: sun.azimuthDeg });
  };
  const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(redraw, 100); };
  worker.onmessage = (event: MessageEvent<{ type: string; data: FeatureCollection }>) => {
    const source = map.getSource(sourceId);
    if (event.data.type === 'shadows' && source) (source as GeoJSONSource).setData(event.data.data);
    workerBusy = false;
    if (requestPending) schedule();
  };
  map.on('moveend', schedule);
  return {
    update(state: LookState) {
      latest = state;
      const visible = state.quality !== 'low' && getSunPosition(state.time).altitudeDeg > 0;
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      schedule();
    },
    remove() { if (timer) clearTimeout(timer); map.off('moveend', schedule); worker.terminate(); },
  };
}

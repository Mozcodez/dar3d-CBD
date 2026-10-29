import type { FeatureCollection, Point } from 'geojson';
import type { Map as MapLibreMap } from 'maplibre-gl';

const sourceId = 'cbd-named-places';
const haloId = 'cbd-landmark-glow';
const pointId = 'cbd-landmark-points';

export function installNightLights(map: MapLibreMap, data: FeatureCollection<Point>) {
  map.addSource(sourceId, { type: 'geojson', data });
  map.addLayer({ id: haloId, type: 'circle', source: sourceId, minzoom: 13,
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 9, 17, 20], 'circle-blur': 0.92,
      'circle-color': '#ffb347', 'circle-opacity': 0, 'circle-stroke-opacity': 0 } });
  map.addLayer({ id: pointId, type: 'circle', source: sourceId, minzoom: 14,
    paint: { 'circle-radius': 3.5, 'circle-color': '#ffd27a', 'circle-opacity': 0, 'circle-stroke-width': 1,
      'circle-stroke-color': '#fff0bf', 'circle-stroke-opacity': 0 } });
  return (nightFactor: number, theme: 'clay' | 'blueprint' | 'neon') => {
    const opacity = Math.max(0, Math.min(0.75, (nightFactor - 0.12) * 0.95));
    const color = theme === 'neon' ? '#ff82d7' : theme === 'blueprint' ? '#ffd988' : '#ffb347';
    map.setPaintProperty(haloId, 'circle-opacity', opacity);
    map.setPaintProperty(haloId, 'circle-color', color);
    map.setPaintProperty(pointId, 'circle-opacity', Math.min(1, opacity + 0.12));
    map.setPaintProperty(pointId, 'circle-color', color);
    map.setPaintProperty(pointId, 'circle-stroke-opacity', opacity * 0.75);
  };
}

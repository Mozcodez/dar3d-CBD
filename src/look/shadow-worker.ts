interface RingFeature {
  geometry?: { type?: string; coordinates?: number[][][] | number[][][][] };
  properties?: { height?: number };
}

function convexHull(points: [number, number][]): [number, number][] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const point of sorted) { while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, point) <= 0) lower.pop(); lower.push(point); }
  const upper: [number, number][] = [];
  for (const point of [...sorted].reverse()) { while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, point) <= 0) upper.pop(); upper.push(point); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

self.onmessage = (event: MessageEvent<{ features: RingFeature[]; altitudeDeg: number; azimuthDeg: number }>) => {
  const { features, altitudeDeg, azimuthDeg } = event.data;
  if (altitudeDeg <= 0) { self.postMessage({ type: 'shadows', data: { type: 'FeatureCollection', features: [] } }); return; }
  const altitude = Math.max(2, altitudeDeg) * Math.PI / 180;
  const direction = (azimuthDeg + 180) * Math.PI / 180;
  const cosLatitude = Math.cos(-6.818 * Math.PI / 180);
  const shadows = [];
  for (const feature of features) {
    const geometry = feature.geometry;
    const polygon = geometry?.type === 'Polygon' ? geometry.coordinates as number[][][] : (geometry?.coordinates as number[][][][] | undefined)?.[0];
    const ring = polygon?.[0];
    if (!ring || ring.length < 4) continue;
    const height = Number(feature.properties?.height ?? 0);
    if (height < 6) continue;
    const distance = Math.min(150, height / Math.tan(altitude));
    const dLng = Math.sin(direction) * distance / (111320 * cosLatitude);
    const dLat = Math.cos(direction) * distance / 110600;
    const source = ring.slice(0, -1).map((point) => [point[0], point[1]] as [number, number]);
    const hull = convexHull(source.concat(source.map(([lng, lat]) => [lng + dLng, lat + dLat])));
    if (hull.length < 3) continue;
    hull.push(hull[0]);
    shadows.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [hull] } });
  }
  self.postMessage({ type: 'shadows', data: { type: 'FeatureCollection', features: shadows } });
};

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import osmtogeojson from 'osmtogeojson';

const inputPath = 'data/raw/cbd-buildings.osm.json';
const outputPath = 'data/processed/cbd-buildings.geojson';
const publicOutputPath = 'public/data/cbd-buildings.geojson';
const summaryPath = 'public/data/cbd-buildings-summary.json';
const placesPath = 'public/data/cbd-landmarks.geojson';
const bbox = [-6.835, 39.265, -6.8, 39.3];
const minAreaM2 = 5;

const rawText = (await readFile(inputPath, 'utf8')).replace(/^\uFEFF/, '');
const osm = JSON.parse(rawText);
if (!Array.isArray(osm.elements)) throw new Error('Raw response is not an Overpass JSON document.');

let landmarkList = [];
try {
  landmarkList = JSON.parse(await readFile('data/landmarks.json', 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const landmarksById = new Map(landmarkList.filter((item) => item.osm_id).map((item) => [String(item.osm_id), item]));
const landmarksByName = new Map();
for (const item of landmarkList.filter((entry) => entry.name && entry.osm_id)) {
  const name = item.name.trim().toLowerCase();
  if (!landmarksByName.has(name)) landmarksByName.set(name, []);
  landmarksByName.get(name).push(item);
}

function parseMeters(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*(m|meters?|ft|feet|')?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] ?? 'm').toLowerCase();
  return unit === 'ft' || unit === 'feet' || unit === "'" ? amount * 0.3048 : amount;
}

function areaOfRing(ring, latitude) {
  const lonScale = 111320 * Math.cos((latitude * Math.PI) / 180);
  let twiceArea = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [lonA, latA] = ring[i];
    const [lonB, latB] = ring[i + 1];
    twiceArea += lonA * lonScale * latB * 111320 - lonB * lonScale * latA * 111320;
  }
  return Math.abs(twiceArea) / 2;
}

function polygonArea(polygon) {
  const latitude = polygon[0]?.[0]?.[1] ?? -6.82;
  return polygon.reduce((total, ring, index) => total + (index === 0 ? 1 : -1) * areaOfRing(ring, latitude), 0);
}

function geometryAreaM2(geometry) {
  if (geometry.type === 'Polygon') return polygonArea(geometry.coordinates);
  return geometry.coordinates.reduce((total, polygon) => total + polygonArea(polygon), 0);
}

function deterministicUnit(seed) {
  let hash = 2166136261;
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function litRankFor(seed) {
  return Math.round(deterministicUnit(`night-light:${seed}`) * 10000) / 10000;
}

function estimatedHeight(building, seed) {
  const type = String(building ?? 'yes').toLowerCase();
  const types = type.split(';').map((part) => part.trim());
  const has = (...values) => values.some((value) => types.includes(value));
  const range = has('commercial', 'retail', 'office') ? [10, 24]
    : type === 'apartments' ? [12, 20]
      : has('house', 'residential', 'detached', 'hut', 'shed') ? [3.5, 5]
        : has('industrial', 'warehouse') ? [6, 9]
          : has('church', 'mosque', 'school') ? [6, 10]
            : has('hospital', 'university', 'college', 'public', 'hotel', 'transportation', 'train_station') ? [8, 18]
              : has('kiosk', 'toilets', 'guardhouse', 'carport', 'roof', 'boathouse') ? [3, 6]
            : type === 'yes' ? [4, 8] : [5, 12];
  const cbdSkew = has('house', 'residential', 'detached', 'hut', 'shed') ? 0 : 1.4;
  return Math.round((range[0] + deterministicUnit(seed) * (range[1] - range[0]) + cbdSkew) * 10) / 10;
}

function landmarkFor(properties, osmId) {
  const numericId = String(osmId).split('/').at(-1);
  const byId = landmarksById.get(numericId);
  if (byId) return byId;
  const name = typeof properties.name === 'string' ? properties.name.trim().toLowerCase() : '';
  const candidates = name ? landmarksByName.get(name) ?? [] : [];
  return candidates.length === 1 ? candidates[0] : null;
}

function heightFor(properties, osmId) {
  const landmark = landmarkFor(properties, osmId);
  if (landmark && Number.isFinite(Number(landmark.height)) && landmark.source_url) {
    return { height: Number(landmark.height), height_source: 'landmark', height_source_detail: `verified landmark (${landmark.source_url})` };
  }

  const taggedHeight = parseMeters(properties.height);
  if (taggedHeight >= 2 && taggedHeight <= 300) {
    return { height: Math.round(taggedHeight * 10) / 10, height_source: 'osm', height_source_detail: 'OSM height tag' };
  }

  const levels = Number.parseFloat(properties['building:levels']);
  if (Number.isFinite(levels) && levels > 0 && levels < 100) {
    return {
      height: Math.round(levels * 3.2 * 10) / 10,
      height_source: 'osm',
      height_source_detail: `OSM building:levels (${levels} × 3.2 m heuristic)`,
    };
  }

  return {
    height: estimatedHeight(properties.building, osmId),
    height_source: 'estimated',
    height_source_detail: `type-based CBD estimate (${String(properties.building ?? 'yes')})`,
  };
}

const converted = osmtogeojson(osm, { flatProperties: true });
const deduplicated = new Set();
const features = [];
let droppedGeometry = 0;
let droppedSlivers = 0;
let droppedDuplicate = 0;

for (const feature of converted.features) {
  const source = feature.properties ?? {};
  if (!source.building || !feature.geometry || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
    droppedGeometry += 1;
    continue;
  }
  const osmId = String(feature.id ?? source.id ?? `${source.type}/${source.id ?? ''}`);
  if (deduplicated.has(osmId)) {
    droppedDuplicate += 1;
    continue;
  }
  deduplicated.add(osmId);
  const area = geometryAreaM2(feature.geometry);
  if (!Number.isFinite(area) || area < minAreaM2) {
    droppedSlivers += 1;
    continue;
  }

  const height = heightFor(source, osmId);
  const taggedMinHeight = parseMeters(source.min_height);
  const properties = {
    '@id': osmId,
    building: String(source.building),
    height: height.height,
    min_height: taggedMinHeight !== null && taggedMinHeight >= 0 && taggedMinHeight < height.height ? Math.round(taggedMinHeight * 10) / 10 : 0,
    height_source: height.height_source,
    height_source_detail: height.height_source_detail,
    lit_rank: litRankFor(osmId),
    area_m2: Math.round(area),
  };
  for (const key of ['height', 'building:levels', 'name', 'amenity', 'tourism', 'addr:street', 'addr:housenumber', 'addr:suburb', 'addr:city']) {
    if (Object.hasOwn(source, key)) properties[`osm_${key.replaceAll(':', '_')}`] = source[key];
  }
  if (source.height && height.height_source === 'osm' && height.height_source_detail === 'OSM height tag') properties.osm_height = source.height;
  if (source['building:levels']) properties.osm_building_levels = source['building:levels'];

  features.push({ type: 'Feature', id: osmId, properties, geometry: feature.geometry });
}

const sourceCounts = { osm: 0, estimated: 0, landmark: 0 };
const detailCounts = { explicit_osm_height: 0, osm_levels_derived: 0, type_estimated: 0, landmark: 0 };
const buildingTypes = new Map();
for (const feature of features) {
  const { height_source: source, height_source_detail: detail, building } = feature.properties;
  sourceCounts[source] += 1;
  if (detail === 'OSM height tag') detailCounts.explicit_osm_height += 1;
  else if (detail.startsWith('OSM building:levels')) detailCounts.osm_levels_derived += 1;
  else if (source === 'estimated') detailCounts.type_estimated += 1;
  else if (source === 'landmark') detailCounts.landmark += 1;
  buildingTypes.set(building, (buildingTypes.get(building) ?? 0) + 1);
}

const total = features.length;
const percent = (count) => total ? Math.round((count / total) * 10000) / 100 : 0;
const summary = {
  district: 'CBD',
  bbox,
  source: 'OpenStreetMap via Overpass API',
  retrieved_on: new Date().toISOString().slice(0, 10),
  total_buildings: total,
  raw_building_ways_and_relations: osm.elements.filter((element) => element.tags?.building).length,
  dropped: { non_polygon_or_missing_geometry: droppedGeometry, area_under_5m2: droppedSlivers, duplicate_osm_id: droppedDuplicate },
  height_source_counts: sourceCounts,
  height_source_percent: Object.fromEntries(Object.entries(sourceCounts).map(([key, count]) => [key, percent(count)])),
  height_details: detailCounts,
  height_detail_percent: Object.fromEntries(Object.entries(detailCounts).map(([key, count]) => [key, percent(count)])),
  building_types: Object.fromEntries([...buildingTypes.entries()].sort((a, b) => b[1] - a[1])),
};
const collection = { type: 'FeatureCollection', features };
const places = features.filter(({ properties }) => {
  const amenity = String(properties.osm_amenity ?? '');
  const tourism = String(properties.osm_tourism ?? '');
  const building = String(properties.building ?? '');
  return Boolean(properties.osm_name) && (tourism === 'attraction' || amenity === 'place_of_worship' || amenity === 'hospital'
    || amenity === 'university' || ['church', 'mosque', 'temple', 'train_station'].includes(building));
}).map((feature) => {
  const rings = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates[0]]
    : feature.geometry.coordinates.map((polygon) => polygon[0]);
  const points = rings.flatMap((ring) => ring.slice(0, -1));
  const position = points.reduce((sum, point) => [sum[0] + point[0] / points.length, sum[1] + point[1] / points.length], [0, 0]);
  return { type: 'Feature', id: feature.id, properties: { name: feature.properties.osm_name, source: 'OpenStreetMap name and category tags' }, geometry: { type: 'Point', coordinates: position } };
});
const placesCollection = { type: 'FeatureCollection', features: places };

await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(publicOutputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(collection));
await writeFile(publicOutputPath, JSON.stringify(collection));
await writeFile(summaryPath, JSON.stringify(summary, null, 2));
await writeFile(placesPath, JSON.stringify(placesCollection));

console.log(JSON.stringify({ ...summary, named_places: places.length, output: publicOutputPath }, null, 2));

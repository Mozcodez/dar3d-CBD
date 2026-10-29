import { access, mkdir, writeFile } from 'node:fs/promises';

const outputPath = 'data/raw/cbd-buildings.osm.json';
const force = process.argv.includes('--force');

if (!force) {
  try {
    await access(outputPath);
    console.log(`${outputPath} already exists; keeping the cached Overpass response. Use --force to refresh it.`);
    process.exit(0);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const query = `
[out:json][timeout:90];
(
  way["building"](-6.835,39.265,-6.800,39.300);
  relation["building"](-6.835,39.265,-6.800,39.300);
);
out body;
>;
out skel qt;
`;

const response = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
    'user-agent': 'DarEsSalaam3DMap/0.1 (local development)',
  },
  body: new URLSearchParams({ data: query }),
});

if (!response.ok) {
  const errorBody = (await response.text()).slice(0, 500);
  throw new Error(`Overpass returned HTTP ${response.status}: ${errorBody}`);
}

const responseText = await response.text();
const document = JSON.parse(responseText);
if (!Array.isArray(document.elements)) throw new Error('Overpass response did not contain an elements array.');

await mkdir('data/raw', { recursive: true });
await writeFile(outputPath, `${JSON.stringify(document)}\n`);
console.log(`Saved ${document.elements.length} OSM elements to ${outputPath}.`);

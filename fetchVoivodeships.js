/**
 * Fetches Polish voivodeship boundaries from Overpass API and saves as GeoJSON.
 * Run once: node fetchVoivodeships.js
 * Output: public/voivodeships.geojson
 */

import fs from 'fs';
import fetch from 'node-fetch';
import osmtogeojson from 'osmtogeojson';

const query = `
[out:json][timeout:60];
area["ISO3166-1"="PL"]->.poland;
relation["admin_level"="4"]["boundary"="administrative"](area.poland);
out geom;
`;

console.log('Fetching voivodeship boundaries from Overpass API...');

const response = await fetch('https://overpass.kumi.systems/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `data=${encodeURIComponent(query)}`,
});

if (!response.ok) {
  console.error('Overpass API error:', response.status, await response.text());
  process.exit(1);
}

const data = await response.json();
const geojson = osmtogeojson(data);

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function cleanName(raw) {
  return (raw || '')
    .replace(/^województwo\s+/i, '')
    .split('-')
    .map(capitalize)
    .join('-');
}

// Keep only polygons/multipolygons that have a name
geojson.features = geojson.features
  .filter(f => (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon') && f.properties?.name)
  .map(f => ({
    ...f,
    properties: {
      name: cleanName(f.properties?.['name:pl'] || f.properties?.name),
    },
  }));

fs.writeFileSync('public/voivodeships.geojson', JSON.stringify(geojson));
console.log(`Saved ${geojson.features.length} voivodeships to public/voivodeships.geojson`);
geojson.features.forEach(f => console.log(' -', f.properties.name));

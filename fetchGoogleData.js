/**
 * Fetches all gas stations in Poland from Google Places API (New).
 * Usage: GOOGLE_MAPS_API_KEY=your_key node fetchGoogleData.js
 *
 * Output: public/googleData.json
 * Fields per station: id, name, lat, lon
 *
 * Cost estimate: ~1800 grid points × $17/1000 = ~$31 (Basic fields only)
 */

import fs from 'fs';
import fetch from 'node-fetch';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.error('Error: GOOGLE_MAPS_API_KEY environment variable is not set.');
  console.error('Usage: GOOGLE_MAPS_API_KEY=your_key node fetchGoogleData.js');
  process.exit(1);
}

const RADIUS = 20000; // 20km per search circle
const OUTPUT_FILE = 'public/googleData.json';
const CHECKPOINT_EVERY = 50; // save to disk every N requests

// Grid covering Poland (lat 49.0–54.9, lon 14.1–24.2)
// Step ~17km ensures circles overlap and nothing is missed
function generateGrid() {
  const points = [];
  const latStep = 0.15; // ~17km
  const lonStep = 0.24; // ~17km at 52°N
  for (let lat = 49.0; lat <= 54.9; lat = +(lat + latStep).toFixed(4)) {
    for (let lon = 14.1; lon <= 24.2; lon = +(lon + lonStep).toFixed(4)) {
      points.push({ lat, lon });
    }
  }
  return points;
}

async function searchNearby(lat, lon) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location',
    },
    body: JSON.stringify({
      includedTypes: ['gas_station'],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lon },
          radius: RADIUS,
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.places || [];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const grid = generateGrid();
  console.log(`Grid: ${grid.length} points, radius ${RADIUS / 1000}km`);
  console.log(`Estimated cost: ~$${((grid.length / 1000) * 32).toFixed(2)}\n`);

  // Resume from checkpoint if it exists
  let seen = new Set();
  let stations = [];
  let startIndex = 0;

  if (fs.existsSync(OUTPUT_FILE)) {
    const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    stations = existing.stations || [];
    stations.forEach(s => seen.add(s.id));
    startIndex = existing._checkpoint || 0;
    console.log(`Resuming from checkpoint: ${stations.length} stations, grid index ${startIndex}\n`);
  }

  for (let i = startIndex; i < grid.length; i++) {
    const { lat, lon } = grid[i];

    try {
      const places = await searchNearby(lat, lon);
      let newCount = 0;

      for (const place of places) {
        if (seen.has(place.id)) continue;
        seen.add(place.id);
        newCount++;

        stations.push({
          id: place.id,
          name: place.displayName?.text || null,
          lat: place.location.latitude,
          lon: place.location.longitude,
        });
      }

      const pct = Math.round((i + 1) / grid.length * 100);
      process.stdout.write(`\r[${pct}%] ${i + 1}/${grid.length} | found: ${places.length} | new: ${newCount} | total: ${stations.length}`);

      if ((i + 1) % CHECKPOINT_EVERY === 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ _checkpoint: i + 1, stations }, null, 2));
        process.stdout.write(' ✓ saved\n');
      }

      await sleep(110); // ~9 req/s, well under the 100 req/s limit

    } catch (err) {
      console.error(`\nError at (${lat}, ${lon}): ${err.message}`);
      await sleep(2000);
    }
  }

  // Final save (remove checkpoint marker)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ stations }, null, 2));
  console.log(`\n\nDone! ${stations.length} unique stations saved to ${OUTPUT_FILE}`);
}

main();

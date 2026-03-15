import fs from 'fs';

async function fetchStations() {
  try {
    console.log('Fetching gas station data from Overpass API...');
    const response = await fetch(
      'https://overpass-api.de/api/interpreter?data=[out:json];area["ISO3166-1"="PL"]->.poland;(node["amenity"="fuel"](area.poland););out;'
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    console.log(`Data saved to data.json. Found ${data.elements.length} stations.`);
  } catch (error) {
    console.error('Error fetching stations:', error.message);
  }
}

fetchStations();
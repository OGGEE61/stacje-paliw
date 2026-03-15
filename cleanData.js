import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/data.json', 'utf8'));

const brandCounts = {};
data.elements.forEach(el => {
  const brand = el.tags?.brand || 'Unknown';
  brandCounts[brand] = (brandCounts[brand] || 0) + 1;
});

const bigBrands = Object.keys(brandCounts).filter(b => brandCounts[b] > 5);
console.log('Big brands:', bigBrands);

const brandColors = {
  'Orlen': '#ff0000', // Red (brand color)
  'Lotos': '#ffff00', // Yellow
  'BP': '#00ff00', // Green
  'Shell': '#ffd700', // Gold (Shell yellow)
  'Statoil': '#0000ff', // Blue
  'Moya': '#ffa500', // Orange
  'Circle K': '#dc143c', // Crimson (red)
  'Amic': '#32cd32', // Lime green
  'MOL': '#b22222', // Firebrick (red)
  'Pieprzyk': '#000080', // Navy blue
  'Avia': '#4169e1', // Royal blue
  // Add more if needed
};

const maxCount = Math.max(...Object.values(brandCounts));

function getVoivodeship(lat, lon) {
  // Approximate boundaries for Polish voivodeships
  if (lat > 54.5) return 'Podlaskie';
  if (lat > 53.5) {
    if (lon < 16.5) return 'Zachodniopomorskie';
    if (lon < 19.5) return 'Pomorskie';
    return 'Warmińsko-Mazurskie';
  }
  if (lat > 52.5) {
    if (lon < 16.5) return 'Lubuskie';
    if (lon < 18.5) return 'Wielkopolskie';
    if (lon < 20.5) return 'Kujawsko-Pomorskie';
    return 'Mazowieckie';
  }
  if (lat > 51.5) {
    if (lon < 16.5) return 'Dolnośląskie';
    if (lon < 18.5) return 'Opolskie';
    if (lon < 20.5) return 'Śląskie';
    if (lon < 22.5) return 'Małopolskie';
    return 'Łódzkie';
  }
  if (lat > 50.5) {
    if (lon < 17.5) return 'Dolnośląskie';
    if (lon < 19.5) return 'Opolskie';
    if (lon < 21.5) return 'Śląskie';
    return 'Małopolskie';
  }
  if (lat > 49.5) {
    if (lon < 19.5) return 'Śląskie';
    if (lon < 21.5) return 'Małopolskie';
    return 'Podkarpackie';
  }
  return 'Unknown';
}

const cleaned = data.elements.map(el => {
  const brand = el.tags?.brand || 'Unknown';
  const count = brandCounts[brand] || 1;
  const color = count > 5 ? (brandColors[brand] || '#000000') : '#808080';
  return {
    id: el.id,
    lat: el.lat,
    lon: el.lon,
    brand: brand,
    color: color,
    voivodeship: getVoivodeship(el.lat, el.lon),
  };
});

fs.writeFileSync('public/cleanedData.json', JSON.stringify({ stations: cleaned }, null, 2));
console.log('Cleaned data saved with', cleaned.length, 'stations.');
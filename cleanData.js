import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/data.json', 'utf8'));

// --- Normalization ---

// Exact alias map: lowercase name → canonical brand
const ALIAS_MAP = new Map([
  // Orlen family
  ['orlen', 'Orlen'],
  ['pkn orlen', 'Orlen'],
  ['bliska', 'Orlen'],
  ['paliwa baq', 'Orlen'],
  ['lotos orlen', 'Orlen'],
  // Circle K family
  ['circle k', 'Circle K'],
  ['circle k express', 'Circle K'],
  ['circlek', 'Circle K'],
  // Amic family
  ['amic', 'Amic'],
  ['amic energy', 'Amic'],
  // Lotos family
  ['lotos', 'Lotos'],
  ['lotos optima', 'Lotos'],
  // Intermarché
  ['intermarche', 'Intermarché'],
  ['intermarché', 'Intermarché'],
  // E.Leclerc
  ['e. leclerc', 'E.Leclerc'],
  ['e.leclerc', 'E.Leclerc'],
  ['station service e. leclerc', 'E.Leclerc'],
  ['e.leclerc - stacja paliw', 'E.Leclerc'],
]);

// Generic names that carry no real identity → Independent
const GENERICS = new Set([
  'stacja paliw',
  'stacja benzynowa',
  'stacja benzynową',
  'lpg',
  'stacja lpg',
  'gaz lpg',
  'lpg gaz',
  'auto gaz',
  'auto-gaz',
  'autogaz',
  'gaz',
  'paliwo',
  'benzyna',
  'partner',
]);

// Prefix rules: if lowercase name starts with prefix → canonical brand
// Handles "BP Cybina", "ORLEN nr 665", "MOYA Express", "MOL MOP Oleśnica" etc.
const PREFIX_RULES = [
  ['bp', 'BP'],
  ['orlen', 'Orlen'],
  ['moya', 'Moya'],
  ['mol', 'MOL'],
  ['lotos', 'Lotos'],
  ['circle k', 'Circle K'],
  ['amic', 'Amic'],
  ['shell', 'Shell'],
  ['huzar', 'Huzar'],
  ['watis', 'Watis'],
  ['avia', 'Avia'],
  ['pieprzyk', 'Pieprzyk'],
];

function normalizeName(name) {
  const lower = name.toLowerCase().trim();

  // 1. Exact alias map (covers sub-brands and case variants)
  if (ALIAS_MAP.has(lower)) return ALIAS_MAP.get(lower);

  // 2. Generic names → Independent
  if (GENERICS.has(lower)) return 'Independent';

  // 3. Prefix matching (case-insensitive): exact match OR starts with "prefix "
  for (const [prefix, canonical] of PREFIX_RULES) {
    if (lower === prefix || lower.startsWith(prefix + ' ') || lower.startsWith(prefix + '-')) {
      return canonical;
    }
  }

  return name.trim();
}

// --- Build dataset ---

const withName = data.elements.filter(el => el.tags?.name);
console.log(`Input: ${withName.length} stations with name tag (dropped ${data.elements.length - withName.length} without)`);

const nameCounts = {};
withName.forEach(el => {
  const normalized = normalizeName(el.tags.name);
  nameCounts[normalized] = (nameCounts[normalized] || 0) + 1;
});

const bigBrands = Object.keys(nameCounts).filter(n => nameCounts[n] > 5 && n !== 'Independent');
console.log('Brands with >5 stations:', bigBrands.sort((a, b) => nameCounts[b] - nameCounts[a]));

const brandColors = {
  'Orlen': '#e8001c',
  'BP': '#009900',
  'Shell': '#e8a000',
  'Circle K': '#c8102e',
  'Moya': '#ff6600',
  'MOL': '#0046b4',
  'Lotos': '#ffcc00',
  'Amic': '#1a7a1a',
  'Pieprzyk': '#000080',
  'Avia': '#4169e1',
  'Watis': '#8B008B',
  'Huzar': '#00CED1',
  'Oktan': '#FF69B4',
  'Carrefour': '#0055a4',
  'Auchan': '#e83e3e',
  'Intermarché': '#e83e3e',
  'E.Leclerc': '#003189',
  'Wasbruk': '#2E8B57',
  'Bliska': '#cc0000',
};

const palette = ['#4B0082', '#DAA520', '#008080', '#8B4513', '#556B2F', '#800080', '#4682B4'];

const selectedBrands = {};
bigBrands.forEach((brand, index) => {
  selectedBrands[brand] = brandColors[brand] || palette[index % palette.length];
});

function getColor(normalizedName) {
  if (normalizedName === 'Independent') return '#808080';
  if (selectedBrands[normalizedName]) return selectedBrands[normalizedName];
  return '#808080';
}

function getVoivodeship(lat, lon) {
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

const cleaned = withName.map(el => {
  const brand = normalizeName(el.tags.name);
  const tags = el.tags || {};

  return {
    id: el.id,
    lat: el.lat,
    lon: el.lon,
    brand,
    operator: tags.operator || null,
    color: getColor(brand),
    voivodeship: getVoivodeship(el.lat, el.lon),
    opening_hours: tags.opening_hours || null,
    lpg: tags['fuel:lpg'] === 'yes',
    diesel: tags['fuel:diesel'] === 'yes',
    petrol_95: tags['fuel:octane_95'] === 'yes',
    petrol_98: tags['fuel:octane_98'] === 'yes',
    cng: tags['fuel:cng'] === 'yes',
    car_wash: tags.car_wash === 'yes',
    compressed_air: tags.compressed_air === 'yes',
    toilets: tags.toilets === 'yes',
    payment_cards: tags['payment:credit_cards'] === 'yes',
  };
});

fs.writeFileSync('public/cleanedData.json', JSON.stringify({ stations: cleaned }, null, 2));
console.log(`\nOutput: ${cleaned.length} stations saved.`);

console.log('\n--- Final brand counts ---');
const finalCounts = {};
cleaned.forEach(s => { finalCounts[s.brand] = (finalCounts[s.brand] || 0) + 1; });
Object.entries(finalCounts).sort((a, b) => b[1] - a[1]).forEach(([b, c]) => console.log(`${c}\t${b}`));

# Stacje Paliw — Poland Gas Station Map

Interactive map of gas stations across Poland, built on OpenStreetMap data.

**Live demo:** [stacje-paliw.pages.dev](https://stacje-paliw.pages.dev)

## Views

### Map
All ~3,600 named stations plotted as colour-coded dots by brand. Click any dot to see the station name, opening hours, fuel types (LPG, diesel, 95, 98, CNG), and amenities (car wash, toilets, card payment).

### Stats
One pie chart per voivodeship showing brand market share. Voivodeship borders are drawn on the map. Click a chart to see the full breakdown with percentages. The sidebar shows national aggregates (24/7 count, LPG coverage, etc.).

## Data Pipeline

Data is static and refreshed manually by running these scripts in order:

```bash
# 1. Pull raw station data from OpenStreetMap Overpass API
node fetchData.js              # → public/data.json

# 2. Clean, normalise brand names, classify by voivodeship
node cleanData.js              # → public/cleanedData.json

# 3. Fetch voivodeship boundaries (run once, or to refresh)
node fetchVoivodeships.js      # → public/voivodeships.geojson
```

### What cleanData.js does
- Uses the OSM `name` tag as the brand identifier; drops stations with no name
- Normalises brand variants: `MOYA`, `Moya Express` → `Moya`; `Bliska` → `Orlen`; `Circle K Express` → `Circle K`; `Amic Energy` → `Amic`; etc.
- Groups generic names (`Stacja Paliw`, `LPG`, `Auto-Gaz`, …) as `Independent`
- Assigns brand colours; brands with ≤5 stations get grey
- Extracts fuel types: LPG, diesel, 95, 98, CNG
- Extracts amenities: car wash, toilets, compressed air, card payment

### Data quality
Source is OpenStreetMap, which covers roughly 55% of real-world stations in Poland (~3,600 of ~8,000). Stations missing the `name` tag in OSM are excluded.

## Tech Stack

| Layer | Library |
|---|---|
| UI | React 19, TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Maps | Leaflet, react-leaflet |
| Data | OpenStreetMap Overpass API |

## Development

```bash
npm install
npm run dev      # dev server at localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build
```

## Deployment

Any static host works. After `npm run build`, deploy the `dist/` folder.

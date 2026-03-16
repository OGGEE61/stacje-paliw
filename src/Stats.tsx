import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import { DivIcon, type LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Station {
  id: number;
  lat: number;
  lon: number;
  brand?: string;
  color: string;
  voivodeship: string;
  opening_hours?: string | null;
  lpg: boolean;
  diesel: boolean;
  petrol_95: boolean;
  petrol_98: boolean;
  cng: boolean;
  car_wash: boolean;
  compressed_air: boolean;
  toilets: boolean;
  payment_cards: boolean;
}

interface StatsPageProps {
  stations: Station[];
  brands: { [key: string]: string };
  loading: boolean;
}

const voivodeshipCenters: Record<string, LatLngExpression> = {
  "Dolnośląskie": [51.1078852, 17.0385376],
  "Kujawsko-Pomorskie": [53.0137904, 18.5984432],
  "Lubelskie": [51.2464536, 22.5684464],
  "Lubuskie": [52.290737, 15.5401228],
  "Łódzkie": [51.7592485, 19.4559833],
  "Małopolskie": [50.0619474, 19.9368564],
  "Mazowieckie": [52.2296756, 21.0122287],
  "Opolskie": [50.6751069, 17.9212974],
  "Podkarpackie": [50.0401197, 21.9991198],
  "Podlaskie": [53.1324886, 23.1688403],
  "Pomorskie": [54.3520252, 18.6466384],
  "Śląskie": [50.2648919, 19.0237815],
  "Świętokrzyskie": [50.8660772, 20.6285678],
  "Warmińsko-Mazurskie": [53.7784225, 20.4801195],
  "Wielkopolskie": [52.406374, 16.9251681],
  "Zachodniopomorskie": [53.4285438, 14.5528115],
};

function createPieSvg(
  counts: Record<string, number>,
  brandColors: Record<string, string>,
  size: number
): string {
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0 || entries.length === 0) return '';

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  // Single segment: draw a full circle
  if (entries.length === 1) {
    const color = brandColors[entries[0][0]] || '#808080';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#333" stroke-width="1.5"/>` +
      `</svg>`;
  }

  const paths: string[] = [];
  let startAngle = -Math.PI / 2;

  entries.forEach(([label, value]) => {
    const angle = (value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const x1 = (cx + r * Math.cos(startAngle)).toFixed(2);
    const y1 = (cy + r * Math.sin(startAngle)).toFixed(2);
    const x2 = (cx + r * Math.cos(endAngle)).toFixed(2);
    const y2 = (cy + r * Math.sin(endAngle)).toFixed(2);
    const largeArc = angle > Math.PI ? 1 : 0;
    const color = brandColors[label] || '#808080';
    paths.push(
      `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}"/>`
    );
    startAngle = endAngle;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    paths.join('') +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#333" stroke-width="1.5"/>` +
    `</svg>`;
}

function PieChartMarker({
  voivodeship,
  counts,
  brandColors,
}: {
  voivodeship: string;
  counts: Record<string, number>;
  brandColors: { [key: string]: string };
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const update = () => setZoom(map.getZoom());
    map.on('zoomend', update);
    return () => { map.off('zoomend', update); };
  }, [map]);

  const size = Math.max(60, Math.min(140, 30 + zoom * 8));
  const total = Object.values(counts).reduce((s, v) => s + v, 0);

  const icon = new DivIcon({
    html: createPieSvg(counts, brandColors, size),
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  const position = voivodeshipCenters[voivodeship];
  if (!position) return null;

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div style={{ minWidth: 160 }}>
          <strong>{voivodeship}</strong>
          <div style={{ marginBottom: 4, color: '#666' }}>Total: {total} stations</div>
          {Object.entries(counts)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>
                  <span style={{ color: brandColors[label] || '#808080' }}>■</span> {label}
                </span>
                <span>{value} ({Math.round((value / total) * 100)}%)</span>
              </div>
            ))}
        </div>
      </Popup>
    </Marker>
  );
}

const voivodeshipStyle = {
  color: '#555',
  weight: 1.5,
  fillOpacity: 0,
};

export default function StatsPage({ stations, brands, loading }: StatsPageProps) {
  const [voivodeshipGeoJSON, setVoivodeshipGeoJSON] = useState<object | null>(null);

  useEffect(() => {
    fetch('/voivodeships.geojson')
      .then(r => r.json())
      .then(setVoivodeshipGeoJSON)
      .catch(console.error);
  }, []);

  const voivodeships = useMemo(
    () => Array.from(new Set(stations.map((s) => s.voivodeship))).sort(),
    [stations]
  );

  const statsByVoivodeship = useMemo(() => {
    const base: Record<string, Record<string, number>> = {};
    voivodeships.forEach((v) => { base[v] = {}; });

    stations.forEach((station) => {
      const voiv = station.voivodeship;
      const brand = station.brand || 'Unknown';
      const label = brands[brand] ? brand : 'Other';
      base[voiv][label] = (base[voiv][label] || 0) + 1;
    });

    return base;
  }, [stations, brands, voivodeships]);

  // Summary stats for the sidebar
  const summary = useMemo(() => {
    const total = stations.length;
    const lpgCount = stations.filter(s => s.lpg).length;
    const carWashCount = stations.filter(s => s.car_wash).length;
    const toiletsCount = stations.filter(s => s.toilets).length;
    const is24_7 = stations.filter(s => s.opening_hours === '24/7').length;
    const cardPayment = stations.filter(s => s.payment_cards).length;
    const cngCount = stations.filter(s => s.cng).length;
    return { total, lpgCount, carWashCount, toiletsCount, is24_7, cardPayment, cngCount };
  }, [stations]);

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-72 min-w-[240px] p-4 bg-gray-100 border-r overflow-y-auto text-sm">
        <h2 className="text-lg font-bold mb-3">Summary</h2>
        <div className="space-y-1 mb-4">
          <div><strong>{summary.total}</strong> stations total</div>
          <div><strong>{summary.is24_7}</strong> open 24/7 ({Math.round(summary.is24_7 / summary.total * 100)}%)</div>
          <div><strong>{summary.lpgCount}</strong> with LPG ({Math.round(summary.lpgCount / summary.total * 100)}%)</div>
          <div><strong>{summary.cngCount}</strong> with CNG</div>
          <div><strong>{summary.carWashCount}</strong> with car wash</div>
          <div><strong>{summary.toiletsCount}</strong> with toilets</div>
          <div><strong>{summary.cardPayment}</strong> accept cards</div>
        </div>

        <h2 className="text-lg font-bold mb-2">Legend</h2>
        <div className="mb-3">
          <h3 className="font-semibold mb-1">Major Brands</h3>
          <ul className="space-y-1">
            {Object.entries(brands).map(([brand, color]) => (
              <li key={brand} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {brand}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Independent / small chains</h3>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex-shrink-0 bg-gray-400" />
            Other
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Click a pie chart to see the breakdown for that voivodeship.
        </p>
      </aside>

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-xl">Loading gas stations...</div>
          </div>
        )}
        <MapContainer center={[52.0, 19.5]} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {voivodeshipGeoJSON && (
            <GeoJSON
              key="voivodeships"
              data={voivodeshipGeoJSON as GeoJSON.GeoJsonObject}
              style={voivodeshipStyle}
            />
          )}
          {voivodeships.map((voiv) => (
            <PieChartMarker
              key={voiv}
              voivodeship={voiv}
              counts={statsByVoivodeship[voiv] || {}}
              brandColors={brands}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

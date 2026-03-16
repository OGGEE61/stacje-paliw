import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import { DivIcon, type LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BrandLegend, type Station, type Brands } from './App';

interface StatsPageProps {
  stations: Station[];
  brands: Brands;
  loading: boolean;
}

const voivodeshipCenters: Record<string, LatLngExpression> = {
  "Dolnośląskie":       [51.1078852, 17.0385376],
  "Kujawsko-Pomorskie": [53.0137904, 18.5984432],
  "Lubelskie":          [51.2464536, 22.5684464],
  "Lubuskie":           [52.290737,  15.5401228],
  "Łódzkie":            [51.7592485, 19.4559833],
  "Małopolskie":        [50.0619474, 19.9368564],
  "Mazowieckie":        [52.2296756, 21.0122287],
  "Opolskie":           [50.6751069, 17.9212974],
  "Podkarpackie":       [50.0401197, 21.9991198],
  "Podlaskie":          [53.1324886, 23.1688403],
  "Pomorskie":          [54.3520252, 18.6466384],
  "Śląskie":            [50.2648919, 19.0237815],
  "Świętokrzyskie":     [50.8660772, 20.6285678],
  "Warmińsko-Mazurskie":[53.7784225, 20.4801195],
  "Wielkopolskie":      [52.406374,  16.9251681],
  "Zachodniopomorskie": [53.4285438, 14.5528115],
};

const voivodeshipStyle = { color: '#555', weight: 1.5, fillOpacity: 0 };

function createPieSvg(counts: Record<string, number>, brandColors: Brands, size: number): string {
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0 || entries.length === 0) return '';

  const cx = size / 2, cy = size / 2, r = size / 2 - 2;

  if (entries.length === 1) {
    const color = brandColors[entries[0][0]] || '#9ca3af';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#333" stroke-width="1.5"/>` +
      `</svg>`;
  }

  const paths: string[] = [];
  let a = -Math.PI / 2;
  entries.forEach(([label, value]) => {
    const angle = (value / total) * Math.PI * 2;
    const ea = a + angle;
    const x1 = (cx + r * Math.cos(a)).toFixed(2), y1 = (cy + r * Math.sin(a)).toFixed(2);
    const x2 = (cx + r * Math.cos(ea)).toFixed(2), y2 = (cy + r * Math.sin(ea)).toFixed(2);
    paths.push(`<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${angle > Math.PI ? 1 : 0},1 ${x2},${y2} Z" fill="${brandColors[label] || '#9ca3af'}"/>`);
    a = ea;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    paths.join('') +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#333" stroke-width="1.5"/></svg>`;
}

function PieChartMarker({ voivodeship, counts, brandColors }: { voivodeship: string; counts: Record<string, number>; brandColors: Brands }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const update = () => setZoom(map.getZoom());
    map.on('zoomend', update);
    return () => { map.off('zoomend', update); };
  }, [map]);

  const size = Math.max(60, Math.min(140, 30 + zoom * 8));
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const position = voivodeshipCenters[voivodeship];
  if (!position) return null;

  const icon = new DivIcon({
    html: createPieSvg(counts, brandColors, size),
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div style={{ minWidth: 170, fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{voivodeship}</div>
          <div style={{ color: '#666', marginBottom: 6 }}>{total} stations total</div>
          {Object.entries(counts)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
                    background: brandColors[label] || '#9ca3af',
                    border: '1px solid rgba(0,0,0,0.2)', flexShrink: 0,
                  }} />
                  {label}
                </span>
                <span style={{ color: '#555' }}>{value} ({Math.round((value / total) * 100)}%)</span>
              </div>
            ))}
        </div>
      </Popup>
    </Marker>
  );
}

export default function StatsPage({ stations, brands, loading }: StatsPageProps) {
  const [voivodeshipGeoJSON, setVoivodeshipGeoJSON] = useState<object | null>(null);

  useEffect(() => {
    fetch('/voivodeships.geojson').then(r => r.json()).then(setVoivodeshipGeoJSON).catch(console.error);
  }, []);

  const voivodeships = useMemo(
    () => Array.from(new Set(stations.map(s => s.voivodeship))).sort(),
    [stations]
  );

  const statsByVoivodeship = useMemo(() => {
    const base: Record<string, Record<string, number>> = {};
    voivodeships.forEach(v => { base[v] = {}; });
    stations.forEach(station => {
      const voiv = station.voivodeship;
      const brand = station.brand || 'Unknown';
      const label = brands[brand] ? brand : 'Other';
      base[voiv][label] = (base[voiv][label] || 0) + 1;
    });
    return base;
  }, [stations, brands, voivodeships]);

  const summary = useMemo(() => {
    const total = stations.length;
    return {
      total,
      is24_7: stations.filter(s => s.opening_hours === '24/7').length,
      lpg:    stations.filter(s => s.lpg).length,
      cng:    stations.filter(s => s.cng).length,
      wash:   stations.filter(s => s.car_wash).length,
      wc:     stations.filter(s => s.toilets).length,
      cards:  stations.filter(s => s.payment_cards).length,
    };
  }, [stations]);

  const pct = (n: number) => summary.total ? Math.round(n / summary.total * 100) : 0;

  return (
    <div style={{ height: '100%', display: 'flex' }}>

      {/* Sidebar */}
      <aside style={{
        width: 190,
        flexShrink: 0,
        overflowY: 'auto',
        background: '#f3f4f6',
        borderRight: '1px solid #d1d5db',
        padding: '14px 12px',
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 10 }}>
          Summary
        </p>
        <div style={{ fontSize: 12, color: '#1f2937', marginBottom: 14 }}>
          {[
            [`${summary.total}`, 'stations in OSM'],
            [`${summary.is24_7} (${pct(summary.is24_7)}%)`, 'open 24/7'],
            [`${summary.lpg} (${pct(summary.lpg)}%)`, 'with LPG'],
            [`${summary.cng}`, 'with CNG'],
            [`${summary.wash}`, 'with car wash'],
            [`${summary.wc}`, 'with toilets'],
            [`${summary.cards}`, 'accept cards'],
          ].map(([val, label]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
              <span style={{ color: '#6b7280' }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Reuse the exact same legend component as the Map page */}
        <BrandLegend brands={brands} note="Click a pie chart to see the voivodeship breakdown." />
      </aside>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            Loading stations…
          </div>
        )}
        <MapContainer center={[52.0, 19.5]} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {voivodeshipGeoJSON && (
            <GeoJSON key="voivodeships" data={voivodeshipGeoJSON as GeoJSON.GeoJsonObject} style={voivodeshipStyle} />
          )}
          {voivodeships.map(voiv => (
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

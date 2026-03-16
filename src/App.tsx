import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import StatsPage from './Stats';

export interface Station {
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

export type Brands = { [brand: string]: string };

// Shared legend content — wrap in a sidebar <aside> at the call site
export function BrandLegend({ brands, note }: { brands: Brands; note?: string }) {
  return (
    <>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 10 }}>
        Legend
      </p>

      <p style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Major chains
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, marginBottom: 12 }}>
        {Object.entries(brands).map(([brand, color]) => (
          <li key={brand} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, fontSize: 12, color: '#1f2937' }}>
            <span style={{
              display: 'block',
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: color,
              border: '1.5px solid rgba(0,0,0,0.25)',
              flexShrink: 0,
            }} />
            {brand}
          </li>
        ))}
      </ul>

      <p style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Other
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#1f2937' }}>
        <span style={{
          display: 'block',
          width: 11,
          height: 11,
          borderRadius: '50%',
          background: '#9ca3af',
          border: '1.5px solid rgba(0,0,0,0.25)',
          flexShrink: 0,
        }} />
        Independent / small chains
      </div>

      {note && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>{note}</p>}
    </>
  );
}

function MapPage({ stations, brands, loading }: { stations: Station[]; brands: Brands; loading: boolean }) {
  return (
    <div style={{ height: '100%', display: 'flex' }}>
      <aside style={{ width: 190, flexShrink: 0, overflowY: 'auto', background: '#f3f4f6', borderRight: '1px solid #d1d5db', padding: '14px 12px' }}>
        <BrandLegend brands={brands} note="Click a dot to see details." />
      </aside>

      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            Loading stations…
          </div>
        )}
        <MapContainer center={[52.0, 19.5]} zoom={6} style={{ position: 'absolute', inset: 0 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {stations.map((station) => (
            <CircleMarker
              key={station.id}
              center={[station.lat, station.lon]}
              radius={5}
              fillColor={station.color}
              color={station.color}
              fillOpacity={0.8}
              weight={1}
            >
              <Popup>
                <div style={{ minWidth: 160, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{station.brand || 'Unknown'}</div>
                  {station.opening_hours && (
                    <div style={{ marginBottom: 4 }}><b>Hours:</b> {station.opening_hours}</div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {station.lpg && <Tag color="#dbeafe" text="LPG" />}
                    {station.diesel && <Tag color="#fef9c3" text="Diesel" />}
                    {station.petrol_95 && <Tag color="#dcfce7" text="95" />}
                    {station.petrol_98 && <Tag color="#dcfce7" text="98" />}
                    {station.cng && <Tag color="#f3e8ff" text="CNG" />}
                    {station.car_wash && <Tag color="#e0f2fe" text="Car wash" />}
                    {station.toilets && <Tag color="#f3f4f6" text="Toilets" />}
                    {station.payment_cards && <Tag color="#ffedd5" text="Cards" />}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

function Tag({ color, text }: { color: string; text: string }) {
  return (
    <span style={{ background: color, padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>{text}</span>
  );
}

function App() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Brands>({});

  useEffect(() => {
    fetch('/cleanedData.json')
      .then(r => r.json())
      .then((data) => {
        const stationData: Station[] = data.stations;
        setStations(stationData);

        // Read colours directly from station data — legend always matches map dots
        const colorMap: { [b: string]: string } = {};
        const countMap: { [b: string]: number } = {};
        stationData.forEach(s => {
          if (!s.brand) return;
          countMap[s.brand] = (countMap[s.brand] || 0) + 1;
          if (!colorMap[s.brand] && s.color !== '#808080') {
            colorMap[s.brand] = s.color;
          }
        });

        // Sort by count desc, keep only brands with >5 stations and a distinct colour
        const sorted = Object.entries(colorMap)
          .filter(([brand]) => countMap[brand] > 5)
          .sort((a, b) => countMap[b[0]] - countMap[a[0]]);

        setBrands(Object.fromEntries(sorted));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <BrowserRouter>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <header style={{
          flexShrink: 0,
          background: '#111827',
          color: 'white',
          padding: '0 24px',
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⛽</span>
            <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '0.01em' }}>Stacje Paliw — Poland</span>
          </div>
          <nav style={{ display: 'flex', gap: 4 }}>
            {[['/', 'Map'], ['/stats', 'Stats']].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                style={({ isActive }) => ({
                  padding: '4px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                  background: isActive ? 'white' : 'transparent',
                  color: isActive ? '#111827' : '#d1d5db',
                  transition: 'background 0.15s',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        {/* Page content — fills remaining height */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<MapPage stations={stations} brands={brands} loading={loading} />} />
            <Route path="/stats" element={<StatsPage stations={stations} brands={brands} loading={loading} />} />
          </Routes>
        </div>

      </div>
    </BrowserRouter>
  );
}

export default App;

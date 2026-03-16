import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import StatsPage from './Stats';

interface Station {
  id: number;
  lat: number;
  lon: number;
  brand?: string;
  name?: string | null;
  operator?: string | null;
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

function MapPage({ stations, brands, loading }: { stations: Station[]; brands: { [key: string]: string }; loading: boolean }) {
  return (
    <div className="h-full flex">
      <aside className="w-72 min-w-[240px] p-4 bg-gray-100 border-r overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Legend</h2>
        <div className="mb-4">
          <h3 className="font-semibold mb-1">Major Brands</h3>
          <ul className="space-y-1">
            {Object.keys(brands).map(brand => (
              <li key={brand} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: brands[brand] }} />
                {brand}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Independent / small chains</h3>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex-shrink-0 bg-gray-400" />
            &le;5 stations
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-500">Click a dot to see station details.</p>
      </aside>

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
          {stations.map((station) => (
            <CircleMarker
              key={station.id}
              center={[station.lat, station.lon]}
              radius={5}
              fillColor={station.color}
              color={station.color}
              fillOpacity={0.8}
            >
              <Popup>
                <div className="space-y-1 text-sm" style={{ minWidth: 160 }}>
                  <div className="font-semibold">{station.name || station.brand || 'Unknown'}</div>
                  {station.brand && station.name && (
                    <div className="text-gray-500">{station.brand}</div>
                  )}
                  {station.opening_hours && (
                    <div><span className="font-medium">Hours:</span> {station.opening_hours}</div>
                  )}
                  <div className="pt-1 flex flex-wrap gap-1">
                    {station.lpg && <span className="bg-blue-100 text-blue-800 px-1 rounded text-xs">LPG</span>}
                    {station.diesel && <span className="bg-yellow-100 text-yellow-800 px-1 rounded text-xs">Diesel</span>}
                    {station.petrol_95 && <span className="bg-green-100 text-green-800 px-1 rounded text-xs">95</span>}
                    {station.petrol_98 && <span className="bg-green-100 text-green-800 px-1 rounded text-xs">98</span>}
                    {station.cng && <span className="bg-purple-100 text-purple-800 px-1 rounded text-xs">CNG</span>}
                    {station.car_wash && <span className="bg-sky-100 text-sky-800 px-1 rounded text-xs">Car wash</span>}
                    {station.toilets && <span className="bg-gray-100 text-gray-700 px-1 rounded text-xs">Toilets</span>}
                    {station.payment_cards && <span className="bg-orange-100 text-orange-800 px-1 rounded text-xs">Cards</span>}
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

function App() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const loadStations = async () => {
      try {
        const response = await fetch('/cleanedData.json');
        const data = await response.json();
        const stationData: Station[] = data.stations;
        setStations(stationData);

        // Derive brand colours directly from the data so legend always matches map dots
        const brandColorMap: { [key: string]: string } = {};
        const brandCounts: { [key: string]: number } = {};
        stationData.forEach(station => {
          const b = station.brand;
          if (!b) return;
          brandCounts[b] = (brandCounts[b] || 0) + 1;
          if (!brandColorMap[b] && station.color !== '#808080') {
            brandColorMap[b] = station.color;
          }
        });

        // Only keep brands with >5 stations that have a distinct colour
        const selectedBrands: { [key: string]: string } = {};
        Object.entries(brandColorMap).forEach(([brand, color]) => {
          if (brandCounts[brand] > 5) {
            selectedBrands[brand] = color;
          }
        });

        setBrands(selectedBrands);
      } catch (error) {
        console.error('Error loading stations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStations();
  }, []);

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col overflow-hidden">
        <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-lg">⛽</span>
            <h1 className="text-base font-semibold tracking-wide">Stacje Paliw &mdash; Poland</h1>
          </div>
          <nav className="flex gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              Map
            </NavLink>
            <NavLink
              to="/stats"
              className={({ isActive }) =>
                `px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              Stats
            </NavLink>
          </nav>
        </header>
        <main className="flex-1 min-h-0">
          <Routes>
            <Route path="/" element={<MapPage stations={stations} brands={brands} loading={loading} />} />
            <Route path="/stats" element={<StatsPage stations={stations} brands={brands} loading={loading} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

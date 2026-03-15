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
  color: string;
  voivodeship: string;
  opening_hours?: string | null;
}

function MapPage({ stations, brands, loading }: { stations: Station[]; brands: { [key: string]: string }; loading: boolean }) {
  return (
    <div className="h-screen flex">
      <aside className="w-72 min-w-[240px] p-4 bg-gray-100 border-r overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Legend</h2>
        <div className="mb-4">
          <h3 className="font-semibold">Big Brands</h3>
          <ul>
            {Object.keys(brands).map(brand => (
              <li key={brand} className="flex items-center mb-2">
                <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: brands[brand] }}></div>
                {brand}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Small Chains</h3>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: '#808080' }}></div>
            ≤5 stations
          </div>
        </div>
      </aside>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-xl">Loading gas stations...</div>
          </div>
        )}

        <MapContainer center={[52.0, 19.5]} zoom={6} className="h-full w-full">
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
                <div className="space-y-1">
                  <div>
                    <strong>Brand:</strong> {station.brand || 'Unknown'}
                  </div>
                  {station.opening_hours ? (
                    <div>
                      <strong>Hours:</strong> {station.opening_hours}
                    </div>
                  ) : null}
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
        console.log('Loaded stations:', stationData.length);

        // Count stations per brand so we can highlight major chains
        const brandCounts: { [key: string]: number } = {};
        stationData.forEach(station => {
          const b = station.brand || 'Unknown';
          brandCounts[b] = (brandCounts[b] || 0) + 1;
        });

        const bigBrands = Object.entries(brandCounts)
          .filter(([, count]) => count > 5)
          .map(([brand]) => brand);

        const brandColors: { [key: string]: string } = {
          Orlen: '#ff0000',
          Lotos: '#ffff00',
          BP: '#00ff00',
          Shell: '#ffd700',
          Statoil: '#0000ff',
          Moya: '#ffa500',
          'Circle K': '#dc143c',
          Amic: '#32cd32',
          MOL: '#b22222',
          Pieprzyk: '#000080',
          Avia: '#4169e1',
        };

        const palette = ['#8B008B', '#00CED1', '#FF69B4', '#4B0082', '#2E8B57', '#DAA520'];

        const selectedBrands: { [key: string]: string } = {};
        bigBrands.forEach((brand, index) => {
          selectedBrands[brand] = brandColors[brand] || palette[index % palette.length];
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
      <div className="h-screen flex flex-col">
        <header className="bg-white border-b px-4 py-2 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Stacje Paliw (Poland)</h1>
          <nav className="space-x-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1 rounded ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`
              }
            >
              Map
            </NavLink>
            <NavLink
              to="/stats"
              className={({ isActive }) =>
                `px-3 py-1 rounded ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`
              }
            >
              Stats
            </NavLink>
          </nav>
        </header>
        <main className="flex-1">
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


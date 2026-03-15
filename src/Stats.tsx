import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Station {
  id: number;
  lat: number;
  lon: number;
  brand?: string;
  color: string;
  voivodeship: string;
  opening_hours?: string | null;
}

interface StatsPageProps {
  stations: Station[];
  brands: { [key: string]: string };
  loading: boolean;
}

export default function StatsPage({ stations, brands, loading }: StatsPageProps) {
  const voivodeships = useMemo(() => {
    const list = Array.from(new Set(stations.map((s) => s.voivodeship)));
    return list.sort();
  }, [stations]);

  const statsByVoivodeship = useMemo(() => {
    const base: Record<string, Record<string, number>> = {};
    voivodeships.forEach((voiv) => {
      base[voiv] = {};
    });

    stations.forEach((station) => {
      const voiv = station.voivodeship;
      const brand = station.brand || 'Unknown';
      const label = brands[brand] ? brand : 'Other';
      base[voiv][label] = (base[voiv][label] || 0) + 1;
    });

    return base;
  }, [stations, brands, voivodeships]);

  const chartDataForVoivodeship = (voiv: string) => {
    const counts = statsByVoivodeship[voiv] || {};
    const labels = [...Object.keys(brands), 'Other'];
    const data = labels.map((label) => counts[label] || 0);
    const backgroundColor = labels.map((label) => (label === 'Other' ? '#808080' : brands[label]));

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderWidth: 1,
        },
      ],
    };
  };

  return (
    <div className="h-screen flex flex-col">
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-xl">Loading gas stations...</div>
        </div>
      )}

      <div className="flex-1 flex">
        <div className="w-2/3 border-r">
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

        <div className="w-1/3 overflow-auto p-4">
          <h2 className="text-lg font-semibold mb-3">Stations per voivodeship</h2>
          <div className="space-y-6">
            {voivodeships.map((voiv) => (
              <div key={voiv} className="border rounded-lg p-3 bg-white shadow-sm">
                <h3 className="font-semibold mb-2">{voiv}</h3>
                <Pie data={chartDataForVoivodeship(voiv)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

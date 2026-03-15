import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
  const id = `pie-${voivodeship.replace(/\s+/g, '-')}`;
  const size = Math.max(60, Math.min(140, 30 + zoom * 8));

  useEffect(() => {
    const updateZoom = () => setZoom(map.getZoom());
    map.on('zoomend', updateZoom);
    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  useEffect(() => {
    const canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas) return;
    canvas.width = size * 2;
    canvas.height = size * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const entries = Object.entries(counts).filter(([, v]) => v > 0);
    const total = entries.reduce((sum, [, v]) => sum + v, 0);
    const center = size;
    const radius = size - 8;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let startAngle = -Math.PI / 2;

    entries.forEach(([label, value]) => {
      const angle = (value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, startAngle + angle);
      ctx.closePath();
      ctx.fillStyle = brandColors[label] || '#808080';
      ctx.fill();
      startAngle += angle;
    });

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [id, counts, brandColors, size]);

  const html = `
    <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
      <canvas id="${id}" style="width:${size}px;height:${size}px;" />
    </div>
  `;

  const icon = new DivIcon({
    html,
    className: 'pie-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  const position = voivodeshipCenters[voivodeship] || [52.0, 19.0];

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div className="space-y-1">
          <strong>{voivodeship}</strong>
          <div className="text-sm">
            {Object.entries(counts)
              .filter(([, v]) => v > 0)
              .map(([label, value]) => (
                <div key={label}>
                  <span style={{ color: brandColors[label] || '#808080' }}>■</span> {label}: {value}
                </div>
              ))}
          </div>
        </div>
      </Popup>
    </Marker>
  );
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

  return (
    <div className="h-screen relative">
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
  );
}

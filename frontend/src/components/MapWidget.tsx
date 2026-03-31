import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'report' | 'sanction' | 'inspection';
}

export function MapWidget({ points }: { points: MapPoint[] }) {
  const center: [number, number] = points.length > 0 
    ? [points[0].lat, points[0].lng] 
    : [-13.945, -72.036]; // Default to Apurimac/Tambobamba approx

  return (
    <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200">
      <MapContainer center={center} zoom={points.length > 0 ? 12 : 8} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <span className="font-semibold">{p.type.toUpperCase()}</span><br/>
              {p.title}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

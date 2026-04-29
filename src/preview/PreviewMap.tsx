import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Using inline SVG icon to avoid leaflet's default-icon URL issue with Vite bundler
const stationIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 14px; height: 14px; border-radius: 50%;
    background: #c9a84c;
    border: 2px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.6);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const KURAMAE_STATION: [number, number] = [35.7064, 139.7912];

export function PreviewMap() {
  return (
    <MapContainer
      center={KURAMAE_STATION}
      zoom={15}
      style={{
        height: 320,
        width: '100%',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-card)',
      }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <Marker position={KURAMAE_STATION} icon={stationIcon}>
        <Popup>都營淺草線・大江戶線　蔵前站</Popup>
      </Marker>
      {/* Approximate area only — no exact location */}
      <Circle
        center={KURAMAE_STATION}
        radius={400}
        pathOptions={{
          color: '#c9a84c',
          fillColor: '#c9a84c',
          fillOpacity: 0.07,
          weight: 1,
          dashArray: '4 6',
        }}
      />
    </MapContainer>
  );
}

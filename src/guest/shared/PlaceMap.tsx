import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HOME, TILE_ATTR, TILE_URL, type Place } from '@/guest/data/mapPlaces';

function makePinIcon(color: string, num: number) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:50%;background:${color};
      border:2px solid rgba(255,255,255,0.35);
      display:flex;align-items:center;justify-content:center;
      font-size:0.65rem;font-weight:800;color:#fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.5)
    ">${num}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

const homeIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;border-radius:50%;background:#c9a84c;
    border:2px solid rgba(255,255,255,0.5);
    display:flex;align-items:center;justify-content:center;
    font-size:1rem;
    box-shadow:0 0 0 4px rgba(201,168,76,0.25),0 2px 8px rgba(0,0,0,0.6)
  ">🏠</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

interface MapCtx {
  selected: number | null;
  select: (idx: number) => void;
}

const PlaceMapContext = createContext<MapCtx | null>(null);

interface PlaceMapProps {
  places: Place[];
  sidebar: ReactNode;
}

export function PlaceMap({ places, sidebar }: PlaceMapProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const markerRefs = useRef<Record<number, L.Marker | null>>({});

  const lats = places.map((p) => p.lat).concat([HOME[0]]);
  const lngs = places.map((p) => p.lng).concat([HOME[1]]);
  const bounds = L.latLngBounds(
    lats.map((lat, i) => [lat, lngs[i]] as [number, number])
  );

  const select = (idx: number) => {
    setSelected(idx);
    const m = markerRefs.current[idx];
    if (m) m.openPopup();
  };

  return (
    <PlaceMapContext.Provider value={{ selected, select }}>
      <div className="map-layout">
        <aside className="map-sidebar">{sidebar}</aside>

        <div className="map-pane">
          <MapContainer
            bounds={bounds}
            boundsOptions={{ padding: [32, 32] }}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer attribution={TILE_ATTR} url={TILE_URL} maxZoom={19} />

            <Marker position={HOME} icon={homeIcon}>
              <Popup>
                <b style={{ color: '#e8cc7a' }}>🏠 藏前NEXT</b>
                <br />
                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                  住宿位置
                </span>
              </Popup>
            </Marker>

            {places.map((p, i) => (
              <Marker
                key={i}
                position={[p.lat, p.lng]}
                icon={makePinIcon(p.color, i + 1)}
                ref={(ref) => {
                  markerRefs.current[i] = ref;
                }}
                eventHandlers={{
                  click: () => setSelected(i),
                }}
              >
                <Popup>
                  <b>{p.name}</b>
                  <br />
                  <a href={p.url} target="_blank" rel="noreferrer">
                    在 Google Maps 開啟 →
                  </a>
                </Popup>
              </Marker>
            ))}

            {selected !== null && (
              <FlyTo lat={places[selected].lat} lng={places[selected].lng} />
            )}
          </MapContainer>
        </div>
      </div>
    </PlaceMapContext.Provider>
  );
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16, { animate: true });
  }, [lat, lng, map]);
  return null;
}

export interface PlaceCardProps {
  idx: number;
  place: Place;
  mapId?: string;
  /** Pin number override (default: idx + 1) */
  pinNumber?: number;
  /** Right-side meta tags (e.g., 便利商店 / 🤑) */
  tags?: ReactNode;
}

export function PlaceCard({ idx, place, mapId, pinNumber, tags }: PlaceCardProps) {
  const ctx = useContext(PlaceMapContext);
  const selected = ctx?.selected === idx;

  return (
    <div
      className={`place-card${selected ? ' map-active' : ''}`}
      data-mapid={mapId}
      data-idx={idx}
      onClick={() => ctx?.select(idx)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') ctx?.select(idx);
      }}
    >
      <div>
        <span className="place-num" style={{ background: place.color }}>
          {pinNumber ?? idx + 1}
        </span>
        <div style={{ display: 'inline-block' }}>
          <div className="place-name">{place.name}</div>
          {tags && <div className="place-meta">{tags}</div>}
        </div>
      </div>
      <a
        href={place.url}
        target="_blank"
        rel="noreferrer"
        className="map-btn"
        onClick={(e) => e.stopPropagation()}
        title="在 Google Maps 開啟"
      >
        📍
      </a>
    </div>
  );
}

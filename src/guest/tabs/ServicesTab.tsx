import { PlaceCard, PlaceMap } from '@/guest/shared/PlaceMap';
import { mapPlaces } from '@/guest/data/mapPlaces';

const places = mapPlaces.services;

export function ServicesTab() {
  // First 3 are convenience stores, last 2 are supermarkets
  const conv = places.slice(0, 3);
  const sup = places.slice(3);

  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">🏪</div>
        <h2>附近超市 &amp; 便利商店</h2>
      </div>
      <PlaceMap
        places={places}
        sidebar={
          <>
            <div className="section-label">便利商店</div>
            {conv.map((p, i) => (
              <PlaceCard
                key={p.name}
                idx={i}
                place={p}
                mapId="services"
                tags={<span className="tag tag-green">便利商店</span>}
              />
            ))}
            <div className="section-label">超市</div>
            {sup.map((p, i) => (
              <PlaceCard
                key={p.name}
                idx={i + conv.length}
                place={p}
                mapId="services"
                tags={<span className="tag tag-red">超市</span>}
              />
            ))}
          </>
        }
      />
    </div>
  );
}

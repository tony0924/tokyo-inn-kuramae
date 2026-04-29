import { PlaceCard, PlaceMap } from '@/guest/shared/PlaceMap';
import { mapPlaces } from '@/guest/data/mapPlaces';

const places = mapPlaces.cityguide;

const meta: Record<string, { extra: string }> = {
  '淺草寺 雷門': { extra: '免費' },
  合羽橋道具街: { extra: '🤑' },
  東京國立博物館: { extra: '🤑' },
  上野之森美術館: { extra: '🤑🤑' },
};

export function CityguideTab() {
  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">🗺️</div>
        <h2>景點推薦</h2>
      </div>

      <PlaceMap
        places={places}
        sidebar={places.map((p, i) => (
          <PlaceCard
            key={p.name}
            idx={i}
            place={p}
            mapId="cityguide"
            tags={
              <>
                <span className="tag tag-red">景點</span>
                <span
                  className={`tag ${meta[p.name]?.extra === '免費' ? 'tag-yellow' : 'tag-gold'}`}
                >
                  {meta[p.name]?.extra ?? '🤑'}
                </span>
              </>
            }
          />
        ))}
      />
    </div>
  );
}

import { PlaceCard, PlaceMap } from '@/guest/shared/PlaceMap';
import { useGuestPlaces } from '@/guest/useGuestPlaces';

export function CityguideTab() {
  const { places, loading } = useGuestPlaces('cityguide');

  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">🗺️</div>
        <h2>景點推薦</h2>
      </div>

      {loading && <p className="photo-hint">正在同步後台新增的推薦地點…</p>}
      <PlaceMap
        places={places}
        sidebar={places.map((p, i) => (
          <PlaceCard
            key={p.id ?? p.name}
            idx={i}
            place={p}
            mapId="cityguide"
            tags={
              <>
                <span className="tag tag-red">景點</span>
                <span className="tag tag-gold rating-tag">{renderRatingStars(p.rating ?? 1)}</span>
              </>
            }
          />
        ))}
      />
    </div>
  );
}

function renderRatingStars(rating: number) {
  const safeRating = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <>
      <span className="rating-stars" aria-label={`推薦 ${safeRating} 顆星`}>
        {'★'.repeat(safeRating)}
      </span>
      <span className="rating-stars rating-stars-muted" aria-hidden="true">
        {'★'.repeat(5 - safeRating)}
      </span>
    </>
  );
}

import { PlaceCard, PlaceMap } from '@/guest/shared/PlaceMap';
import { useGuestPlaces } from '@/guest/useGuestPlaces';

export function ServicesTab() {
  const { places, loading } = useGuestPlaces('services');
  const conv = places.filter((place) => place.category === 'convenience');
  const sup = places.filter((place) => place.category === 'supermarket');

  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">🏪</div>
        <h2>附近超市 &amp; 便利商店</h2>
      </div>
      {loading && <p className="photo-hint">正在同步後台新增的推薦地點…</p>}
      <PlaceMap
        places={places}
        sidebar={
          <>
            <div className="section-label">便利商店</div>
            {conv.map((p) => (
              <PlaceCard
                key={p.id ?? p.name}
                idx={places.indexOf(p)}
                place={p}
                mapId="services"
                tags={
                  <>
                    <span className="tag tag-green">便利商店</span>
                    <span className="tag tag-gold rating-tag">{renderRatingStars(p.rating ?? 1)}</span>
                  </>
                }
              />
            ))}
            <div className="section-label">超市</div>
            {sup.map((p) => (
              <PlaceCard
                key={p.id ?? p.name}
                idx={places.indexOf(p)}
                place={p}
                mapId="services"
                tags={
                  <>
                    <span className="tag tag-red">超市</span>
                    <span className="tag tag-gold rating-tag">{renderRatingStars(p.rating ?? 1)}</span>
                  </>
                }
              />
            ))}
          </>
        }
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

import { PlaceCard, PlaceMap } from '@/guest/shared/PlaceMap';
import { useGuestPlaces } from '@/guest/useGuestPlaces';

export function RestaurantTab() {
  const { places, loading } = useGuestPlaces('restaurant');
  const food = places.filter((place) => place.category === 'restaurant');
  const cafe = places.filter((place) => place.category === 'cafe');
  const numberMap = new Map(places.map((place, index) => [placeKey(place), getCategoryNumber(places, index)]));

  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">🍜</div>
        <h2>餐廳推薦</h2>
      </div>

      <div className="glass-card avoid-card">
        <div className="card-header">
          <div className="card-icon">⚠️</div>
          <div className="card-title">餐廳避雷</div>
        </div>
        <ul className="bullet-list">
          <li>門口斜對面的麵包店不太推薦。</li>
          <li>巷口的鰻魚飯不太推薦。</li>
        </ul>
      </div>

      {loading && <p className="photo-hint">正在同步後台新增的推薦地點…</p>}
      <PlaceMap
        places={places}
        getMarkerNumber={(place) => numberMap.get(placeKey(place)) ?? 1}
        sidebar={
          <>
            <div className="section-label">餐廳</div>
            {food.map((p) => (
              <PlaceCard
                key={p.id ?? p.name}
                idx={places.indexOf(p)}
                place={p}
                mapId="restaurant"
                pinNumber={numberMap.get(placeKey(p)) ?? 1}
                tags={
                  <>
                    <span className="tag tag-pink">餐廳</span>
                    <span className="tag tag-gold rating-tag">{renderRatingStars(p.rating ?? 1)}</span>
                  </>
                }
              />
            ))}
            <div className="section-label">咖啡廳 &amp; 甜點</div>
            {cafe.map((p) => (
              <PlaceCard
                key={p.id ?? p.name}
                idx={places.indexOf(p)}
                place={p}
                mapId="restaurant"
                pinNumber={numberMap.get(placeKey(p)) ?? 1}
                tags={
                  <>
                    <span className="tag tag-purple">咖啡廳</span>
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

function placeKey(place: { id?: string; name: string; category?: string }) {
  return `${place.id ?? place.name}::${place.category ?? ''}`;
}

function getCategoryNumber(
  places: Array<{ category?: string }>,
  targetIndex: number
) {
  const category = places[targetIndex]?.category;
  return places.slice(0, targetIndex + 1).filter((place) => place.category === category).length;
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

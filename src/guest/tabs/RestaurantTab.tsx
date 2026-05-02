import { PlaceCard, PlaceMap } from '@/guest/shared/PlaceMap';
import { mapPlaces } from '@/guest/data/mapPlaces';

const places = mapPlaces.restaurant;

// Map matching the legacy structure: first 6 are restaurants, rest are cafés / sweets.
const RESTAURANT_TAGS: Record<string, string> = {
  淺草炸肉餅: '🤑',
  'Tonkatsu Yutaka': '🤑🤑',
  融化漢堡排福吉: '🤑🤑',
  '拉麵 改': '🤑',
  '拉麵元樂 總本店': '🤑',
  'シンプル ラーメン': '🤑',
  'HATCOFFEE': '🤑🤑',
  KURAMAE_CANNELE: '🤑',
  Confectionery_Lemon_Pie: '🤑🤑',
  Shinonome_Seipansho: '🤑',
  '淺草花月堂': '🤑',
  'Dandelion Chocolate': '🤑🤑',
};

const moneyTagFor = (name: string): string => {
  // Match by name; default to 🤑
  return RESTAURANT_TAGS[name] ?? '🤑';
};

export function RestaurantTab() {
  const food = places.slice(0, 6);
  const cafe = places.slice(6);

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

      <PlaceMap
        places={places}
        sidebar={
          <>
            <div className="section-label">餐廳</div>
            {food.map((p, i) => (
              <PlaceCard
                key={p.name}
                idx={i}
                place={p}
                mapId="restaurant"
                tags={
                  <>
                    <span className="tag tag-pink">餐廳</span>
                    <span className="tag tag-gold">{moneyTagFor(p.name)}</span>
                  </>
                }
              />
            ))}
            <div className="section-label">咖啡廳 &amp; 甜點</div>
            {cafe.map((p, i) => (
              <PlaceCard
                key={p.name}
                idx={i + food.length}
                place={p}
                mapId="restaurant"
                tags={
                  <>
                    <span className="tag tag-purple">咖啡廳</span>
                    <span className="tag tag-gold">{moneyTagFor(p.name)}</span>
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

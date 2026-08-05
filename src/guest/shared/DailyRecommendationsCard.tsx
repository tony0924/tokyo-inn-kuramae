import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecommendations } from '@/admin/useRecommendations';
import { getGuestPlaces } from '@/guest/useGuestPlaces';
import type { Place, PlaceCategory } from '@/guest/data/mapPlaces';
import { useAuth } from '@/auth/AuthProvider';
import { getStoredGuestAccessCode } from '@/lib/guestAccessCodes';
import { recordGuestPageEvent } from '@/lib/guestAnalytics';

const CATEGORY_COPY: Partial<
  Record<PlaceCategory, { icon: string; label: string; fallback: string }>
> = {
  restaurant: {
    icon: '🍜',
    label: '今日餐廳',
    fallback: '安排一餐在地美食，從藏前慢慢探索東京。',
  },
  cafe: {
    icon: '☕',
    label: '今日咖啡',
    fallback: '散步途中休息一下，感受藏前的咖啡與甜點。',
  },
  sight: {
    icon: '🗺️',
    label: '今日景點',
    fallback: '適合排進今天行程的東京散步景點。',
  },
};

export function DailyRecommendationsCard({ stayDay }: { stayDay: number }) {
  const navigate = useNavigate();
  const { recommendations, loading } = useRecommendations();
  const { user } = useAuth();
  const places = useMemo(() => {
    const restaurantPlaces = getGuestPlaces('restaurant', recommendations);
    const sightPlaces = getGuestPlaces('cityguide', recommendations);
    return selectDailyPlaces([...restaurantPlaces, ...sightPlaces], stayDay);
  }, [recommendations, stayDay]);

  if (loading) {
    return (
      <section className="daily-recommendations-card daily-recommendations-loading" aria-busy="true">
        <span aria-hidden="true">📍</span>
        <div>
          <strong>正在整理今天的推薦…</strong>
          <p>從餐廳、咖啡與景點中挑選適合今天的去處。</p>
        </div>
      </section>
    );
  }

  if (places.length === 0) return null;

  return (
    <section className="daily-recommendations-card" aria-labelledby="daily-recommendations-title">
      <div className="daily-recommendations-heading">
        <div>
          <p>DAY {stayDay} · TODAY&apos;S PICKS</p>
          <h2 id="daily-recommendations-title">今天可以去哪裡</h2>
        </div>
        <span>每日輪替</span>
      </div>

      <div className="daily-recommendations-grid">
        {places.map((place) => {
          const category = CATEGORY_COPY[place.category ?? 'sight'] ?? CATEGORY_COPY.sight!;
          return (
            <a
              key={`${place.category}-${place.id ?? place.name}`}
              className="daily-place-card"
              href={place.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                recordGuestPageEvent({
                  eventType: 'recommendation_click',
                  path: '/guest/home',
                  user,
                  guestAccessCode: !user ? getStoredGuestAccessCode() : null,
                  targetId: place.id || place.name,
                  targetLabel: place.name,
                }).catch((error) => console.warn('record recommendation click failed', error));
              }}
            >
              <div className="daily-place-topline">
                <span aria-hidden="true">{category.icon}</span>
                <small>{category.label}</small>
              </div>
              <h3>{place.name}</h3>
              <p>{place.note?.trim() || category.fallback}</p>
              <div className="daily-place-footer">
                <span aria-label={`推薦 ${safeRating(place.rating)} 顆星`}>
                  {'★'.repeat(safeRating(place.rating))}
                </span>
                <strong>開啟地圖 ↗</strong>
              </div>
            </a>
          );
        })}
      </div>

      <div className="daily-recommendations-actions">
        <button type="button" onClick={() => navigate('/guest/restaurant')}>
          查看所有餐廳
        </button>
        <button type="button" onClick={() => navigate('/guest/cityguide')}>
          查看所有景點
        </button>
      </div>
    </section>
  );
}

function selectDailyPlaces(places: Place[], stayDay: number): Place[] {
  const dayIndex = Math.max(0, stayDay - 1);
  const categories: PlaceCategory[] = ['sight', 'restaurant', 'cafe'];

  return categories
    .map((category, categoryIndex) => {
      const matches = places
        .filter((place) => place.category === category)
        .sort(
          (first, second) =>
            safeRating(second.rating) - safeRating(first.rating)
            || first.name.localeCompare(second.name, 'zh-Hant')
        );
      if (matches.length === 0) return null;
      return matches[(dayIndex + categoryIndex) % matches.length];
    })
    .filter((place): place is Place => place !== null);
}

function safeRating(rating?: number): number {
  return Math.max(1, Math.min(5, Math.round(rating ?? 1)));
}

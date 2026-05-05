import { useMemo } from 'react';
import { useRecommendations } from '@/admin/useRecommendations';
import { mapPlaces, type MapKey, type Place } from '@/guest/data/mapPlaces';

const CATEGORY_COLOR: Record<string, string> = {
  convenience: '#4a9eff',
  supermarket: '#56d4b0',
  restaurant: '#e88ba0',
  cafe: '#b08fe8',
  sight: '#ff7b7b',
};

export function useGuestPlaces(section: MapKey): { places: Place[]; loading: boolean } {
  const { recommendations, loading } = useRecommendations();

  const places = useMemo(() => {
    const customPlaces = recommendations
      .filter((item) => item.active && item.section === section)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map<Place>((item) => ({
        id: item.id,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        color: CATEGORY_COLOR[item.category] ?? '#c9a84c',
        url: item.url,
        category: item.category,
        note: item.note,
        source: 'admin',
      }));

    return [...mapPlaces[section], ...customPlaces];
  }, [recommendations, section]);

  return { places, loading };
}

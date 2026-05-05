import { useEffect, useState } from 'react';
import { watchRecommendations } from '@/lib/recommendations';
import type { Recommendation } from '@/types';

export function useRecommendations(): {
  recommendations: Recommendation[];
  loading: boolean;
} {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = watchRecommendations((items) => {
      setRecommendations(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { recommendations, loading };
}

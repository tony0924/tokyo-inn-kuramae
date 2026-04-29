import { useEffect, useState } from 'react';
import { watchKeys } from '@/lib/keys';
import type { KeyItem } from '@/types';

export function useKeys(): { keys: KeyItem[]; loading: boolean } {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = watchKeys((items) => {
      setKeys(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { keys, loading };
}

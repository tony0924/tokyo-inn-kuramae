import { useEffect, useState } from 'react';
import { watchAllBookings } from '@/lib/bookings';
import type { Booking } from '@/types';

export function useBookings(): { bookings: Booking[]; loading: boolean; error: string | null } {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = watchAllBookings((items) => {
      setError(null);
      setBookings(items);
      setLoading(false);
    }, () => {
      setError("預約資料載入失敗，請重新整理後再試。");
      setLoading(false);
    });
    return unsub;
  }, []);

  return { bookings, loading, error };
}

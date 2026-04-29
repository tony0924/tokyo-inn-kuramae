import { useEffect, useState } from 'react';
import { watchAllBookings } from '@/lib/bookings';
import type { Booking } from '@/types';

export function useBookings(): { bookings: Booking[]; loading: boolean } {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = watchAllBookings((items) => {
      setBookings(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { bookings, loading };
}

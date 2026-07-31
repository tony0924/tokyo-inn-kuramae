import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { watchBooking } from '@/lib/bookings';
import { resolveAdminGuestPreviewBookingId } from '@/lib/bookingPreview';
import {
  getStoredGuestAccessCode,
} from '@/lib/guestAccessCodes';
import { getGuestPortalData } from '@/lib/guestGuide';
import type { Booking } from '@/types';

interface GuestBookingState {
  booking: Booking | null;
  loading: boolean;
  error: boolean;
}

export function useGuestBooking(): GuestBookingState {
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function subscribe() {
      setLoading(true);
      setError(false);
      setBooking(null);

      let bookingId =
        user?.role === 'guest'
          ? user.bookingId
          : null;

      if (user?.role === 'admin') {
        bookingId = await resolveAdminGuestPreviewBookingId().catch(() => null);
      }

      if (!user) {
        const code = getStoredGuestAccessCode();
        if (code) {
          const portal = await getGuestPortalData(code).catch(() => null);
          if (!cancelled) {
            setBooking(portal?.booking ?? null);
            setLoading(false);
            setError(!portal);
          }
          return;
        }
      }

      if (cancelled) return;
      if (!bookingId) {
        setLoading(false);
        return;
      }

      unsubscribe = watchBooking(
        bookingId,
        (next) => {
          if (cancelled) return;
          setBooking(next);
          setLoading(false);
          setError(false);
        },
        () => {
          if (cancelled) return;
          setLoading(false);
          setError(true);
        }
      );
    }

    void subscribe();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user]);

  return { booking, loading, error };
}

import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { selectOperationalBooking } from './stayStatus';
import type { Booking, BookingDoc } from '@/types';

const ADMIN_GUEST_PREVIEW_BOOKING_KEY = 'admin-guest-preview-booking-id';

export function setAdminGuestPreviewBookingId(bookingId: string): void {
  try {
    sessionStorage.setItem(ADMIN_GUEST_PREVIEW_BOOKING_KEY, bookingId);
  } catch {
    // Preview remains available without personalization when storage is unavailable.
  }
}

export function getAdminGuestPreviewBookingId(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_GUEST_PREVIEW_BOOKING_KEY);
  } catch {
    return null;
  }
}

export async function resolveAdminGuestPreviewBookingId(): Promise<string | null> {
  const storedBookingId = getAdminGuestPreviewBookingId();
  if (storedBookingId) {
    const storedBooking = await getDoc(doc(db, 'bookings', storedBookingId));
    if (storedBooking.exists()) return storedBookingId;
  }

  const snapshot = await getDocs(collection(db, 'bookings'));
  const bookings: Booking[] = snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as BookingDoc),
  }));
  const selected = selectOperationalBooking(bookings)
    ?? [...bookings].sort((a, b) => b.checkIn.toMillis() - a.checkIn.toMillis())[0]
    ?? null;

  if (selected) setAdminGuestPreviewBookingId(selected.id);
  return selected?.id ?? null;
}

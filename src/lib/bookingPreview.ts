import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { selectOperationalBooking } from './stayStatus';
import type { Booking, BookingDoc } from '@/types';

const ADMIN_GUEST_PREVIEW_BOOKING_KEY = 'admin-guest-preview-booking-id';
const ADMIN_GUEST_PREVIEW_EMPTY_VALUE = '__no_guest__';

export function setAdminGuestPreviewBookingId(bookingId: string | null): void {
  try {
    sessionStorage.setItem(
      ADMIN_GUEST_PREVIEW_BOOKING_KEY,
      bookingId ?? ADMIN_GUEST_PREVIEW_EMPTY_VALUE
    );
  } catch {
    // Preview remains available without personalization when storage is unavailable.
  }
}

export function getAdminGuestPreviewBookingId(): string | null {
  try {
    const stored = sessionStorage.getItem(ADMIN_GUEST_PREVIEW_BOOKING_KEY);
    return stored === ADMIN_GUEST_PREVIEW_EMPTY_VALUE ? null : stored;
  } catch {
    return null;
  }
}

export async function resolveAdminGuestPreviewBookingId(): Promise<string | null> {
  let storedValue: string | null = null;
  try {
    storedValue = sessionStorage.getItem(ADMIN_GUEST_PREVIEW_BOOKING_KEY);
  } catch {
    // Fall through to the automatic preview selection.
  }

  if (storedValue === ADMIN_GUEST_PREVIEW_EMPTY_VALUE) return null;

  const storedBookingId = storedValue;
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

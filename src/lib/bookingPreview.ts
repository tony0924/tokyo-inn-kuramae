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

import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'guest' | 'pending';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface UserDoc {
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  active: boolean;
  bookingId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BookingDoc {
  guestUid: string | null;
  guestEmail: string;
  guestName: string;
  guestAccessCode?: string | null;
  partySize: number;
  checkIn: Timestamp;
  checkOut: Timestamp;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentNotes: string;
  keyCode: string | null;
  keyLentAt: Timestamp | null;
  keyReturnedAt: Timestamp | null;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Booking extends BookingDoc {
  id: string;
}

export interface User extends UserDoc {
  uid: string;
}

export interface EmailAccessDoc {
  email: string;
  role: Extract<UserRole, 'admin' | 'guest'>;
  active: boolean;
  bookingId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EmailAccess extends EmailAccessDoc {
  id: string;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
}

export interface NotificationSettings {
  senderName: string;
  senderEmail: string;
  bookingCreatedReminder: NotificationTemplate;
  checkInReminder: NotificationTemplate;
  checkoutAdminReminder: NotificationTemplate;
  updatedAt?: Timestamp;
}

export interface GuestAccessCodeDoc {
  code: string;
  label: string;
  bookingId?: string | null;
  guestEmail?: string | null;
  guestName?: string | null;
  active: boolean;
  startsAt: Timestamp;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GuestAccessCode extends GuestAccessCodeDoc {
  id: string;
}

export interface KeyDoc {
  code: string;
  label: string;
  active: boolean;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface KeyItem extends KeyDoc {
  id: string;
}

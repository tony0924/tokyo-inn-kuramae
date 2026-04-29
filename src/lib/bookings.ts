import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Booking, BookingDoc } from '@/types';
import { generateGuestCode, normalizeGuestCode } from './guestAccessCodes';

const BOOKINGS = 'bookings';

export function watchAllBookings(cb: (bookings: Booking[]) => void): Unsubscribe {
  const q = query(collection(db, BOOKINGS), orderBy('checkIn', 'desc'));
  return onSnapshot(q, (snap) => {
    const items: Booking[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as BookingDoc),
    }));
    cb(items);
  });
}

export type NewBookingInput = {
  guestUid: string | null;
  guestEmail: string;
  guestName: string;
  guestAccessCode?: string | null;
  partySize: number;
  checkIn: Date;
  checkOut: Date;
  amount: number;
  paymentStatus: BookingDoc['paymentStatus'];
  paymentNotes: string;
  keyCode: string | null;
  notes: string;
};

export async function createBooking(input: NewBookingInput): Promise<string> {
  const ref = await addDoc(collection(db, BOOKINGS), {
    guestUid: input.guestUid,
    guestEmail: input.guestEmail.trim().toLowerCase(),
    guestName: input.guestName,
    guestAccessCode: input.guestAccessCode ?? null,
    partySize: input.partySize,
    checkIn: Timestamp.fromDate(input.checkIn),
    checkOut: Timestamp.fromDate(input.checkOut),
    amount: input.amount,
    paymentStatus: input.paymentStatus,
    paymentNotes: input.paymentNotes,
    keyCode: input.keyCode,
    keyLentAt: null,
    keyReturnedAt: null,
    notes: input.notes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function getGuestCodeWindow(_checkIn: Date, checkOut: Date): {
  startsAt: Date;
  expiresAt: Date;
} {
  const startsAt = new Date();

  const expiresAt = new Date(checkOut);
  expiresAt.setHours(0, 0, 0, 0);
  expiresAt.setDate(expiresAt.getDate() + 2);

  return { startsAt, expiresAt };
}

export async function createBookingWithGuestAccessCode(
  input: Omit<NewBookingInput, 'guestAccessCode'>
): Promise<{ bookingId: string; guestAccessCode: string }> {
  const bookingRef = doc(collection(db, BOOKINGS));
  const guestAccessCode = normalizeGuestCode(generateGuestCode());
  const { startsAt, expiresAt } = getGuestCodeWindow(input.checkIn, input.checkOut);
  const batch = writeBatch(db);

  batch.set(bookingRef, {
    guestUid: input.guestUid,
    guestEmail: input.guestEmail.trim().toLowerCase(),
    guestName: input.guestName,
    guestAccessCode,
    partySize: input.partySize,
    checkIn: Timestamp.fromDate(input.checkIn),
    checkOut: Timestamp.fromDate(input.checkOut),
    amount: input.amount,
    paymentStatus: input.paymentStatus,
    paymentNotes: input.paymentNotes,
    keyCode: input.keyCode,
    keyLentAt: null,
    keyReturnedAt: null,
    notes: input.notes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'guestAccessCodes', guestAccessCode), {
    code: guestAccessCode,
    label: `${input.guestName} 的預約訪客碼`,
    bookingId: bookingRef.id,
    guestEmail: input.guestEmail.trim().toLowerCase(),
    guestName: input.guestName,
    active: true,
    startsAt: Timestamp.fromDate(startsAt),
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return { bookingId: bookingRef.id, guestAccessCode };
}

export async function updateBooking(
  id: string,
  patch: Partial<Omit<BookingDoc, 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateDoc(doc(db, BOOKINGS, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBooking(id: string): Promise<void> {
  await deleteDoc(doc(db, BOOKINGS, id));
}

export async function deleteBookingWithGuestAccessCode(
  id: string,
  guestAccessCode?: string | null
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, BOOKINGS, id));
  if (guestAccessCode) {
    batch.delete(doc(db, 'guestAccessCodes', normalizeGuestCode(guestAccessCode)));
  }
  await batch.commit();
}

export async function markKeyLent(id: string, at: Date = new Date()): Promise<void> {
  await updateBooking(id, { keyLentAt: Timestamp.fromDate(at) });
}

export async function markKeyReturned(id: string, at: Date = new Date()): Promise<void> {
  await updateBooking(id, { keyReturnedAt: Timestamp.fromDate(at) });
}

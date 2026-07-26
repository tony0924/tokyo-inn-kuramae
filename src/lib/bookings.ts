import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Booking, BookingDoc, KeyLoanRecord } from '@/types';
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

export function watchBooking(
  id: string,
  cb: (booking: Booking | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, BOOKINGS, id),
    (snap) => {
      cb(
        snap.exists()
          ? { id: snap.id, ...(snap.data() as BookingDoc) }
          : null
      );
    },
    (error) => onError?.(error)
  );
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
  stayType?: BookingDoc['stayType'];
  expectedRevenue?: number;
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
    stayType: input.stayType ?? 'paid_guest',
    expectedRevenue: input.expectedRevenue ?? input.amount,
    paymentStatus: input.paymentStatus,
    paymentNotes: input.paymentNotes,
    keyCode: input.keyCode,
    keyLentAt: null,
    keyReturnedAt: null,
    keyHistory: [],
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
    stayType: input.stayType ?? 'paid_guest',
    expectedRevenue: input.expectedRevenue ?? input.amount,
    paymentStatus: input.paymentStatus,
    paymentNotes: input.paymentNotes,
    keyCode: input.keyCode,
    keyLentAt: null,
    keyReturnedAt: null,
    keyHistory: [],
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

export async function migrateHostedStayGuestName(): Promise<number> {
  const legacyQuery = query(collection(db, BOOKINGS), where('guestName', '==', '婷瑜'));
  const snapshot = await getDocs(legacyQuery);
  if (snapshot.empty) return 0;

  const batch = writeBatch(db);
  snapshot.docs.forEach((bookingSnapshot) => {
    const booking = bookingSnapshot.data() as BookingDoc;
    batch.update(bookingSnapshot.ref, {
      guestName: '郭婷渝',
      stayType: 'complimentary',
      expectedRevenue: 0,
      updatedAt: serverTimestamp(),
    });

    if (booking.guestAccessCode) {
      batch.update(doc(db, 'guestAccessCodes', normalizeGuestCode(booking.guestAccessCode)), {
        guestName: '郭婷渝',
        label: '郭婷渝 的預約訪客碼',
        updatedAt: serverTimestamp(),
      });
    }
  });
  await batch.commit();
  return snapshot.size;
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

export function recordKeyLoan(
  history: KeyLoanRecord[] | undefined,
  keyCode: string | null,
  lentAt: Timestamp | null,
  returnedAt: Timestamp | null
): KeyLoanRecord[] {
  const existing = history ?? [];
  if (!keyCode || !lentAt) return existing;

  const normalizedCode = keyCode.trim().toUpperCase();
  let matchingIndex = -1;
  for (let index = existing.length - 1; index >= 0; index -= 1) {
    const item = existing[index];
    if (
      item.keyCode.trim().toUpperCase() === normalizedCode &&
      item.lentAt.toMillis() === lentAt.toMillis()
    ) {
      matchingIndex = index;
      break;
    }
  }
  const record: KeyLoanRecord = { keyCode: normalizedCode, lentAt, returnedAt };

  if (matchingIndex < 0) return [...existing, record];
  return existing.map((item, index) => (index === matchingIndex ? record : item));
}

export async function markKeyLent(booking: Booking, at: Date = new Date()): Promise<void> {
  const lentAt = Timestamp.fromDate(at);
  await updateBooking(booking.id, {
    keyLentAt: lentAt,
    keyReturnedAt: null,
    keyHistory: recordKeyLoan(booking.keyHistory, booking.keyCode, lentAt, null),
  });
}

export async function markKeyReturned(booking: Booking, at: Date = new Date()): Promise<void> {
  const returnedAt = Timestamp.fromDate(at);
  await updateBooking(booking.id, {
    keyReturnedAt: returnedAt,
    keyHistory: recordKeyLoan(booking.keyHistory, booking.keyCode, booking.keyLentAt, returnedAt),
  });
}

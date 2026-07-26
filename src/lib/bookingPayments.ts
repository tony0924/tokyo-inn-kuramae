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
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  BookingPayment,
  BookingPaymentDoc,
  BookingPaymentKind,
  BookingPaymentMethod,
} from '@/types';

const COLLECTION = 'bookingPayments';

export function watchBookingPayments(cb: (payments: BookingPayment[]) => void): Unsubscribe {
  const paymentQuery = query(collection(db, COLLECTION), orderBy('receivedAt', 'desc'));
  return onSnapshot(paymentQuery, (snapshot) => {
    cb(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as BookingPaymentDoc),
      }))
    );
  });
}

export async function createBookingPayment(input: {
  bookingId: string;
  guestName: string;
  amount: number;
  kind: BookingPaymentKind;
  method: BookingPaymentMethod;
  receivedAt: Date;
  note: string;
}): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    bookingId: input.bookingId,
    guestName: input.guestName.trim(),
    amount: input.amount,
    kind: input.kind,
    method: input.method,
    receivedAt: Timestamp.fromDate(input.receivedAt),
    note: input.note.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBookingPayment(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

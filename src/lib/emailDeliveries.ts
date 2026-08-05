import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import type {
  EmailDelivery,
  EmailDeliveryDoc,
  GuestEmailType,
} from '@/types';

export function watchEmailDeliveries(
  cb: (deliveries: EmailDelivery[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const deliveriesQuery = query(
    collection(db, 'emailDeliveries'),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  return onSnapshot(
    deliveriesQuery,
    (snapshot) => cb(snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as EmailDeliveryDoc),
    }))),
    (error) => onError?.(error)
  );
}

const sendGuestBookingEmailCallable = httpsCallable<
  { bookingId: string; type: GuestEmailType; testOnly: boolean },
  { status: 'sent'; deliveryId: string }
>(functions, 'sendGuestBookingEmail');

export async function sendGuestBookingEmail(input: {
  bookingId: string;
  type: GuestEmailType;
  testOnly?: boolean;
}): Promise<void> {
  await sendGuestBookingEmailCallable({
    bookingId: input.bookingId,
    type: input.type,
    testOnly: input.testOnly === true,
  });
}

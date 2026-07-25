import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  AdminNotification,
  AdminNotificationReadState,
} from '@/types';

const COLLECTION = 'adminNotifications';

export function watchAdminNotifications(
  onUpdate: (notifications: AdminNotification[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const notificationsQuery = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      onUpdate(snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<AdminNotification, 'id'>),
      })));
    },
    onError
  );
}

export function watchAdminNotificationReadState(
  uid: string,
  onUpdate: (state: AdminNotificationReadState | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'adminNotificationReads', uid),
    (snapshot) => {
      onUpdate(snapshot.exists()
        ? snapshot.data() as AdminNotificationReadState
        : null);
    },
    onError
  );
}

export async function markAdminNotificationsRead(
  uid: string,
  lastReadAt?: Timestamp
): Promise<void> {
  await setDoc(doc(db, 'adminNotificationReads', uid), {
    ownerUid: uid,
    lastReadAt: lastReadAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

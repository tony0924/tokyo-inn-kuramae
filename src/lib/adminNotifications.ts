import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { AdminNotification } from '@/types';

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

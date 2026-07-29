import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { normalizeGuestCode } from './guestAccessCodes';
import type {
  GuestCommunityMessage,
  GuestCommunityMessageDoc,
} from '@/types';

const COMMUNITY_MESSAGES = 'guestCommunityMessages';

export function watchGuestCommunityMessages(
  cb: (messages: GuestCommunityMessage[]) => void,
  onError?: (error: Error) => void,
  maxItems = 200
): Unsubscribe {
  const q = query(
    collection(db, COMMUNITY_MESSAGES),
    orderBy('createdAt', 'desc'),
    limit(maxItems)
  );
  return onSnapshot(
    q,
    (snap) => cb(
      snap.docs
        .map((item) => ({ id: item.id, ...(item.data() as GuestCommunityMessageDoc) }))
        .reverse()
    ),
    (error) => onError?.(error)
  );
}

export async function createGuestCommunityMessage(input: {
  guestAccessCode?: string | null;
  body: string;
}): Promise<void> {
  const body = input.body.trim();
  if (!body) throw new Error('請輸入留言內容');
  if (body.length > 1000) throw new Error('留言請控制在 1,000 字以內');

  const submit = httpsCallable<
    { guestAccessCode: string | null; body: string },
    { id: string }
  >(functions, 'createGuestCommunityMessage');
  await submit({
    guestAccessCode: input.guestAccessCode
      ? normalizeGuestCode(input.guestAccessCode)
      : null,
    body,
  });
}

export async function deleteGuestCommunityMessage(id: string): Promise<void> {
  await deleteDoc(doc(db, COMMUNITY_MESSAGES, id));
}

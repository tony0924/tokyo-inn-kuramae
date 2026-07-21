import {
  addDoc,
  collection,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizeGuestCode } from './guestAccessCodes';
import type { GuestMessage, GuestMessageDoc } from '@/types';

const BOARDS = 'guestMessageBoards';

function messagesRef(guestAccessCode: string) {
  return collection(db, BOARDS, normalizeGuestCode(guestAccessCode), 'messages');
}

function toMessage(id: string, data: GuestMessageDoc): GuestMessage {
  return { id, ...data };
}

export function watchGuestMessages(
  guestAccessCode: string,
  cb: (messages: GuestMessage[]) => void
): Unsubscribe {
  const q = query(messagesRef(guestAccessCode), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((item) => toMessage(item.id, item.data() as GuestMessageDoc))));
}

export function watchAllGuestMessages(cb: (messages: GuestMessage[]) => void): Unsubscribe {
  const q = query(collectionGroup(db, 'messages'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((item) => toMessage(item.id, item.data() as GuestMessageDoc))));
}

export async function createGuestMessage(input: {
  guestAccessCode: string;
  guestName: string;
  guestEmail?: string | null;
  body: string;
}): Promise<void> {
  const body = input.body.trim();
  if (!body) throw new Error('請輸入留言內容');
  if (body.length > 1000) throw new Error('留言請控制在 1,000 字以內');

  await addDoc(messagesRef(input.guestAccessCode), {
    guestAccessCode: normalizeGuestCode(input.guestAccessCode),
    guestName: input.guestName.trim() || '訪客',
    guestEmail: input.guestEmail?.trim().toLowerCase() || null,
    authorType: 'guest',
    authorName: input.guestName.trim() || '訪客',
    body,
    createdAt: serverTimestamp(),
  });
}

export async function createAdminReply(input: {
  guestAccessCode: string;
  guestName: string;
  guestEmail?: string | null;
  adminName: string;
  body: string;
}): Promise<void> {
  const body = input.body.trim();
  if (!body) throw new Error('請輸入回覆內容');
  if (body.length > 1000) throw new Error('回覆請控制在 1,000 字以內');

  await addDoc(messagesRef(input.guestAccessCode), {
    guestAccessCode: normalizeGuestCode(input.guestAccessCode),
    guestName: input.guestName.trim() || '訪客',
    guestEmail: input.guestEmail?.trim().toLowerCase() || null,
    authorType: 'admin',
    authorName: input.adminName.trim() || '管理員',
    body,
    createdAt: serverTimestamp(),
  });
}

import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizeGuestCode } from './guestAccessCodes';
import type {
  GuestAccessCode,
  GuestPageView,
  GuestPageViewDoc,
  GuestPageViewEventType,
  GuestPageViewVisitorType,
  User,
} from '@/types';

const COLLECTION = 'guestPageViews';
const DEVICE_KEY = 'tokyoInnGuestDeviceId';
const DEDUPE_KEY = 'tokyoInnLastGuestAnalyticsEvent';

function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const id =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

function shouldSkipDuplicate(eventKey: string): boolean {
  const now = Date.now();
  const last = sessionStorage.getItem(DEDUPE_KEY);
  if (last) {
    const [lastKey, lastAt] = last.split('|');
    if (lastKey === eventKey && now - Number(lastAt) < 5000) return true;
  }
  sessionStorage.setItem(DEDUPE_KEY, `${eventKey}|${now}`);
  return false;
}

function getVisitorType(user: User | null, guestAccessCode: string | null): GuestPageViewVisitorType {
  if (user?.role === 'admin') return 'admin_preview';
  if (user) return 'gmail';
  if (guestAccessCode) return 'guest_code';
  return 'guest_code';
}

export async function recordGuestPageEvent(input: {
  eventType: GuestPageViewEventType;
  path: string;
  user?: User | null;
  guestAccessCode?: string | null;
  guestAccess?: GuestAccessCode | null;
}): Promise<void> {
  const normalizedCode = input.guestAccessCode ? normalizeGuestCode(input.guestAccessCode) : null;
  const eventKey = [
    input.eventType,
    input.path,
    input.user?.uid ?? normalizedCode ?? 'anonymous',
  ].join(':');

  if (shouldSkipDuplicate(eventKey)) return;

  await addDoc(collection(db, COLLECTION), {
    eventType: input.eventType,
    visitorType: getVisitorType(input.user ?? null, normalizedCode),
    path: input.path,
    userUid: input.user?.uid ?? null,
    userEmail: input.user?.email ?? null,
    userName: input.user?.displayName ?? null,
    guestAccessCode: normalizedCode,
    guestEmail: input.guestAccess?.guestEmail ?? null,
    guestName: input.guestAccess?.guestName ?? null,
    userAgent: navigator.userAgent.slice(0, 240),
    deviceId: getDeviceId(),
    createdAt: serverTimestamp(),
  });
}

export function watchGuestPageViews(
  cb: (views: GuestPageView[]) => void,
  maxItems = 500
): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(maxItems));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((item) => ({
        id: item.id,
        ...(item.data() as GuestPageViewDoc),
      }))
    );
  });
}

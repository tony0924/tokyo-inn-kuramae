import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { GuestAccessCode, GuestAccessCodeDoc } from '@/types';

const COLLECTION = 'guestAccessCodes';
const SESSION_KEY = 'tokyoInnGuestAccessCode';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeGuestCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function formatGuestCode(code: string): string {
  const normalized = normalizeGuestCode(code);
  return normalized.length > 4
    ? `${normalized.slice(0, 4)}-${normalized.slice(4)}`
    : normalized;
}

export function generateGuestCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
  return formatGuestCode(code);
}

export function watchGuestAccessCodes(
  cb: (codes: GuestAccessCode[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((item) => ({
        id: item.id,
        ...(item.data() as GuestAccessCodeDoc),
      }))
    );
  });
}

export async function createGuestAccessCode(input: {
  code: string;
  label: string;
  bookingId?: string | null;
  guestEmail?: string | null;
  guestName?: string | null;
  startsAt: Date;
  expiresAt: Date;
}): Promise<void> {
  const code = normalizeGuestCode(input.code);
  await setDoc(doc(db, COLLECTION, code), {
    code,
    label: input.label.trim(),
    bookingId: input.bookingId ?? null,
    guestEmail: input.guestEmail?.trim().toLowerCase() || null,
    guestName: input.guestName?.trim() || null,
    active: true,
    startsAt: Timestamp.fromDate(input.startsAt),
    expiresAt: Timestamp.fromDate(input.expiresAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setGuestAccessCodeActive(
  code: string,
  active: boolean
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, normalizeGuestCode(code)), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function updateBookingGuestAccessCode(input: {
  code: string;
  label: string;
  bookingId: string;
  guestEmail: string;
  guestName: string;
  startsAt: Date;
  expiresAt: Date;
}): Promise<void> {
  await updateDoc(doc(db, COLLECTION, normalizeGuestCode(input.code)), {
    label: input.label.trim(),
    bookingId: input.bookingId,
    guestEmail: input.guestEmail.trim().toLowerCase(),
    guestName: input.guestName.trim(),
    startsAt: Timestamp.fromDate(input.startsAt),
    expiresAt: Timestamp.fromDate(input.expiresAt),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGuestAccessCode(code: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, normalizeGuestCode(code)));
}

export async function validateGuestAccessCode(
  code: string
): Promise<GuestAccessCode | null> {
  const normalized = normalizeGuestCode(code);
  if (!normalized) return null;

  const snap = await getDoc(doc(db, COLLECTION, normalized));
  if (!snap.exists()) return null;

  const data = snap.data() as GuestAccessCodeDoc;
  const now = Date.now();
  const startsAt = data.startsAt.toDate().getTime();
  const expiresAt = data.expiresAt.toDate().getTime();

  if (!data.active || startsAt > now || expiresAt <= now) return null;

  return {
    id: snap.id,
    ...data,
  };
}

export function saveGuestAccessSession(code: string): void {
  localStorage.setItem(SESSION_KEY, normalizeGuestCode(code));
}

export function getStoredGuestAccessCode(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function clearGuestAccessSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

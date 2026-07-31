import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import type {
  Booking,
  GuestAccessCode,
  GuestGuidePrivateContent,
} from '@/types';

interface PortalAccessWire {
  code: string;
  bookingId: string | null;
  guestName: string | null;
  startsAt: number;
  expiresAt: number;
}

interface PortalBookingWire {
  id: string;
  guestName: string;
  partySize: number;
  checkIn: number;
  checkOut: number;
}

interface GuestPortalDataWire {
  access: PortalAccessWire;
  booking: PortalBookingWire | null;
  guide: GuestGuidePrivateContent;
}

export interface GuestPortalData {
  access: GuestAccessCode;
  booking: Booking | null;
  guide: GuestGuidePrivateContent;
}

const portalCache = new Map<string, { checkedAt: number; data: GuestPortalData }>();
const CACHE_MS = 30_000;

function normalizePortalCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export async function getPrivateGuestGuide(): Promise<GuestGuidePrivateContent> {
  const snap = await getDoc(doc(db, 'guestGuideContent', 'private'));
  if (!snap.exists()) throw new Error('房客指南尚未設定完成。');
  return snap.data() as GuestGuidePrivateContent;
}

export async function getGuestPortalData(code: string): Promise<GuestPortalData> {
  const normalized = normalizePortalCode(code);
  if (!normalized) throw new Error('訪客碼格式不正確。');

  const cached = portalCache.get(normalized);
  const now = Date.now();
  if (
    cached &&
    now - cached.checkedAt < CACHE_MS &&
    cached.data.access.expiresAt.toMillis() > now
  ) {
    return cached.data;
  }

  const load = httpsCallable<{ guestAccessCode: string }, GuestPortalDataWire>(
    functions,
    'getGuestPortalData'
  );
  const result = await load({ guestAccessCode: normalized });
  const wire = result.data;
  const access: GuestAccessCode = {
    id: normalized,
    code: normalized,
    label: '',
    bookingId: wire.access.bookingId,
    guestEmail: null,
    guestName: wire.access.guestName,
    active: true,
    startsAt: Timestamp.fromMillis(wire.access.startsAt),
    expiresAt: Timestamp.fromMillis(wire.access.expiresAt),
    createdAt: Timestamp.fromMillis(wire.access.startsAt),
    updatedAt: Timestamp.fromMillis(wire.access.startsAt),
  };
  const booking: Booking | null = wire.booking
    ? {
        id: wire.booking.id,
        guestUid: null,
        guestEmail: '',
        guestName: wire.booking.guestName,
        guestAccessCode: null,
        partySize: wire.booking.partySize,
        checkIn: Timestamp.fromMillis(wire.booking.checkIn),
        checkOut: Timestamp.fromMillis(wire.booking.checkOut),
        amount: 0,
        paymentStatus: 'unpaid',
        paymentNotes: '',
        keyCode: null,
        keyLentAt: null,
        keyReturnedAt: null,
        notes: '',
        createdAt: Timestamp.fromMillis(wire.booking.checkIn),
        updatedAt: Timestamp.fromMillis(wire.booking.checkIn),
      }
    : null;
  const data = { access, booking, guide: wire.guide };
  portalCache.set(normalized, { checkedAt: now, data });
  return data;
}

export function clearGuestPortalCache(code?: string | null): void {
  if (code) portalCache.delete(normalizePortalCode(code));
  else portalCache.clear();
}

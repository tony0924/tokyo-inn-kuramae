import type { Booking, StayType } from '@/types';

export const STAY_TYPE_LABEL: Record<StayType, string> = {
  paid_guest: '收費房客',
  self: '自住',
  family: '家人入住',
  complimentary: '免費招待',
  other: '其他',
};

const LEGACY_NO_REVENUE_GUESTS = new Map<string, StayType>([
  ['自住', 'self'],
  ['郭婷瑜', 'family'],
  ['怡臻爸媽', 'family'],
  ['婷瑜', 'family'],
]);

export function getDefaultStayTypeForGuestName(guestName: string): StayType {
  return LEGACY_NO_REVENUE_GUESTS.get(guestName.trim()) ?? 'paid_guest';
}

export function inferStayType(booking: Pick<Booking, 'guestName' | 'stayType'>): StayType {
  return booking.stayType ?? getDefaultStayTypeForGuestName(booking.guestName);
}

export function isNonRevenueStay(stayType: StayType): boolean {
  return stayType === 'self' || stayType === 'family' || stayType === 'complimentary';
}

export function getExpectedRevenue(
  booking: Pick<Booking, 'amount' | 'expectedRevenue' | 'guestName' | 'stayType'>
): number {
  if (typeof booking.expectedRevenue === 'number') return booking.expectedRevenue;
  return isNonRevenueStay(inferStayType(booking)) ? 0 : booking.amount;
}

export function getLegacyReceivedAmount(
  booking: Pick<Booking, 'amount' | 'paymentStatus' | 'guestName' | 'stayType'>
): number {
  if (isNonRevenueStay(inferStayType(booking))) return 0;
  return booking.paymentStatus === 'paid' ? booking.amount : 0;
}

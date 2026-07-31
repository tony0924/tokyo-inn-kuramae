import { httpsCallable } from 'firebase/functions';
import type {
  GuestFlightAirport,
  GuestFlightDirection,
  GuestFlightPlan,
} from '@/types';
import { getStoredGuestAccessCode, normalizeGuestCode } from './guestAccessCodes';
import { functions } from './firebase';

interface GuestFlightAccessInput {
  bookingId: string;
  guestAccessCode: string | null;
}

export interface SaveGuestFlightInput {
  bookingId: string;
  direction: GuestFlightDirection;
  flightNumber: string;
  flightDate: string;
  scheduledTime: string;
  airport: GuestFlightAirport;
  terminal: string;
}

function accessInput(bookingId: string): GuestFlightAccessInput {
  const storedCode = getStoredGuestAccessCode();
  return {
    bookingId,
    guestAccessCode: storedCode ? normalizeGuestCode(storedCode) : null,
  };
}

export async function getGuestFlightPlans(bookingId: string): Promise<GuestFlightPlan[]> {
  const getPlans = httpsCallable<GuestFlightAccessInput, { plans: GuestFlightPlan[] }>(
    functions,
    'getGuestFlightPlans'
  );
  const result = await getPlans(accessInput(bookingId));
  return result.data.plans;
}

export async function saveGuestFlightPlan(input: SaveGuestFlightInput): Promise<GuestFlightPlan> {
  const savePlan = httpsCallable<
    SaveGuestFlightInput & GuestFlightAccessInput,
    { plan: GuestFlightPlan }
  >(functions, 'saveGuestFlightPlan');
  const result = await savePlan({ ...input, ...accessInput(input.bookingId) });
  return result.data.plan;
}

export async function deleteGuestFlightPlan(
  bookingId: string,
  direction: GuestFlightDirection
): Promise<void> {
  const deletePlan = httpsCallable<
    GuestFlightAccessInput & { direction: GuestFlightDirection },
    { success: boolean }
  >(functions, 'deleteGuestFlightPlan');
  await deletePlan({ ...accessInput(bookingId), direction });
}

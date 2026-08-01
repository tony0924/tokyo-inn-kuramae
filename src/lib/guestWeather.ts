import { httpsCallable } from 'firebase/functions';
import { getStoredGuestAccessCode, normalizeGuestCode } from './guestAccessCodes';
import { functions } from './firebase';
import type { GuestWeatherData } from '@/types';

export async function getGuestWeather(): Promise<GuestWeatherData> {
  const storedCode = getStoredGuestAccessCode();
  const callable = httpsCallable<
    { guestAccessCode: string | null },
    GuestWeatherData
  >(functions, 'getGuestWeather');
  const response = await callable({
    guestAccessCode: storedCode ? normalizeGuestCode(storedCode) : null,
  });
  return response.data;
}

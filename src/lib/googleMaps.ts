import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

type LookupGoogleMapPlaceParams = {
  url: string;
};

type LookupGoogleMapPlaceResult = {
  placeId: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  sourceUrl: string;
};

const lookupGoogleMapPlaceCallable = httpsCallable<
  LookupGoogleMapPlaceParams,
  LookupGoogleMapPlaceResult
>(functions, 'lookupGoogleMapPlace');

export async function lookupGoogleMapPlace(url: string): Promise<LookupGoogleMapPlaceResult> {
  const result = await lookupGoogleMapPlaceCallable({ url });
  return result.data;
}

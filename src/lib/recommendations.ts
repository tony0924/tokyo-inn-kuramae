import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Recommendation, RecommendationDoc, RecommendationSection } from '@/types';

const COLLECTION = 'recommendations';

export type RecommendationInput = {
  section: RecommendationSection;
  category: RecommendationDoc['category'];
  placeId?: string | null;
  address?: string;
  name: string;
  lat: number;
  lng: number;
  url: string;
  note: string;
  rating: number;
  sortOrder: number;
  source?: RecommendationDoc['source'];
  defaultKey?: string | null;
};

export function watchRecommendations(cb: (items: Recommendation[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy('sortOrder', 'asc'));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((item) => ({
        id: item.id,
        ...(item.data() as RecommendationDoc),
      }))
    );
  });
}

export async function createRecommendation(input: RecommendationInput): Promise<void> {
  validateRecommendation(input);
  const payload = {
    section: input.section,
    category: input.category,
    source: input.source ?? 'admin',
    defaultKey: input.defaultKey ?? null,
    placeId: input.placeId ?? null,
    address: input.address?.trim() ?? '',
    name: input.name.trim(),
    lat: input.lat,
    lng: input.lng,
    url: input.url.trim(),
    note: input.note.trim(),
    rating: input.rating,
    active: true,
    sortOrder: input.sortOrder,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.defaultKey) {
    await setDoc(doc(db, COLLECTION, input.defaultKey), payload);
    return;
  }

  await addDoc(collection(db, COLLECTION), payload);
}

export async function updateRecommendation(
  id: string,
  input: RecommendationInput & { active: boolean }
): Promise<void> {
  validateRecommendation(input);
  await updateDoc(doc(db, COLLECTION, id), {
    section: input.section,
    category: input.category,
    placeId: input.placeId ?? null,
    address: input.address?.trim() ?? '',
    name: input.name.trim(),
    lat: input.lat,
    lng: input.lng,
    url: input.url.trim(),
    note: input.note.trim(),
    rating: input.rating,
    active: input.active,
    sortOrder: input.sortOrder,
    updatedAt: serverTimestamp(),
  });
}

export async function setRecommendationActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecommendation(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

function validateRecommendation(input: RecommendationInput): void {
  if (!input.name.trim()) throw new Error('請填寫名稱');
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new Error('請填寫正確的經緯度');
  }
  if (!input.url.trim()) throw new Error('請填寫 Google Maps 連結');
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error('推薦星等請填 1 到 5');
  }
}

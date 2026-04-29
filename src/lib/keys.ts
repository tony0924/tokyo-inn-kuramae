import {
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
import type { KeyDoc, KeyItem } from '@/types';

const COLLECTION = 'keys';

export function normalizeKeyCode(code: string): string {
  return code.trim().toUpperCase();
}

export function watchKeys(cb: (keys: KeyItem[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy('code', 'asc'));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((item) => ({
        id: item.id,
        ...(item.data() as KeyDoc),
      }))
    );
  });
}

export async function createKey(input: {
  code: string;
  label: string;
  notes: string;
}): Promise<void> {
  const code = normalizeKeyCode(input.code);
  if (!code) throw new Error('請填寫鑰匙編號');

  await setDoc(doc(db, COLLECTION, code), {
    code,
    label: input.label.trim() || code,
    active: true,
    notes: input.notes.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setKeyActive(code: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, normalizeKeyCode(code)), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function updateKey(input: {
  code: string;
  label: string;
  notes: string;
}): Promise<void> {
  await updateDoc(doc(db, COLLECTION, normalizeKeyCode(input.code)), {
    label: input.label.trim() || normalizeKeyCode(input.code),
    notes: input.notes.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteKey(code: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, normalizeKeyCode(code)));
}

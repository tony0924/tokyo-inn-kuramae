import { signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import type { EmailAccessDoc, UserDoc } from '@/types';

export async function signInWithGoogle(): Promise<void> {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;
  const userRef = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const email = fbUser.email ?? '';
    const emailAccessSnap = email ? await getDoc(doc(db, 'emailAccess', email)) : null;
    const emailAccess = emailAccessSnap?.exists()
      ? (emailAccessSnap.data() as EmailAccessDoc)
      : null;
    const newUser: Omit<UserDoc, 'createdAt' | 'updatedAt'> = {
      email,
      displayName: fbUser.displayName ?? '',
      photoURL: fbUser.photoURL ?? null,
      role: emailAccess?.role ?? 'pending',
      active: emailAccess?.active ?? false,
      bookingId: emailAccess?.bookingId ?? null,
    };
    await setDoc(userRef, {
      ...newUser,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

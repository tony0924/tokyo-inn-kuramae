import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { EmailAccess, User, UserRole } from '@/types';

export function watchUsers(
  cb: (users: User[]) => void,
  filter?: { role?: UserRole }
): Unsubscribe {
  const constraints = [];
  if (filter?.role) constraints.push(where('role', '==', filter.role));
  constraints.push(orderBy('createdAt', 'desc'));
  const q = query(collection(db, 'users'), ...constraints);
  return onSnapshot(q, (snap) => {
    const users: User[] = snap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as Omit<User, 'uid'>),
    }));
    cb(users);
  });
}

export function watchEmailAccess(cb: (items: EmailAccess[]) => void): Unsubscribe {
  const q = query(collection(db, 'emailAccess'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items: EmailAccess[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<EmailAccess, 'id'>),
    }));
    cb(items);
  });
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    role,
    updatedAt: serverTimestamp(),
  });
}

export async function setUserActive(uid: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function setUserBookingId(
  uid: string,
  bookingId: string | null
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    bookingId,
    updatedAt: serverTimestamp(),
  });
}

export async function createEmailAccess(input: {
  email: string;
  role: Extract<UserRole, 'admin' | 'guest'>;
  active: boolean;
  bookingId: string | null;
}): Promise<void> {
  const normalizedEmail = input.email.trim().toLowerCase();
  await setDoc(doc(db, 'emailAccess', normalizedEmail), {
    email: normalizedEmail,
    role: input.role,
    active: input.active,
    bookingId: input.bookingId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function grantGuestAccessForEmail(
  email: string,
  bookingId: string | null
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  await createEmailAccess({
    email: normalizedEmail,
    role: 'guest',
    active: true,
    bookingId,
  });

  const existingUser = await findUserByEmail(normalizedEmail);
  if (!existingUser) return;

  if (existingUser.role !== 'admin') {
    await setUserRole(existingUser.uid, 'guest');
  }
  await setUserActive(existingUser.uid, true);
  await setUserBookingId(existingUser.uid, bookingId);
}

export async function deleteEmailAccess(email: string): Promise<void> {
  await deleteDoc(doc(db, 'emailAccess', email));
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  if (!first) return null;
  return {
    uid: first.id,
    ...(first.data() as Omit<User, 'uid'>),
  };
}

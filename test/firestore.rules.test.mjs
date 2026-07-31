import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { readFile } from 'node:fs/promises';

const projectId = 'demo-tokyo-inn-guest-guide';
let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });

  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const now = Timestamp.now();
    await Promise.all([
      setDoc(doc(db, 'guestGuideContent', 'private'), { marker: 'protected' }),
      setDoc(doc(db, 'users', 'admin-uid'), {
        email: 'admin@example.com',
        role: 'admin',
        active: true,
        bookingId: null,
        createdAt: now,
        updatedAt: now,
      }),
      setDoc(doc(db, 'users', 'guest-uid'), {
        email: 'guest@example.com',
        role: 'guest',
        active: true,
        bookingId: 'booking-1',
        createdAt: now,
        updatedAt: now,
      }),
      setDoc(doc(db, 'users', 'disabled-uid'), {
        email: 'disabled@example.com',
        role: 'guest',
        active: false,
        bookingId: 'booking-1',
        createdAt: now,
        updatedAt: now,
      }),
      setDoc(doc(db, 'guestAccessCodes', 'ABCD2345'), {
        active: true,
        startsAt: Timestamp.fromMillis(Date.now() - 60_000),
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
      }),
      setDoc(doc(db, 'bookings', 'booking-1'), {
        guestUid: null,
        guestAccessCode: 'ABCD2345',
      }),
    ]);
  });
});

after(async () => {
  await environment?.cleanup();
});

test('public and disabled guests cannot read the private guide', async () => {
  await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), 'guestGuideContent', 'private')));
  await assertFails(getDoc(doc(
    environment.authenticatedContext('disabled-uid', { email: 'disabled@example.com' }).firestore(),
    'guestGuideContent',
    'private'
  )));
});

test('active guests and admins can read the private guide', async () => {
  const guestSnap = await assertSucceeds(getDoc(doc(
    environment.authenticatedContext('guest-uid', { email: 'guest@example.com' }).firestore(),
    'guestGuideContent',
    'private'
  )));
  const adminSnap = await assertSucceeds(getDoc(doc(
    environment.authenticatedContext('admin-uid', { email: 'admin@example.com' }).firestore(),
    'guestGuideContent',
    'private'
  )));
  assert.equal(guestSnap.data().marker, 'protected');
  assert.equal(adminSnap.data().marker, 'protected');
});

test('public clients cannot read guest-code or booking documents directly', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'guestAccessCodes', 'ABCD2345')));
  await assertFails(getDoc(doc(db, 'bookings', 'booking-1')));
});

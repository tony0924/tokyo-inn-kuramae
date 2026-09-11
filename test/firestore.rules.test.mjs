import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
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
      setDoc(doc(db, 'emailDeliveries', 'delivery-1'), {
        bookingId: 'booking-1',
        status: 'sent',
        createdAt: now,
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

test('only admins can read Email delivery records and clients cannot write them', async () => {
  const publicDb = environment.unauthenticatedContext().firestore();
  const guestDb = environment
    .authenticatedContext('guest-uid', { email: 'guest@example.com' })
    .firestore();
  const adminDb = environment
    .authenticatedContext('admin-uid', { email: 'admin@example.com' })
    .firestore();

  await assertFails(getDoc(doc(publicDb, 'emailDeliveries', 'delivery-1')));
  await assertFails(getDoc(doc(guestDb, 'emailDeliveries', 'delivery-1')));
  await assertSucceeds(getDoc(doc(adminDb, 'emailDeliveries', 'delivery-1')));
  await assertFails(setDoc(doc(adminDb, 'emailDeliveries', 'client-write'), {
    bookingId: 'booking-1',
    status: 'sent',
    createdAt: Timestamp.now(),
  }));
});

test('active guests can create bounded analytics interactions but cannot spoof unsupported events', async () => {
  const guestDb = environment
    .authenticatedContext('guest-uid', { email: 'guest@example.com' })
    .firestore();
  const baseEvent = {
    visitorType: 'gmail',
    path: '/guest/home',
    userUid: 'guest-uid',
    userEmail: 'guest@example.com',
    userName: 'Guest',
    guestAccessCode: null,
    guestEmail: null,
    guestName: null,
    targetId: 'place-1',
    targetLabel: '測試地點',
    value: null,
    userAgent: 'rules-test',
    deviceId: 'device-1',
    createdAt: serverTimestamp(),
  };

  await assertSucceeds(setDoc(doc(guestDb, 'guestPageViews', 'interaction-1'), {
    ...baseEvent,
    eventType: 'recommendation_click',
  }));
  await assertFails(setDoc(doc(guestDb, 'guestPageViews', 'interaction-2'), {
    ...baseEvent,
    eventType: 'private_content_read',
  }));
});

test('支出僅限管理者讀寫，金額與操作者不可偽造', async () => {
  const admin = environment.authenticatedContext('admin-uid').firestore();
  const guest = environment.authenticatedContext('guest-uid').firestore();
  const anon = environment.unauthenticatedContext().firestore();
  const data = { name: '測試管理費', category: '管理費', amount: 10000, currency: 'JPY', amountTwd: 2200, paidAt: Timestamp.fromDate(new Date('2026-01-01T12:00:00+08:00')), expenseMonth: '2025-12', method: '轉帳', note: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: 'admin-uid', updatedBy: 'admin-uid' };
  await assertSucceeds(setDoc(doc(admin, 'expenses', 'expense-1'), data));
  await assertSucceeds(getDoc(doc(admin, 'expenses', 'expense-1')));
  await assertFails(getDoc(doc(guest, 'expenses', 'expense-1')));
  await assertFails(getDoc(doc(anon, 'expenses', 'expense-1')));
  await assertFails(setDoc(doc(guest, 'expenses', 'guest-expense'), data));
  for (const patch of [{ amount: -1 }, { amount: 1.5 }, { currency: 'USD' }, { currency: 'TWD' }, { updatedBy: 'guest-uid' }, { category: '無效分類' }]) {
    await assertFails(setDoc(doc(admin, 'expenses', 'invalid-expense'), { ...data, ...patch }));
  }
  const { updateDoc, deleteDoc } = await import('firebase/firestore');
  await assertSucceeds(updateDoc(doc(admin, 'expenses', 'expense-1'), { amountTwd: 2300, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(admin, 'expenses', 'expense-1'), { createdBy: 'guest-uid', updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(doc(guest, 'expenses', 'expense-1')));
  await assertSucceeds(deleteDoc(doc(admin, 'expenses', 'expense-1')));
});

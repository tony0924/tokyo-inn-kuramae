import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSystemHealthReport } from '../src/lib/systemHealth.ts';

const now = Date.UTC(2026, 7, 6, 4);
const timestamp = (value) => ({ toMillis: () => value });

function guide() {
  return {
    accommodation: {
      buildingName: 'Stay',
      address: 'Tokyo',
      roomLabel: 'Room',
      roomDirections: 'Directions',
      mapUrl: 'https://maps.app.goo.gl/example',
    },
    wifi: { ssid: 'wifi', password: 'password' },
    arrival: { steps: ['step'], buildingAccess: ['access'] },
    doorLock: { instructions: ['instruction'] },
    garbageLocation: 'location',
    searchEntries: [{ section: '住宿', tab: 'home', title: '地址', content: 'content' }],
  };
}

function recommendation(category, index) {
  const section = category === 'sight'
    ? 'cityguide'
    : category === 'restaurant' || category === 'cafe'
      ? 'restaurant'
      : 'services';
  return {
    id: `place-${index}`,
    section,
    category,
    name: `Place ${index}`,
    placeId: `place-id-${index}`,
    address: 'Tokyo',
    lat: 35.7,
    lng: 139.7,
    url: `https://maps.app.goo.gl/place-${index}`,
    note: 'Good place',
    rating: 4,
    active: true,
    sortOrder: index,
    archivedAt: null,
  };
}

function healthyInput() {
  const checkIn = now + 2 * 24 * 60 * 60 * 1000;
  const checkOut = now + 5 * 24 * 60 * 60 * 1000;
  return {
    guide: guide(),
    recommendations: ['convenience', 'supermarket', 'restaurant', 'cafe', 'sight']
      .map(recommendation),
    bookings: [{
      id: 'booking-1',
      guestName: 'Guest',
      guestEmail: 'guest@example.com',
      guestAccessCode: 'ABCD2345',
      checkIn: timestamp(checkIn),
      checkOut: timestamp(checkOut),
    }],
    guestAccessCodes: [{
      id: 'ABCD2345',
      code: 'ABCD2345',
      bookingId: 'booking-1',
      active: true,
      startsAt: timestamp(now),
      expiresAt: timestamp(checkOut + 24 * 60 * 60 * 1000),
    }],
    emailDeliveries: [],
    notifications: [],
    nowMs: now,
  };
}

test('完整內容與一致的訪客存取不產生健康問題', () => {
  const report = buildSystemHealthReport(healthyInput());
  assert.equal(report.issues.length, 0);
  assert.equal(report.criticalCount, 0);
  assert.equal(report.warningCount, 0);
});

test('偵測缺少指南、錯誤推薦、缺少訪客碼與寄信失敗', () => {
  const input = healthyInput();
  input.guide = null;
  input.recommendations[0].note = '';
  input.recommendations[0].url = 'http://example.com';
  input.bookings[0].guestAccessCode = null;
  input.guestAccessCodes = [];
  input.emailDeliveries = [{
    id: 'delivery-1',
    status: 'failed',
    createdAt: timestamp(now - 60_000),
  }];

  const report = buildSystemHealthReport(input);
  assert.ok(report.criticalCount >= 2);
  assert.ok(report.warningCount >= 2);
  assert.ok(report.issues.some((item) => item.id === 'guide-missing'));
  assert.ok(report.issues.some((item) => item.id === 'email-failures'));
  assert.ok(report.issues.some((item) => item.id === 'booking-code-booking-1'));
});

test('偵測重複推薦與早於退房日到期的訪客碼', () => {
  const input = healthyInput();
  input.recommendations[1].placeId = input.recommendations[0].placeId;
  input.guestAccessCodes[0].expiresAt = timestamp(now + 3 * 24 * 60 * 60 * 1000);

  const report = buildSystemHealthReport(input);
  assert.ok(report.issues.some((item) => item.id.startsWith('recommendation-duplicate-')));
  assert.ok(report.issues.some((item) => item.id === 'code-window-ABCD2345'));
});

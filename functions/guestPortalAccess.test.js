import assert from "node:assert/strict";
import test from "node:test";
import {
  isGuestAccessCurrentlyValid,
  normalizeGuestAccessCode,
} from "./guestPortalAccess.js";

const timestamp = (value) => ({ toMillis: () => value });

test("normalizes a formatted guest access code", () => {
  assert.equal(normalizeGuestAccessCode(" abcd-2345 "), "ABCD2345");
});

test("accepts an active code inside its validity window", () => {
  assert.equal(isGuestAccessCurrentlyValid({
    active: true,
    startsAt: timestamp(1_000),
    expiresAt: timestamp(3_000),
  }, 2_000), true);
});

test("rejects inactive, future, and expired codes", () => {
  assert.equal(isGuestAccessCurrentlyValid({
    active: false,
    startsAt: timestamp(1_000),
    expiresAt: timestamp(3_000),
  }, 2_000), false);
  assert.equal(isGuestAccessCurrentlyValid({
    active: true,
    startsAt: timestamp(2_001),
    expiresAt: timestamp(3_000),
  }, 2_000), false);
  assert.equal(isGuestAccessCurrentlyValid({
    active: true,
    startsAt: timestamp(1_000),
    expiresAt: timestamp(2_000),
  }, 2_000), false);
});

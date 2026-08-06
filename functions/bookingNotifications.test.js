import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBookingDateChangeBody } from "./bookingNotifications.js";

const timestamp = (millis, label) => ({
  toMillis: () => millis,
  label,
});
const formatDate = (value) => value?.label || "日期未設定";

test("lists both old and new check-in / checkout dates", () => {
  const body = buildBookingDateChangeBody(
    {
      checkIn: timestamp(1, "9/21"),
      checkOut: timestamp(2, "9/27"),
    },
    {
      checkIn: timestamp(3, "9/22"),
      checkOut: timestamp(4, "9/28"),
    },
    formatDate
  );

  assert.equal(body, "入住：9/21 → 9/22；退房：9/27 → 9/28");
});

test("only lists the date field that changed", () => {
  const unchangedCheckIn = timestamp(1, "9/21");
  const body = buildBookingDateChangeBody(
    {
      checkIn: unchangedCheckIn,
      checkOut: timestamp(2, "9/27"),
    },
    {
      checkIn: timestamp(1, "9/21"),
      checkOut: timestamp(3, "9/29"),
    },
    formatDate
  );

  assert.equal(body, "退房：9/27 → 9/29");
});

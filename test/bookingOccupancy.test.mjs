import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = ts.transpileModule(
  readFileSync(
    new URL("../src/lib/bookingOccupancy.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.ES2022 } },
).outputText;
const { bookingOccupancy } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const booking = (first, last) => ({
  checkIn: { toDate: () => new Date(first + "T15:00:00+08:00") },
  checkOut: { toDate: () => new Date(last + "T11:00:00+08:00") },
});
test("跨月、跨年、重疊與同日換客只計各晚一次，免費住宿不依金額排除", () => {
  const data = bookingOccupancy(
    [
      booking("2025-12-30", "2026-01-02"),
      booking("2026-01-01", "2026-01-03"),
      booking("2026-01-03", "2026-02-02"),
      booking("2026-12-31", "2027-01-02"),
    ],
    2026,
    new Date("2026-09-14T00:00:00+08:00"),
  );
  assert.equal(data.months[0].stayed, 31);
  assert.equal(data.months[1].stayed, 1);
  assert.equal(data.upcoming, 1);
  assert.equal(data.available, 365);
  assert.equal(data.elapsed, 256);
});
test("閏年、今天邊界、過去和未來年度", () => {
  const bookings = [booking("2024-02-28", "2024-03-02")];
  const data = bookingOccupancy(
    bookings,
    2024,
    new Date("2024-02-29T16:00:00Z"),
  );
  assert.equal(data.available, 366);
  assert.equal(data.months[1].stayed, 2);
  assert.equal(data.months[2].upcoming, 1);
  assert.equal(data.elapsed, 60);
  assert.equal(
    bookingOccupancy(bookings, 2024, new Date("2025-01-01")).elapsed,
    366,
  );
  assert.equal(
    bookingOccupancy(bookings, 2024, new Date("2023-01-01")).elapsed,
    0,
  );
});
test("營運起始日、零分母、空資料、無效日期", () => {
  const data = bookingOccupancy(
    [booking("2025-08-01", "2025-08-05"), booking("2025-09-02", "2025-09-01")],
    2025,
    new Date("2025-08-04T00:00:00+08:00"),
    "2025-08-03",
  );
  assert.equal(data.stayed, 1);
  assert.equal(data.upcoming, 1);
  assert.equal(data.elapsed, 1);
  assert.equal(data.months[7].available, 29);
  assert.equal(data.months[6].available, 0);
  assert.equal(data.invalidBookings, 1);
  const future = bookingOccupancy(
    [],
    2024,
    new Date("2025-01-01"),
    "2026-01-01",
  );
  assert.equal(future.available, 0);
  assert.equal(future.elapsed, 0);
  assert.equal(bookingOccupancy([], 2026).stayed, 0);
});

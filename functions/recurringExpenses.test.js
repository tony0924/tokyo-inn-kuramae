import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dueDate,
  monthNow,
  nextMonth,
  validateTemplate,
} from "./recurringExpenses.js";
test("固定支出：跨年與月底付款日", () => {
  assert.equal(nextMonth("2026-12"), "2027-01");
  assert.equal(dueDate("2026-02", 31), "2026-02-28");
  assert.equal(dueDate("2024-02", 31), "2024-02-29");
  assert.equal(dueDate("2026-04", 31), "2026-04-30");
  assert.equal(monthNow(new Date("2025-12-31T16:00:00Z")), "2026-01");
});
test("固定支出：驗證金額與起始月份", () => {
  const t = {
    name: "管理費",
    category: "管理費",
    amount: 10000,
    currency: "JPY",
    day: 31,
    startMonth: "2026-09",
    method: "轉帳",
    note: "",
  };
  assert.equal(validateTemplate(t).amount, 10000);
  assert.equal(validateTemplate({ ...t, startMonth: "2025-09" }).startMonth, "2025-09");
  for (const patch of [
    { day: 32 },
    { day: 0 },
    { amount: -1 },
    { amount: 1.5 },
    { startMonth: "2025-13" },
    { currency: "TWD" },
    { currency: "USD" },
  ])
    assert.throws(() => validateTemplate({ ...t, ...patch }, "2026-09"));
});

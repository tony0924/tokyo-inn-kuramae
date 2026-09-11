import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = ts.transpileModule(
  readFileSync(
    new URL("../src/lib/expenseFinance.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.ES2022 } },
).outputText;
const { taipeiDate, validExpenseDate, sumExpenses } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
test("年度與月份以臺灣時間付款日計算，使用保存的 TWD 金額", () => {
  const items = [
    {
      paidAt: { toDate: () => new Date("2025-12-31T15:59:59Z") },
      amountTwd: 100,
    },
    {
      paidAt: { toDate: () => new Date("2025-12-31T16:00:00Z") },
      amountTwd: 300,
    },
    {
      paidAt: { toDate: () => new Date("2026-02-01T00:00:00+08:00") },
      amountTwd: 200,
    },
  ];
  assert.equal(taipeiDate(items[1].paidAt.toDate()), "2026-01-01");
  assert.equal(sumExpenses(items, "2025"), 100);
  assert.equal(sumExpenses(items, "2026"), 500);
  assert.equal(sumExpenses(items, "2026-01"), 300);
  assert.equal(sumExpenses(items, ""), 600);
  assert.equal(sumExpenses([], "2026"), 0);
});
test("拒絕無效日期，接受閏年日期", () => {
  for (const date of [
    "",
    "2026-02-29",
    "2026-13-01",
    "1999-01-01",
    "2101-01-01",
  ])
    assert.equal(validExpenseDate(date), false);
  assert.equal(validExpenseDate("2024-02-29"), true);
});

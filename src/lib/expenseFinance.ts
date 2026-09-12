export const EXPENSE_CATEGORIES = [
  "水費",
  "電費",
  "瓦斯",
  "管理費",
  "網路",
  "清潔",
  "維修",
  "設備耗材",
  "稅費",
  "其他",
] as const;
export const EXPENSE_METHODS = ["轉帳", "信用卡", "現金", "其他"] as const;
export function taipeiDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function validExpenseDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number(value.slice(0, 4)) >= 2000 &&
    Number(value.slice(0, 4)) <= 2100 &&
    Number.isFinite(new Date(`${value}T12:00:00+08:00`).getTime()) &&
    new Date(`${value}T12:00:00+08:00`).toISOString().slice(0, 10) === value
  );
}
type ExpenseAmount = {
  paidAt: { toDate(): Date };
  amount: number;
  currency: "JPY" | "TWD";
};
export function sumExpenses(
  items: ExpenseAmount[],
  prefix: string,
  currency: "JPY" | "TWD" = "TWD",
): number {
  return items.reduce(
    (sum, item) =>
      sum +
      (taipeiDate(item.paidAt.toDate()).startsWith(prefix) &&
      item.currency === currency
        ? item.amount
        : 0),
    0,
  );
}
export function expenseTotalLabel(
  items: ExpenseAmount[],
  prefix: string,
): string {
  const currencies = (["JPY", "TWD"] as const).filter((currency) =>
    items.some(
      (item) =>
        item.currency === currency &&
        taipeiDate(item.paidAt.toDate()).startsWith(prefix),
    ),
  );
  return currencies.length
    ? currencies
        .map(
          (currency) =>
            currency +
            " " +
            sumExpenses(items, prefix, currency).toLocaleString(),
        )
        .join(" ／ ")
    : "JPY 0";
}

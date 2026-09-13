import { useId } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/expenseFinance";
import type { Expense } from "@/types";

const colors = [
  "#69b9e8",
  "#e0a84f",
  "#e88770",
  "#6fcf97",
  "#a799e8",
  "#65c9bf",
  "#dd91ba",
  "#a9be6a",
  "#c19b76",
  "#939aa8",
];

export function ExpenseCompositionChart({
  items,
  scopeLabel,
}: {
  items: Pick<Expense, "category" | "currency" | "amount">[];
  scopeLabel: string;
}) {
  const id = useId();
  if (items.length === 0) return null;

  return (
    <>
      {(["JPY", "TWD"] as const).map((currency) => {
        const expenses = items.filter((item) => item.currency === currency);
        if (!expenses.length) return null;
        const categories = new Map<string, number>();
        for (const item of expenses) {
          categories.set(
            item.category,
            (categories.get(item.category) ?? 0) + item.amount,
          );
        }
        const segments = [...categories].sort((a, b) => b[1] - a[1]);
        const total = expenses.reduce((sum, item) => sum + item.amount, 0);
        const circumference = 2 * Math.PI * 46;
        let offset = 0;
        const titleId = `${id}-${currency}`;
        const colorFor = (category: string) =>
          colors[
            Math.max(
              0,
              EXPENSE_CATEGORIES.indexOf(
                category as (typeof EXPENSE_CATEGORIES)[number],
              ),
            )
          ];

        return (
          <section
            key={currency}
            className="admin-table revenue-composition expense-composition"
            aria-labelledby={titleId}
          >
            <div className="revenue-composition-copy">
              <span className="revenue-composition-eyebrow">{scopeLabel}</span>
              <h2 id={titleId} className="admin-section-title">
                支出分類占比・{currency}
              </h2>
              <p>
                依目前篩選的已付款明細，查看各分類的支出金額與占比。以原幣統計。
              </p>
            </div>
            <div className="revenue-donut-wrap">
              <svg
                className="revenue-donut"
                viewBox="0 0 120 120"
                role="img"
                aria-labelledby={`${titleId}-chart ${titleId}-description`}
              >
                <title id={`${titleId}-chart`}>
                  {scopeLabel}支出分類占比（{currency}）
                </title>
                <desc id={`${titleId}-description`}>
                  合計 {currency} {total.toLocaleString()}。
                  {segments
                    .map(
                      ([category, amount]) =>
                        `${category} ${amount.toLocaleString()}`,
                    )
                    .join("，")}
                  。
                </desc>
                <circle
                  className="revenue-donut-track"
                  cx="60"
                  cy="60"
                  r="46"
                />
                {total > 0 &&
                  segments.map(([category, amount]) => {
                    const length = (amount / total) * circumference;
                    const start = offset;
                    offset += length;
                    return (
                      <circle
                        key={category}
                        className="revenue-donut-segment"
                        stroke={colorFor(category)}
                        cx="60"
                        cy="60"
                        r="46"
                        strokeDasharray={`${length} ${circumference - length}`}
                        strokeDashoffset={-start}
                      />
                    );
                  })}
              </svg>
              <div className="revenue-donut-center" aria-hidden="true">
                <span>{currency}</span>
                <strong>{total.toLocaleString()}</strong>
                <small>{expenses.length} 筆支出</small>
              </div>
            </div>
            <div className="revenue-composition-legend">
              {segments.map(([category, amount]) => (
                <div key={category} className="revenue-legend-item">
                  <span
                    className="revenue-legend-dot"
                    style={{ backgroundColor: colorFor(category) }}
                    aria-hidden="true"
                  />
                  <div>
                    <span>{category}</span>
                    <strong>
                      {currency} {amount.toLocaleString()}
                    </strong>
                  </div>
                  <span className="revenue-legend-percentage">
                    {total > 0
                      ? ((amount / total) * 100).toLocaleString("zh-TW", {
                          maximumFractionDigits: 1,
                        })
                      : 0}
                    %
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

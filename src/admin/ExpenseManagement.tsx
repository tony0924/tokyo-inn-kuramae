import { RecurringExpenseManagement } from './RecurringExpenseManagement';
import { useCallback, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Modal } from "./Modal";
import { useExpenses } from "./useExpenses";
import { deleteExpense, saveExpense, type ExpenseInput } from "@/lib/expenses";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_METHODS,
  sumExpenses,
  taipeiDate,
} from "@/lib/expenseFinance";
import type { Expense } from "@/types";
const fresh = (): ExpenseInput => ({
  name: "",
  category: "管理費",
  amount: 0,
  currency: "JPY",
  amountTwd: 0,
  paidDate: taipeiDate(),
  expenseMonth: "",
  method: "轉帳",
  note: "",
});
export function ExpenseManagement() {
  const [params, setParams] = useSearchParams();
  const year = /^(20\d{2}|2100)$/.test(params.get("year") ?? "")
    ? params.get("year")!
    : taipeiDate().slice(0, 4);
  const all = params.get("scope") === "all";
  const month = /^(0[1-9]|1[0-2])$/.test(params.get("month") ?? "")
    ? params.get("month")!
    : "";
  const [tab, setTab] = useState<'paid' | 'recurring'>('paid');
  const [source, setSource] = useState('all');
  const [category, setCategory] = useState("");
  const { items, loading, error } = useExpenses(all ? null : year);
  const [form, setForm] = useState<ExpenseInput | null>(null);
  const [editing, setEditing] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const close = useCallback(() => {
    if (!busy) setForm(null);
  }, [busy]);
  const visible = items.filter(
    (item) =>
      (all ||
        !month ||
        taipeiDate(item.paidAt.toDate()).slice(5, 7) === month) &&
      (!category || item.category === category) &&
      (source === "all" || (source === "recurring" ? !!item.recurringBillId : !item.recurringBillId)),
  );
  function open(item?: Expense, copy = false) {
    setEditing(copy ? undefined : item?.id);
    setMessage("");
    setForm(
      item
        ? {
            ...item,
            paidDate: copy ? taipeiDate() : taipeiDate(item.paidAt.toDate()),
            expenseMonth: copy ? "" : item.expenseMonth,
          }
        : fresh(),
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await saveExpense(form, editing);
      setParams({ year: form.paidDate.slice(0, 4) });
      setCategory("");
      setSource("all");
      setTab("paid");
      setForm(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "儲存失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: Expense) {
    if (!confirm(`確定刪除「${item.name}」？年度支出將同步扣除這筆金額。`))
      return;
    setBusy(true);
    setMessage("");
    try {
      await deleteExpense(item.id);
    } catch {
      setMessage("刪除失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">支出管理</h1>
          <p>記錄已付款費用，依付款日期統計；總額統一以新臺幣計算。</p>
        </div>
        <button className="btn-gold" onClick={() => open()}>
          手動新增支出
        </button>
      </div>
      <div className="expense-actions expense-tabs" role="group" aria-label="支出管理分區">
        <button className={tab === 'paid' ? 'btn-gold' : 'btn-ghost'} onClick={() => setTab('paid')}>已付款明細</button>
        <button className={tab === 'recurring' ? 'btn-gold' : 'btn-ghost'} onClick={() => setTab('recurring')}>每月固定支出</button>
      </div>
      {tab === 'recurring' && <RecurringExpenseManagement />}
      <div hidden={tab !== 'paid'}>
      <div className="expense-filters admin-table">
        <label>新增方式<select value={source} onChange={e => setSource(e.target.value)}><option value="all">全部來源</option><option value="manual">手動新增</option><option value="recurring">每月固定</option></select></label>
        <label>
          年度
          <select
            value={all ? "all" : year}
            onChange={(e) =>
              setParams(
                e.target.value === "all"
                  ? { scope: "all" }
                  : { year: e.target.value },
              )
            }
          >
            <option value="all">全部期間</option>
            {Array.from({ length: 101 }, (_, i) => String(2000 + i)).map(
              (y) => (
                <option key={y}>{y}</option>
              ),
            )}
          </select>
        </label>
        <label>
          月份
          <select
            disabled={all}
            value={month}
            onChange={(e) =>
              setParams({
                year,
                ...(e.target.value ? { month: e.target.value } : {}),
              })
            }
          >
            <option value="">全年</option>
            {Array.from({ length: 12 }, (_, i) =>
              String(i + 1).padStart(2, "0"),
            ).map((m) => (
              <option key={m} value={m}>
                {Number(m)} 月
              </option>
            ))}
          </select>
        </label>
        <label>
          分類
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">全部分類</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      {message && !form && <p role="alert">{message}</p>}
      {loading ? (
        <p role="status">載入中…</p>
      ) : (
        !error && (
          <>
            <div className="stats-grid">
              <div className="stat-card amber">
                <div className="stat-label">{year} 年總支出</div>
                <div className="stat-value">
                  TWD {sumExpenses(items, year).toLocaleString()}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  {taipeiDate().slice(0, 7)} 本月支出
                  {year !== taipeiDate().slice(0, 4)
                    ? "（請切換今年查看）"
                    : ""}
                </div>
                <div className="stat-value">
                  {year === taipeiDate().slice(0, 4)
                    ? `TWD ${sumExpenses(items, taipeiDate().slice(0, 7)).toLocaleString()}`
                    : "—"}
                </div>
              </div>
            </div>
            <h2 className="admin-section-title">支出明細</h2>
            <p>
              {visible.length} 筆・篩選合計 TWD{" "}
              {sumExpenses(visible, "").toLocaleString()}
            </p>
            {visible.length === 0 ? (
              <div className="admin-empty-state">
                此期間沒有符合條件的支出。
              </div>
            ) : (
              <div className="expense-list">
                {visible.map((item) => (
                  <article className="admin-table expense-item" key={item.id}>
                    <div>
                      <strong>{item.name} · {item.recurringBillId ? "每月固定" : "手動新增"}</strong>
                      <p>
                        {taipeiDate(item.paidAt.toDate())}・{item.category}・
                        {item.method}
                      </p>
                      {item.expenseMonth && (
                        <p>費用所屬月份：{item.expenseMonth}</p>
                      )}
                      <p>
                        {item.currency} {item.amount.toLocaleString()} ／ 折合
                        TWD {item.amountTwd.toLocaleString()}
                      </p>
                      {item.note && <p className="expense-note">{item.note}</p>}
                    </div>
                    <div className="expense-actions">
                      <button
                        className="btn-ghost"
                        disabled={busy}
                        onClick={() => open(item)}
                      >
                        編輯
                      </button>
                      <button
                        className="btn-ghost"
                        disabled={busy}
                        onClick={() => open(item, true)}
                      >
                        複製一筆
                      </button>
                      <button
                        className="btn-danger"
                        disabled={busy || !!item.recurringBillId}
                        title={item.recurringBillId ? "固定支出已入帳，請使用編輯更正金額。" : undefined}
                        onClick={() => void remove(item)}
                      >
                        刪除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )
      )}
      </div>
      <Modal open={form !== null} onClose={close}>
        {form && (
          <form
            onSubmit={submit}
            className="expense-form"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const controls = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
                ),
              );
              const first = controls[0],
                last = controls[controls.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <h2>{editing ? "編輯支出" : "新增支出"}</h2>
            <p>
              僅登記已付款費用。日圓請填入實際扣款或手動換算的新臺幣整數金額。
            </p>
            <fieldset disabled={busy}>
              <label>
                支出名稱
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                分類
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                幣別
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      currency: e.target.value as "JPY" | "TWD",
                    })
                  }
                >
                  <option value="JPY">JPY 日圓</option>
                  <option value="TWD">TWD 新臺幣</option>
                </select>
              </label>
              <label>
                原幣金額
                <input
                  type="number"
                  required
                  min="1"
                  max="1000000000"
                  step="1"
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm({ ...form, amount: Number(e.target.value) })
                  }
                />
              </label>
              {form.currency === "JPY" && (
                <label>
                  折合新臺幣金額
                  <input
                    type="number"
                    required
                    min="1"
                    max="1000000000"
                    step="1"
                    value={form.amountTwd || ""}
                    onChange={(e) =>
                      setForm({ ...form, amountTwd: Number(e.target.value) })
                    }
                  />
                </label>
              )}
              <label>
                付款日期
                <input
                  type="date"
                  required
                  min="2000-01-01"
                  max="2100-12-31"
                  value={form.paidDate}
                  onChange={(e) =>
                    setForm({ ...form, paidDate: e.target.value })
                  }
                />
              </label>
              <label>
                費用所屬月份（選填）
                <input
                  type="month"
                  min="2000-01"
                  max="2100-12"
                  value={form.expenseMonth}
                  onChange={(e) =>
                    setForm({ ...form, expenseMonth: e.target.value })
                  }
                />
              </label>
              <label>
                付款方式
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  {EXPENSE_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label>
                備註（選填）
                <textarea
                  maxLength={2000}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </label>
            </fieldset>
            {message && <p role="alert">{message}</p>}
            <div className="expense-actions">
              <button
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={close}
              >
                取消
              </button>
              <button className="btn-gold" disabled={busy}>
                {busy ? "儲存中…" : "儲存支出"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

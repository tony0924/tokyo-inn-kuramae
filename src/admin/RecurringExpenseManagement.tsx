import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_METHODS,
  taipeiDate,
} from "@/lib/expenseFinance";
import {
  recurringExpenseAction,
  watchRecurringBills,
  watchRecurringTemplates,
  type RecurringExpenseInput,
} from "@/lib/recurringExpenses";
import type { RecurringExpense, RecurringExpenseBill } from "@/types";
export function RecurringExpenseManagement() {
  const [month, setMonth] = useState(taipeiDate().slice(0, 7));
  const [templates, setTemplates] = useState<RecurringExpense[]>([]);
  const [bills, setBills] = useState<RecurringExpenseBill[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [billsLoading, setBillsLoading] = useState(true);
  const [templateError, setTemplateError] = useState(false);
  const [billError, setBillError] = useState(false);
  const [form, setForm] = useState<RecurringExpenseInput | null>(null);
  const [id, setId] = useState<string>();
  const [paying, setPaying] = useState<RecurringExpenseBill | null>(null);
  const [paidDate, setPaidDate] = useState(taipeiDate());
  const [amountTwd, setAmountTwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () =>
      watchRecurringTemplates(
        (items) => {
          setTemplates(items);
          setTemplatesLoading(false);
          setTemplateError(false);
        },
        () => {
          setTemplatesLoading(false);
          setTemplateError(true);
        },
      ),
    [],
  );
  useEffect(() => {
    setBillsLoading(true);
    setBillError(false);
    setBills([]);
    return watchRecurringBills(
      month,
      (items) => {
        setBills(items);
        setBillsLoading(false);
      },
      () => {
        setBillsLoading(false);
        setBillError(true);
      },
    );
  }, [month]);
  const close = useCallback(() => {
    if (!busy) {
      setForm(null);
      setPaying(null);
      setError("");
    }
  }, [busy]);
  function open(template?: RecurringExpense) {
    setId(template?.id);
    setError("");
    setForm(
      template
        ? {
            name: template.name,
            category: template.category,
            amount: template.amount,
            currency: template.currency,
            day: template.day,
            startMonth: template.startMonth,
            method: template.method,
            note: template.note,
          }
        : {
            name: "",
            category: "管理費",
            amount: 0,
            currency: "JPY",
            day: 1,
            startMonth: taipeiDate().slice(0, 7),
            method: "轉帳",
            note: "",
          },
    );
  }
  async function perform(input: Parameters<typeof recurringExpenseAction>[0]) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await recurringExpenseAction(input);
      setForm(null);
      setPaying(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (form) void perform({ action: "saveTemplate", id, template: form });
  }
  return (
    <section className="recurring-expenses">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-section-title">每月固定支出</h2>
          <p>設定一次，每月自動產生待確認紀錄；確認已付款後才列入財務總覽。</p>
        </div>
        <button className="btn-gold" disabled={busy} onClick={() => open()}>
          新增固定項目
        </button>
      </div>
      {!form && !paying && error && <p role="alert">{error}</p>}
      <h3>固定項目設定</h3>
      <p>
        每月付款日遇短月份會改為月底。修改設定只影響尚未產生的月份；暫停不會取消已產生的紀錄，恢復後從當月繼續。
      </p>
      {templatesLoading ? (
        <p role="status">設定載入中…</p>
      ) : templateError ? (
        <p role="alert">固定項目載入失敗，請重新整理。</p>
      ) : templates.length === 0 ? (
        <p className="admin-empty-state">尚未設定固定支出。</p>
      ) : (
        <div className="expense-list">
          {templates.map((t) => (
            <article className="admin-table expense-item" key={t.id}>
              <div>
                <strong>
                  {t.name} · {t.active ? "啟用中" : "已暫停"}
                </strong>
                <p>
                  每月 {t.day} 日・{t.currency} {t.amount.toLocaleString()}・
                  {t.category}
                </p>
                <p>
                  {t.startMonth} 起・{t.method}
                </p>
              </div>
              <div className="expense-actions">
                <button
                  className="btn-ghost"
                  disabled={busy}
                  onClick={() => open(t)}
                >
                  修改設定
                </button>
                <button
                  className="btn-ghost"
                  disabled={busy}
                  onClick={() =>
                    void perform({
                      action: "setActive",
                      id: t.id,
                      active: !t.active,
                    })
                  }
                >
                  {t.active ? "暫停" : "恢復"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="expense-filters">
        <label>
          固定支出月份
          <input
            type="month"
            min="2000-01"
            max="2100-12"
            value={month}
            onChange={(e) => {
              if (/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(e.target.value))
                setMonth(e.target.value);
            }}
          />
        </label>
      </div>
      <h3>{month} 每月紀錄</h3>
      <p>
        待確認金額不計入支出。日圓固定項目請在每次付款時填入實際折合新臺幣金額。
      </p>
      {billsLoading ? (
        <p role="status">每月紀錄載入中…</p>
      ) : billError ? (
        <p role="alert">每月紀錄載入失敗，請重新整理。</p>
      ) : bills.length === 0 ? (
        <p className="admin-empty-state">
          此月份尚無固定支出紀錄。每月紀錄由每日凌晨排程產生，新設定的當月項目會立即產生。
        </p>
      ) : (
        <div className="expense-list">
          {bills.map((b) => (
            <article className="admin-table expense-item" key={b.id}>
              <div>
                <strong>
                  {b.name} ·{" "}
                  {
                    {
                      pending: "待確認付款",
                      paid: "已入帳",
                      skipped: "本月已略過",
                    }[b.status]
                  }
                </strong>
                <p>
                  預定付款：{b.dueDate}・{b.currency}{" "}
                  {b.amount.toLocaleString()}
                </p>
                {b.status === "paid" && (
                  <p>請至「已付款明細」查看或編輯此筆支出。</p>
                )}
              </div>
              {b.status === "pending" && (
                <div className="expense-actions">
                  <button
                    className="btn-gold"
                    disabled={busy}
                    onClick={() => {
                      setPaying(b);
                      setPaidDate(taipeiDate());
                      setAmountTwd(
                        b.currency === "TWD" ? String(b.amount) : "",
                      );
                      setError("");
                    }}
                  >
                    確認已付款
                  </button>
                  <button
                    className="btn-ghost"
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          `略過 ${b.month} 的「${b.name}」？本月不再自動產生，也不計入支出。`,
                        )
                      )
                        void perform({ action: "skipBill", id: b.id });
                    }}
                  >
                    本月略過
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <Modal open={form !== null || paying !== null} onClose={close}>
        {form && (
          <form className="expense-form" onSubmit={submit}>
            <h2>{id ? "修改固定項目" : "新增固定項目"}</h2>
            <fieldset disabled={busy}>
              <label>
                固定項目名稱
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
                每月固定金額
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
              <label>
                每月付款日
                <input
                  type="number"
                  required
                  min="1"
                  max="31"
                  step="1"
                  value={form.day || ""}
                  onChange={(e) =>
                    setForm({ ...form, day: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                起始月份
                <input
                  type="month"
                  required
                  disabled={!!id}
                  min={taipeiDate().slice(0, 7)}
                  max="2100-12"
                  value={form.startMonth}
                  onChange={(e) =>
                    setForm({ ...form, startMonth: e.target.value })
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
                備註
                <textarea
                  maxLength={2000}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </label>
            </fieldset>
            {error && <p role="alert">{error}</p>}
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
                {busy ? "儲存中…" : "儲存固定項目"}
              </button>
            </div>
          </form>
        )}
        {paying && (
          <form
            className="expense-form"
            onSubmit={(e) => {
              e.preventDefault();
              void perform({
                action: "confirmBill",
                id: paying.id,
                paidDate,
                amountTwd: Number(amountTwd),
              });
            }}
          >
            <h2>確認已付款：{paying.name}</h2>
            <p>
              {paying.month}・{paying.currency} {paying.amount.toLocaleString()}
            </p>
            <fieldset disabled={busy}>
              <label>
                實際付款日期
                <input
                  type="date"
                  required
                  min="2000-01-01"
                  max="2100-12-31"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                />
              </label>
              {paying.currency === "JPY" && (
                <label>
                  實際折合新臺幣金額
                  <input
                    type="number"
                    required
                    min="1"
                    max="1000000000"
                    step="1"
                    value={amountTwd}
                    onChange={(e) => setAmountTwd(e.target.value)}
                  />
                </label>
              )}
            </fieldset>
            {error && <p role="alert">{error}</p>}
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
                {busy ? "處理中…" : "確認付款並入帳"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}

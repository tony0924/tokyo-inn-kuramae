import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db, functions } from "./firebase";
import { httpsCallable } from "firebase/functions";
import { resilientExpenseSubscription } from "./expenseSubscription";
import type { Expense, ExpenseDoc } from "@/types";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_METHODS,
  validExpenseDate,
} from "./expenseFinance";
export interface ExpenseInput {
  recurringBillId?: string;
  name: string;
  category: string;
  amount: number;
  currency: "JPY" | "TWD";
  paidDate: string;
  expenseMonth: string;
  method: string;
  note: string;
}
export function watchExpenses(
  year: string | null,
  cb: (items: Expense[]) => void,
  onError: (message?: string) => void,
) {
  const constraints = year
    ? [
        where(
          "paidAt",
          ">=",
          Timestamp.fromDate(new Date(`${year}-01-01T00:00:00+08:00`)),
        ),
        where(
          "paidAt",
          "<",
          Timestamp.fromDate(
            new Date(`${Number(year) + 1}-01-01T00:00:00+08:00`),
          ),
        ),
      ]
    : [];
  const expenseQuery = query(
    collection(db, "expenses"),
    ...constraints,
    orderBy("paidAt", "desc"),
    limit(10001),
  );
  let refreshedToken = false;
  const subscription = resilientExpenseSubscription<Expense>({
    listen: (next, failed) =>
      onSnapshot(
        expenseQuery,
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.metadata.fromCache) return;
          if (snap.size > 10000) {
            failed({ code: "resource-exhausted" });
            return;
          }
          next(
            snap.docs.map((item) => ({
              ...(item.data() as ExpenseDoc),
              id: item.id,
            })),
          );
        },
        (error) => {
          console.warn("Expense subscription failed", { code: error.code });
          failed(error);
        },
      ),
    fetch: async () => {
      if (!auth.currentUser) throw { code: "unauthenticated" };
      if (!refreshedToken) {
        await auth.currentUser.getIdToken(true);
        refreshedToken = true;
      }
      type WireExpense = Omit<
        Expense,
        "paidAt" | "createdAt" | "updatedAt" | "recurringBillId"
      > & {
        paidAt: number;
        createdAt: number | null;
        updatedAt: number | null;
        recurringBillId: string | null;
      };
      const result = await httpsCallable<
        { year: string | null },
        { items: WireExpense[] }
      >(functions, "loadExpenseOverview", { timeout: 30000 })({ year });
      return result.data.items.map((item) => ({
        ...item,
        recurringBillId: item.recurringBillId ?? undefined,
        paidAt: Timestamp.fromMillis(item.paidAt),
        createdAt:
          item.createdAt === null ? null : Timestamp.fromMillis(item.createdAt),
        updatedAt:
          item.updatedAt === null ? null : Timestamp.fromMillis(item.updatedAt),
      }));
    },
    next: cb,
    failed: (error) => {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "";
      console.warn("Expense fallback failed", { code });
      if (
        /unauthenticated|permission-denied|user-token-expired|invalid-user-token/.test(
          code,
        )
      )
        onError("登入狀態已失效或沒有管理者權限，請重新登入後再試。");
      else if (code.includes("resource-exhausted"))
        onError("支出超過讀取上限，請縮小查詢期間。");
      else
        onError(
          "支出暫時無法載入，請確認網路後按「重新載入」。系統也會自動重試。",
        );
    },
  });
  const refresh = () => subscription.refresh();
  const visible = () => {
    if (document.visibilityState === "visible") refresh();
  };
  window.addEventListener("online", refresh);
  window.addEventListener("expenses-changed", refresh);
  document.addEventListener("visibilitychange", visible);
  return () => {
    subscription.stop();
    window.removeEventListener("online", refresh);
    window.removeEventListener("expenses-changed", refresh);
    document.removeEventListener("visibilitychange", visible);
  };
}
export async function saveExpense(input: ExpenseInput, id?: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("請重新登入後再試。");
  if (
    !input.name.trim() ||
    input.name.trim().length > 120 ||
    !EXPENSE_CATEGORIES.includes(
      input.category as (typeof EXPENSE_CATEGORIES)[number],
    ) ||
    !EXPENSE_METHODS.includes(
      input.method as (typeof EXPENSE_METHODS)[number],
    ) ||
    !["JPY", "TWD"].includes(input.currency) ||
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    input.amount > 1000000000 ||
    !validExpenseDate(input.paidDate) ||
    (input.expenseMonth &&
      !/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(input.expenseMonth)) ||
    input.note.length > 2000
  )
    throw new Error("請確認名稱、日期與金額；金額須為大於 0 的整數。");
  const data = {
    name: input.name.trim(),
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    paidAt: Timestamp.fromDate(new Date(`${input.paidDate}T12:00:00+08:00`)),
    expenseMonth: input.expenseMonth,
    method: input.method,
    note: input.note.trim(),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  try {
    if (id) await updateDoc(doc(db, "expenses", id), data);
    else
      await addDoc(collection(db, "expenses"), {
        ...data,
        createdAt: serverTimestamp(),
        createdBy: uid,
      });
    window.dispatchEvent(new Event("expenses-changed"));
  } catch {
    throw new Error("支出儲存失敗，請確認網路連線後再試。");
  }
}
export async function deleteExpense(id: string) {
  await deleteDoc(doc(db, "expenses", id));
  window.dispatchEvent(new Event("expenses-changed"));
}

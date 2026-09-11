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
import { auth, db } from "./firebase";
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
  amountTwd: number | null;
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
  return onSnapshot(
    query(
      collection(db, "expenses"),
      ...constraints,
      orderBy("paidAt", "desc"),
      limit(10001),
    ),
    (snap) => {
      if (snap.size > 10000) {
        onError(
          "支出超過顯示上限，請縮小至單一年度；年度資料過多時請聯絡系統管理者。",
        );
        return;
      }
      cb(
        snap.docs.map((item) => ({
          id: item.id,
          ...(item.data() as ExpenseDoc),
        })),
      );
    },
    () => onError(),
  );
}
export async function saveExpense(input: ExpenseInput, id?: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("請重新登入後再試。");
  const amountTwd =
    input.recurringBillId && input.currency === "JPY"
      ? null
      : input.currency === "TWD"
        ? input.amount
        : input.amountTwd;
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
    ![
      input.amount,
      ...(input.recurringBillId && input.currency === "JPY" ? [] : [amountTwd]),
    ].every(
      (n) =>
        typeof n === "number" &&
        Number.isSafeInteger(n) &&
        n > 0 &&
        n <= 1000000000,
    ) ||
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
    amountTwd,
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
  } catch {
    throw new Error("支出儲存失敗，請確認網路連線後再試。");
  }
}
export async function deleteExpense(id: string) {
  await deleteDoc(doc(db, "expenses", id));
}

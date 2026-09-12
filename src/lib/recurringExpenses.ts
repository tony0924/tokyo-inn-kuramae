import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import type { RecurringExpense, RecurringExpenseBill } from "@/types";
export type RecurringExpenseInput = Omit<RecurringExpense, "id" | "active">;
export function watchRecurringTemplates(
  cb: (items: RecurringExpense[]) => void,
  error: () => void,
) {
  return onSnapshot(
    query(
      collection(db, "recurringExpenses"),
      orderBy("createdAt", "desc"),
      limit(1001),
    ),
    (snap) => {
      if (snap.size > 1000) return error();
      cb(
        snap.docs.map(
          (item) => ({ ...item.data(), id: item.id }) as RecurringExpense,
        ),
      );
    },
    error,
  );
}
export function watchRecurringBills(
  month: string,
  cb: (items: RecurringExpenseBill[]) => void,
  error: () => void,
) {
  return onSnapshot(
    query(
      collection(db, "recurringExpenseBills"),
      where("month", "==", month),
      limit(1001),
    ),
    (snap) => {
      if (snap.size > 1000) return error();
      cb(
        snap.docs
          .map(
            (item) => ({ ...item.data(), id: item.id }) as RecurringExpenseBill,
          )
          .sort(
            (a, b) =>
              a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id),
          ),
      );
    },
    error,
  );
}
export async function recurringExpenseAction(
  input:
    | { action: "saveTemplate"; id?: string; template: RecurringExpenseInput }
    | { action: "setActive"; id: string; active: boolean }
    | { action: "sync" },
) {
  try {
    await httpsCallable(functions, "manageRecurringExpenses", {
      timeout: 540000,
    })(input);
    window.dispatchEvent(new Event("expenses-changed"));
  } catch {
    throw new Error(
      "操作未完成，請確認資料與網路連線；紀錄若已處理，請重新整理查看。",
    );
  }
}

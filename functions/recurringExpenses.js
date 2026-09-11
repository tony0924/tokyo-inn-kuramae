import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
export const monthNow = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
  })
    .format(now)
    .slice(0, 7);
export function nextMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
}
export function dueDate(month, day) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(Math.min(day, new Date(Date.UTC(y, m, 0)).getUTCDate())).padStart(2, "0")}`;
}
const positiveAmount = (n) => Number.isSafeInteger(n) && n > 0 && n <= 1e9;
export function validateTemplate(input) {
  const {
    name,
    category,
    amount,
    currency,
    day,
    startMonth,
    method,
    note = "",
  } = input;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 120 ||
    ![
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
    ].includes(category) ||
    !positiveAmount(amount) ||
    currency !== "JPY" ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > 31 ||
    typeof startMonth !== "string" ||
    !/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(startMonth) ||
    !["轉帳", "信用卡", "現金", "其他"].includes(method) ||
    typeof note !== "string" ||
    note.length > 2000
  )
    throw new HttpsError(
      "invalid-argument",
      "請確認固定支出的名稱、金額、日期與起始月份。",
    );
  return {
    name: name.trim(),
    category,
    amount,
    currency,
    day,
    startMonth,
    method,
    note: note.trim(),
  };
}
const todayDate = (now) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
function autoExpense(bill, billId) {
  return {
    name: bill.name,
    category: bill.category,
    amount: bill.amount,
    currency: "JPY",
    amountTwd: null,
    paidAt: Timestamp.fromDate(new Date(`${bill.dueDate}T12:00:00+08:00`)),
    expenseMonth: bill.month,
    method: bill.method,
    note: bill.note,
    recurringBillId: billId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: "system:recurring",
    updatedBy: "system:recurring",
  };
}
// Handle old pending JPY bills without changing existing paid/skipped history or TWD amounts.
async function settleLegacyBills(db, id, today) {
  let cursor;
  while (true) {
    let query = db
      .collection("recurringExpenseBills")
      .where("templateId", "==", id)
      .orderBy("__name__")
      .limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const item of page.docs) {
      if (
        item.data().status !== "pending" ||
        item.data().currency !== "JPY" ||
        item.data().dueDate > today
      )
        continue;
      await db.runTransaction(async (tx) => {
        const template = await tx.get(
          db.collection("recurringExpenses").doc(id),
        );
        const current = await tx.get(item.ref);
        if (!template.data()?.active || !current.exists) return;
        const bill = current.data();
        if (
          bill.status !== "pending" ||
          bill.currency !== "JPY" ||
          bill.dueDate > today
        )
          return;
        const expenseRef = db
          .collection("expenses")
          .doc(`recurring_${item.id}`);
        const expense = await tx.get(expenseRef);
        if (!expense.exists) tx.create(expenseRef, autoExpense(bill, item.id));
        tx.update(item.ref, {
          status: "paid",
          expenseId: expenseRef.id,
          updatedAt: Timestamp.now(),
          updatedBy: "system:recurring",
        });
      });
    }
    if (page.size < 100) return;
    cursor = page.docs.at(-1);
  }
}
export async function generateTemplateBills(db, id, now = new Date()) {
  const today = todayDate(now);
  const ref = db.collection("recurringExpenses").doc(id);
  // Up to 24 months per atomic chunk; continue until the entire requested history is complete.
  while (true) {
    const advanced = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return false;
      const t = snap.data();
      if (!t.active || t.currency !== "JPY") return false;
      const months = [];
      const resume = (m) =>
        t.backfillEndMonth &&
        m >= t.backfillEndMonth &&
        m < t.backfillResumeMonth
          ? t.backfillResumeMonth
          : m;
      let month = resume(t.nextMonth);
      while (
        months.length < 24 &&
        month <= today.slice(0, 7) &&
        dueDate(month, t.day) <= today
      ) {
        months.push(month);
        month = resume(nextMonth(month));
      }
      if (!months.length) {
        if (month !== t.nextMonth)
          tx.update(ref, {
            nextMonth: month,
            backfillEndMonth: FieldValue.delete(),
            backfillResumeMonth: FieldValue.delete(),
          });
        return false;
      }
      const records = [];
      for (const m of months) {
        const billRef = db
          .collection("recurringExpenseBills")
          .doc(`${id}_${m}`);
        const expenseRef = db
          .collection("expenses")
          .doc(`recurring_${billRef.id}`);
        records.push({
          billRef,
          expenseRef,
          bill: await tx.get(billRef),
          expense: await tx.get(expenseRef),
          month: m,
        });
      }
      for (const r of records) {
        if (r.bill.exists && r.bill.data().status !== "pending") continue;
        const bill = r.bill.exists
          ? r.bill.data()
          : {
              templateId: id,
              month: r.month,
              name: t.name,
              category: t.category,
              amount: t.amount,
              currency: "JPY",
              method: t.method,
              note: t.note,
              dueDate: dueDate(r.month, t.day),
              createdAt: Timestamp.now(),
            };
        if (bill.currency !== "JPY" || bill.dueDate > today) continue;
        if (!r.expense.exists)
          tx.create(r.expenseRef, autoExpense(bill, r.billRef.id));
        tx.set(r.billRef, {
          ...bill,
          status: "paid",
          expenseId: r.expenseRef.id,
          updatedAt: Timestamp.now(),
          updatedBy: "system:recurring",
        });
      }
      tx.update(ref, {
        nextMonth: month,
        ...(t.backfillEndMonth && month >= t.backfillEndMonth
          ? {
              backfillEndMonth: FieldValue.delete(),
              backfillResumeMonth: FieldValue.delete(),
            }
          : {}),
      });
      return true;
    });
    if (!advanced) break;
  }
  await settleLegacyBills(db, id, today);
}
export async function syncRecurringExpenses(db, now = new Date()) {
  let cursor;
  while (true) {
    let query = db
      .collection("recurringExpenses")
      .orderBy("__name__")
      .limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const item of page.docs) await generateTemplateBills(db, item.id, now);
    if (page.size < 100) return;
    cursor = page.docs.at(-1);
  }
}
export async function processRecurringExpenseAction(
  db,
  uid,
  input,
  now = new Date(),
) {
  const currentMonth = monthNow(now);
  const action = input?.action;
  if (action === "sync") {
    await syncRecurringExpenses(db, now);
    return {};
  }
  if (action === "saveTemplate") {
    const id = input.id;
    if (id && (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)))
      throw new HttpsError("invalid-argument", "固定支出代碼不正確。");
    const data = validateTemplate(input.template ?? {});
    const ref = id
      ? db.collection("recurringExpenses").doc(id)
      : db.collection("recurringExpenses").doc();
    await db.runTransaction(async (tx) => {
      const previous = await tx.get(ref);
      if (id && !previous.exists)
        throw new HttpsError("not-found", "找不到固定支出。");
      if (previous.exists && previous.data().currency !== "JPY")
        throw new HttpsError(
          "failed-precondition",
          "既有非日圓項目請先暫停，另建日圓項目，避免改寫歷史幣別。",
        );
      if (previous.exists && data.startMonth > previous.data().startMonth)
        throw new HttpsError(
          "invalid-argument",
          "起始月份僅能往前延伸；既有紀錄不會刪除。",
        );
      const audit = { updatedAt: Timestamp.now(), updatedBy: uid };
      if (previous.exists)
        tx.update(ref, {
          ...data,
          ...audit,
          ...(data.startMonth < previous.data().startMonth
            ? {
                nextMonth: data.startMonth,
                backfillEndMonth:
                  previous.data().backfillEndMonth ??
                  previous.data().startMonth,
                backfillResumeMonth:
                  previous.data().backfillResumeMonth ??
                  previous.data().nextMonth,
              }
            : {}),
        });
      else
        tx.create(ref, {
          ...data,
          active: true,
          nextMonth: data.startMonth,
          ...audit,
          createdAt: Timestamp.now(),
          createdBy: uid,
        });
    });
    await generateTemplateBills(db, ref.id, now);
    return { id: ref.id };
  }
  if (typeof input?.id !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(input.id))
    throw new HttpsError("invalid-argument", "紀錄代碼不正確。");
  if (action === "setActive") {
    if (typeof input.active !== "boolean")
      throw new HttpsError("invalid-argument", "狀態不正確。");
    const ref = db.collection("recurringExpenses").doc(input.id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError("not-found", "找不到固定支出。");
      if (input.active && snap.data().currency !== "JPY")
        throw new HttpsError("failed-precondition", "請另建日圓固定支出項目。");
      const resumeMonth =
        snap.data().startMonth > currentMonth
          ? snap.data().startMonth
          : currentMonth;
      tx.update(ref, {
        active: input.active,
        ...(input.active && !snap.data().active
          ? {
              nextMonth: snap.data().backfillEndMonth
                ? snap.data().nextMonth
                : resumeMonth,
              ...(snap.data().backfillEndMonth
                ? { backfillResumeMonth: resumeMonth }
                : {}),
            }
          : {}),
        updatedAt: Timestamp.now(),
        updatedBy: uid,
      });
    });
    if (input.active) await generateTemplateBills(db, input.id, now);
    return {};
  }
  throw new HttpsError(
    "invalid-argument",
    "固定支出現已自動入帳，請重新整理頁面。",
  );
}

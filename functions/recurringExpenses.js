import { Timestamp } from "firebase-admin/firestore";
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
export function validateTemplate(input, currentMonth) {
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
    !["JPY", "TWD"].includes(currency) ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > 31 ||
    typeof startMonth !== "string" ||
    !/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(startMonth) ||
    startMonth < currentMonth ||
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
// Each transaction advances the cursor together with the unique monthly bill.
export async function generateTemplateBills(db, id, currentMonth) {
  const ref = db.collection("recurringExpenses").doc(id);
  for (let i = 0; i < 12; i++) {
    const advanced = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return false;
      const t = snap.data();
      if (!t.active || t.nextMonth > currentMonth) return false;
      const month = t.nextMonth;
      const billRef = db
        .collection("recurringExpenseBills")
        .doc(`${id}_${month}`);
      const bill = await tx.get(billRef);
      if (!bill.exists)
        tx.create(billRef, {
          templateId: id,
          month,
          name: t.name,
          category: t.category,
          amount: t.amount,
          currency: t.currency,
          method: t.method,
          note: t.note,
          dueDate: dueDate(month, t.day),
          status: "pending",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      tx.update(ref, { nextMonth: nextMonth(month) });
      return true;
    });
    if (!advanced) return;
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
  if (action === "saveTemplate") {
    const id = input.id;
    if (id && (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)))
      throw new HttpsError("invalid-argument", "固定支出代碼不正確。");
    const ref = id
      ? db.collection("recurringExpenses").doc(id)
      : db.collection("recurringExpenses").doc();
    await db.runTransaction(async (tx) => {
      const previous = await tx.get(ref);
      if (id && !previous.exists)
        throw new HttpsError("not-found", "找不到固定支出。");
      // Existing start month cannot be changed; allow historical start dates when editing.
      const data = validateTemplate(
        input.template ?? {},
        previous.exists ? previous.data().startMonth : currentMonth,
      );
      if (previous.exists && data.startMonth !== previous.data().startMonth)
        throw new HttpsError("invalid-argument", "起始月份建立後無法更改。");
      const audit = { updatedAt: Timestamp.now(), updatedBy: uid };
      if (previous.exists) tx.update(ref, { ...data, ...audit });
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
    await generateTemplateBills(db, ref.id, currentMonth);
    return { id: ref.id };
  }
  if (typeof input.id !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(input.id))
    throw new HttpsError("invalid-argument", "紀錄代碼不正確。");
  if (action === "setActive") {
    if (typeof input.active !== "boolean")
      throw new HttpsError("invalid-argument", "狀態不正確。");
    const ref = db.collection("recurringExpenses").doc(input.id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError("not-found", "找不到固定支出。");
      tx.update(ref, {
        active: input.active,
        ...(input.active && !snap.data().active
          ? {
              nextMonth:
                snap.data().startMonth > currentMonth
                  ? snap.data().startMonth
                  : currentMonth,
            }
          : {}),
        updatedAt: Timestamp.now(),
        updatedBy: uid,
      });
    });
    if (input.active) await generateTemplateBills(db, input.id, currentMonth);
    return {};
  }
  if (!["confirmBill", "skipBill"].includes(action))
    throw new HttpsError("invalid-argument", "不支援的操作。");
  const ref = db.collection("recurringExpenseBills").doc(input.id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "找不到每月支出。");
    const bill = snap.data();
    if (bill.status !== "pending")
      throw new HttpsError(
        "failed-precondition",
        "這筆紀錄已處理，請重新整理。",
      );
    if (action === "skipBill") {
      tx.update(ref, {
        status: "skipped",
        updatedAt: Timestamp.now(),
        updatedBy: uid,
      });
      return;
    }
    const date = input.paidDate;
    const amountTwd = bill.currency === "TWD" ? bill.amount : input.amountTwd;
    if (
      typeof date !== "string" ||
      !/^(20\d{2}|2100)-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(`${date}T12:00:00+08:00`)) ||
      new Date(`${date}T12:00:00+08:00`).toISOString().slice(0, 10) !== date ||
      !positiveAmount(amountTwd)
    )
      throw new HttpsError(
        "invalid-argument",
        "請填入有效付款日期與折合新臺幣金額。",
      );
    const expenseRef = db.collection("expenses").doc(`recurring_${input.id}`);
    tx.create(expenseRef, {
      name: bill.name,
      category: bill.category,
      amount: bill.amount,
      currency: bill.currency,
      amountTwd,
      paidAt: Timestamp.fromDate(new Date(`${date}T12:00:00+08:00`)),
      expenseMonth: bill.month,
      method: bill.method,
      note: bill.note,
      recurringBillId: input.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: uid,
      updatedBy: uid,
    });
    tx.update(ref, {
      status: "paid",
      expenseId: expenseRef.id,
      updatedAt: Timestamp.now(),
      updatedBy: uid,
    });
  });
  return {};
}

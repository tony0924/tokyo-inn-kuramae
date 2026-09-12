import { Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
export async function readExpenseOverview(db, uid, year) {
  if (!uid) throw new HttpsError("unauthenticated", "請重新登入。");
  const user = await db.collection("users").doc(uid).get();
  if (user.data()?.role !== "admin")
    throw new HttpsError("permission-denied", "僅管理者可讀取支出。");
  if (
    year !== null &&
    (typeof year !== "string" || !/^(20\d{2}|2100)$/.test(year))
  )
    throw new HttpsError("invalid-argument", "年份不正確。");
  let query = db.collection("expenses");
  if (year)
    query = query
      .where(
        "paidAt",
        ">=",
        Timestamp.fromDate(new Date(`${year}-01-01T00:00:00+08:00`)),
      )
      .where(
        "paidAt",
        "<",
        Timestamp.fromDate(
          new Date(`${Number(year) + 1}-01-01T00:00:00+08:00`),
        ),
      );
  const snap = await query.orderBy("paidAt", "desc").limit(10001).get();
  if (snap.size > 10000)
    throw new HttpsError("resource-exhausted", "支出超過讀取上限。");
  return {
    items: snap.docs.map((item) => {
      const d = item.data();
      return {
        id: item.id,
        name: d.name,
        category: d.category,
        amount: d.amount,
        currency: d.currency,
        paidAt: d.paidAt.toMillis(),
        expenseMonth: d.expenseMonth ?? "",
        method: d.method,
        note: d.note ?? "",
        recurringBillId: d.recurringBillId ?? null,
        createdAt: d.createdAt?.toMillis() ?? null,
        updatedAt: d.updatedAt?.toMillis() ?? null,
        createdBy: d.createdBy,
        updatedBy: d.updatedBy,
      };
    }),
  };
}

import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import nodemailer from "nodemailer";
import { InvalidGoogleMapsUrlError, resolveGoogleMapsUrl } from "./googleMapsUrl.js";
import {
  isGuestAccessCurrentlyValid,
  normalizeGuestAccessCode,
} from "./guestPortalAccess.js";

initializeApp();

const db = getFirestore("default");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
const googleMapsApiKey = defineSecret("GOOGLE_MAPS_API_KEY");
const maintenanceToken = defineSecret("MAINTENANCE_TOKEN");
const REGION = "asia-east1";
const TIME_ZONE = "Asia/Taipei";
const WEBSITE_URL = "https://tokyo-inn-kuramae.web.app";
const GUEST_CODE_LOGIN_URL = `${WEBSITE_URL}/code-login`;
const PRIVATE_GUEST_GUIDE_PATH = "guestGuideContent/private";

const DEFAULT_SETTINGS = {
  senderName: "KURACHEN Stay",
  senderEmail: "ttoonnyy8024@gmail.com",
  bookingCreatedReminder: {
    subject: "預約完成通知｜{{guestName}} 您好",
    body:
      "您好 {{guestName}}，\n\n您的預約已建立完成。\n\n預約姓名：{{guestName}}\n入住日期：{{checkInDate}}\n退房日期：{{checkOutDate}}\n入住人數：{{partySize}}\n\n入住資訊網站：{{guestCodeLoginUrl}}\n訪客碼：{{guestAccessCode}}\n\n您可以使用 Gmail 登入，或在網站輸入訪客碼查看入住指南。訪客碼從預約建立後即可使用，效期至退房後一天。\n\n如有任何問題，歡迎直接回信與我們聯繫。\n\n祝旅途愉快\n{{senderName}}",
  },
  checkInReminder: {
    subject: "明天入住提醒｜{{guestName}} 您好",
    body:
      "您好 {{guestName}}，\n\n提醒您將於明天 {{checkInDate}} 入住。\n\n預約姓名：{{guestName}}\n入住日期：{{checkInDate}}\n退房日期：{{checkOutDate}}\n入住人數：{{partySize}}\n\n入住資訊網站：{{guestCodeLoginUrl}}\n訪客碼：{{guestAccessCode}}\n\n您可以使用 Gmail 登入，或在網站輸入訪客碼查看入住指南。訪客碼效期為入住前一天至退房後一天。\n\n如有任何問題，歡迎直接回信與我們聯繫。\n\n祝旅途愉快\n{{senderName}}",
  },
  checkoutAdminReminder: {
    subject: "退房提醒｜{{guestName}} 今日退房",
    body:
      "管理員您好，以下房客今天已到退房日，請留意後續清潔與鑰匙回收。\n\n房客姓名：{{guestName}}\n房客 Email：{{guestEmail}}\n入住日期：{{checkInDate}}\n退房日期：{{checkOutDate}}\n鑰匙編號：{{keyCode}}\n\n此信由系統自動寄出。",
  },
};

export const sendBookingCreatedReminder = onDocumentCreated(
  {
    document: "bookings/{bookingId}",
    database: "default",
    region: REGION,
    secrets: [gmailAppPassword],
  },
  async (event) => {
    const booking = {
      id: event.params.bookingId,
      ...event.data?.data(),
    };

    await Promise.all([
      sendAdminPush({
        title: `新預約｜${booking.guestName || "未命名房客"}`,
        body: `${formatDateInTimeZone(booking.checkIn)} 入住・${formatDateInTimeZone(booking.checkOut)} 退房・${booking.partySize || 0} 人`,
        url: `${WEBSITE_URL}/admin/bookings`,
        tag: `booking-created-${event.params.bookingId}`,
      }),
      sendBookingConflictPush(booking),
    ]);

    if (!booking.guestEmail) {
      logger.warn("Booking created without guest email. Skipping booking created reminder.", {
        bookingId: event.params.bookingId,
      });
      return;
    }

    if (booking.suppressBookingCreatedEmail === true) {
      logger.info("Booking created reminder suppressed.", {
        bookingId: event.params.bookingId,
      });
      return;
    }

    const settings = await getNotificationSettings();
    const adminEmails = await getAdminEmails();
    const variables = bookingVariables(booking, settings.senderName);

    await sendEmail({
      to: [booking.guestEmail],
      cc: adminEmails,
      subject: renderTemplate(settings.bookingCreatedReminder.subject, variables),
      text: renderTemplate(settings.bookingCreatedReminder.body, variables),
      senderName: settings.senderName,
      senderEmail: settings.senderEmail,
    });
  }
);

export const sendPendingUserApprovalReminder = onDocumentCreated(
  {
    document: "users/{userId}",
    database: "default",
    region: REGION,
    secrets: [gmailAppPassword],
  },
  async (event) => {
    const user = event.data?.data();
    if (user?.role !== "pending" || !user.email) return;

    await sendAdminPush({
      title: "新使用者等待審核",
      body: `${user.displayName || "未命名使用者"}・${user.email}`,
      url: `${WEBSITE_URL}/admin/users`,
      tag: `pending-user-${event.params.userId}`,
    });

    const settings = await getNotificationSettings();
    const adminEmails = await getAdminEmails();
    if (!adminEmails.length) return;

    await sendEmail({
      to: adminEmails,
      subject: `帳號待審核｜${user.displayName || user.email}`,
      text:
        `有新的帳號正在等待審核。\n\n` +
        `姓名：${user.displayName || "—"}\n` +
        `Email：${user.email}\n\n` +
        `請至管理後台的「使用者」頁面完成審核。`,
      senderName: settings.senderName,
      senderEmail: settings.senderEmail,
    });
  }
);

export const createGuestCommunityMessage = onCall(
  {
    region: REGION,
  },
  async (request) => {
    const body = typeof request.data?.body === "string" ? request.data.body.trim() : "";
    if (!body) {
      throw new HttpsError("invalid-argument", "請輸入留言內容。");
    }
    if (body.length > 1000) {
      throw new HttpsError("invalid-argument", "留言請控制在 1,000 字以內。");
    }

    const author = request.auth?.uid
      ? await getCommunityAuthorFromAccount(request.auth.uid)
      : await getCommunityAuthorFromGuestCode(request.data?.guestAccessCode);
    const message = await db.collection("guestCommunityMessages").add({
      authorType: author.authorType,
      authorName: author.authorName,
      body,
      createdAt: Timestamp.now(),
    });

    if (author.authorType === "guest") {
      await sendAdminPush({
        title: `${author.authorName} 在推薦牆留言`,
        body,
        url: `${WEBSITE_URL}/admin/messages`,
        tag: `guest-community-message-${message.id}`,
      });
    }

    return { id: message.id };
  }
);

export const getGuestPortalData = onCall(
  {
    region: REGION,
    enforceAppCheck: false,
  },
  async (request) => {
    const code = normalizeGuestAccessCode(request.data?.guestAccessCode);
    if (!code) {
      throw new HttpsError("invalid-argument", "訪客碼格式不正確。");
    }

    const accessSnapshot = await db.collection("guestAccessCodes").doc(code).get();
    const access = accessSnapshot.data();
    if (!isGuestAccessCurrentlyValid(access)) {
      throw new HttpsError("permission-denied", "訪客碼不存在、尚未生效或已過期。");
    }

    const [guideSnapshot, bookingSnapshot] = await Promise.all([
      db.doc(PRIVATE_GUEST_GUIDE_PATH).get(),
      access.bookingId
        ? db.collection("bookings").doc(access.bookingId).get()
        : Promise.resolve(null),
    ]);
    if (!guideSnapshot.exists) {
      logger.error("Private guest guide is missing.");
      throw new HttpsError("failed-precondition", "房客指南尚未設定完成。");
    }

    const booking = bookingSnapshot?.exists ? bookingSnapshot.data() : null;
    return {
      access: {
        code,
        bookingId: typeof access.bookingId === "string" ? access.bookingId : null,
        guestName: cleanCommunityAuthorName(access.guestName),
        startsAt: access.startsAt.toMillis(),
        expiresAt: access.expiresAt.toMillis(),
      },
      booking: bookingSnapshot?.exists
        ? {
            id: bookingSnapshot.id,
            guestName: String(booking?.guestName || access.guestName || "訪客").slice(0, 80),
            partySize: Number.isInteger(booking?.partySize) ? booking.partySize : 0,
            checkIn: booking?.checkIn?.toMillis?.() || access.startsAt.toMillis(),
            checkOut: booking?.checkOut?.toMillis?.() || access.expiresAt.toMillis(),
          }
        : null,
      guide: guideSnapshot.data(),
    };
  }
);

export const sendFirstDailyGuestCodeLoginPush = onDocumentCreated(
  {
    document: "guestPageViews/{viewId}",
    database: "default",
    region: REGION,
  },
  async (event) => {
    const view = event.data?.data();
    if (
      !view
      || view.eventType !== "code_login"
      || view.visitorType !== "guest_code"
      || typeof view.guestAccessCode !== "string"
    ) {
      return;
    }

    const code = view.guestAccessCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!code) return;

    const dateKey = formatDateKey(view.createdAt);
    const markerReference = db
      .collection("guestCodeDailyLogins")
      .doc(`${code}_${dateKey}`);
    const shouldSend = await db.runTransaction(async (transaction) => {
      const marker = await transaction.get(markerReference);
      if (marker.exists) {
        const data = marker.data();
        return data?.eventId === event.id && !data?.sentAt;
      }

      transaction.set(markerReference, {
        code,
        dateKey,
        eventId: event.id,
        guestName: view.guestName || null,
        guestEmail: view.guestEmail || null,
        firstLoginAt: view.createdAt || Timestamp.now(),
        createdAt: Timestamp.now(),
        sentAt: null,
      });
      return true;
    });
    if (!shouldSend) return;

    await sendAdminPush({
      title: "訪客碼今日首次登入",
      body: `${view.guestName || "訪客"} 使用 ${formatGuestCode(code)} 登入`,
      url: `${WEBSITE_URL}/admin/guest-codes`,
      tag: `guest-code-first-login-${code}-${dateKey}`,
    });
    await markerReference.update({ sentAt: Timestamp.now() });
  }
);

export const sendBookingUpdatedPush = onDocumentUpdated(
  {
    document: "bookings/{bookingId}",
    database: "default",
    region: REGION,
  },
  async (event) => {
    const before = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!before || !afterData) return;

    const datesChanged =
      !timestampsEqual(before.checkIn, afterData.checkIn)
      || !timestampsEqual(before.checkOut, afterData.checkOut);
    const keyChanged = before.keyCode !== afterData.keyCode;
    if (!datesChanged && !keyChanged) return;

    const after = { id: event.params.bookingId, ...afterData };
    const tasks = [sendBookingConflictPush(after)];
    if (datesChanged) {
      tasks.push(
        sendAdminPush({
          title: `預約日期已修改｜${after.guestName || "未命名房客"}`,
          body: `${formatDateInTimeZone(after.checkIn)} 入住・${formatDateInTimeZone(after.checkOut)} 退房`,
          url: `${WEBSITE_URL}/admin/bookings`,
          tag: `booking-updated-${event.params.bookingId}`,
        })
      );
    }
    await Promise.all(tasks);
  }
);

export const sendBookingDeletedPush = onDocumentDeleted(
  {
    document: "bookings/{bookingId}",
    database: "default",
    region: REGION,
  },
  async (event) => {
    const booking = event.data?.data();
    if (!booking) return;

    await sendAdminPush({
      title: `預約已取消｜${booking.guestName || "未命名房客"}`,
      body: `${formatDateInTimeZone(booking.checkIn)} 入住的預約已刪除`,
      url: `${WEBSITE_URL}/admin/bookings`,
      tag: `booking-deleted-${event.params.bookingId}`,
    });
  }
);

export const sendUserApprovalCompletedNotice = onDocumentUpdated(
  {
    document: "users/{userId}",
    database: "default",
    region: REGION,
    secrets: [gmailAppPassword],
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.role !== "pending" || after.role === "pending" || !after.email) return;

    const settings = await getNotificationSettings();
    const adminEmails = await getAdminEmails();
    await sendEmail({
      to: [after.email],
      cc: adminEmails,
      subject: "帳號審核完成｜KURACHEN Stay",
      text:
        `您好 ${after.displayName || ""}，\n\n` +
        `您的帳號已完成審核，現在可以使用 Gmail 登入入住資訊網站。\n\n` +
        `網站：${WEBSITE_URL}\n\n` +
        `如有任何問題，歡迎直接回信詢問。\n\n${settings.senderName}`,
      senderName: settings.senderName,
      senderEmail: settings.senderEmail,
    });
  }
);

export const sendUserReturnedToPendingReminder = onDocumentUpdated(
  {
    document: "users/{userId}",
    database: "default",
    region: REGION,
    secrets: [gmailAppPassword],
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.role === "pending" || after.role !== "pending" || !after.email) return;

    await sendAdminPush({
      title: "使用者等待重新審核",
      body: `${after.displayName || "未命名使用者"}・${after.email}`,
      url: `${WEBSITE_URL}/admin/users`,
      tag: `pending-user-${event.params.userId}`,
    });

    const settings = await getNotificationSettings();
    const adminEmails = await getAdminEmails();
    if (!adminEmails.length) return;
    await sendEmail({
      to: adminEmails,
      subject: `帳號待重新審核｜${after.displayName || after.email}`,
      text:
        `帳號已被退回待審核。\n\n` +
        `姓名：${after.displayName || "—"}\n` +
        `Email：${after.email}\n\n` +
        `請至管理後台的「使用者」頁面重新審核。`,
      senderName: settings.senderName,
      senderEmail: settings.senderEmail,
    });
  }
);

export const sendUpcomingCheckInReminders = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: TIME_ZONE,
    region: REGION,
    secrets: [gmailAppPassword],
  },
  async () => {
    const settings = await getNotificationSettings();
    const adminEmails = await getAdminEmails();
    if (!adminEmails.length) {
      logger.warn("No admin emails found. Skipping guest check-in reminder.");
      return;
    }

    const target = atMidnightDaysFromNow(1);
    const bookings = await getBookingsByDateField("checkIn", target);

    for (const booking of bookings) {
      if (!booking.guestEmail) continue;
      const variables = bookingVariables(booking, settings.senderName);
      await sendEmail({
        to: [booking.guestEmail],
        cc: adminEmails,
        subject: renderTemplate(settings.checkInReminder.subject, variables),
        text: renderTemplate(settings.checkInReminder.body, variables),
        senderName: settings.senderName,
        senderEmail: settings.senderEmail,
      });
    }
  }
);

export const sendTodayCheckInAdminPushes = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: TIME_ZONE,
    region: REGION,
  },
  async () => {
    const target = atMidnightDaysFromNow(0);
    const bookings = await getBookingsByDateField("checkIn", target);

    for (const booking of bookings) {
      await sendAdminPush({
        title: `今日入住｜${booking.guestName || "未命名房客"}`,
        body: `${booking.partySize || 0} 人入住，請確認房況、鑰匙與入住準備`,
        url: `${WEBSITE_URL}/admin/today`,
        tag: `checkin-today-${booking.id}`,
      });

      if (!(await hasValidGuestAccessCode(booking))) {
        await sendAdminPush({
          title: `尚無有效訪客碼｜${booking.guestName || "未命名房客"}`,
          body: "房客今天入住，請立即建立或確認訪客碼",
          url: `${WEBSITE_URL}/admin/guest-codes`,
          tag: `missing-guest-code-${booking.id}`,
        });
      }
    }
  }
);

export const sendTodayCheckoutAdminPushes = onSchedule(
  {
    schedule: "0 11 * * *",
    timeZone: TIME_ZONE,
    region: REGION,
  },
  async () => {
    const target = atMidnightDaysFromNow(0);
    const bookings = await getBookingsByDateField("checkOut", target);

    for (const booking of bookings) {
      const keyPending = Boolean(booking.keyCode && !booking.keyReturnedAt);
      await sendAdminPush({
        title: `退房提醒｜${booking.guestName || "未命名房客"}`,
        body: keyPending
          ? `已到退房時間，鑰匙 ${booking.keyCode} 尚未標記歸還`
          : "已到退房時間，請確認房況與後續清潔",
        url: `${WEBSITE_URL}/admin/today`,
        tag: `checkout-today-${booking.id}`,
      });
    }
  }
);

export const sendCheckoutAdminReminders = onSchedule(
  {
    schedule: "0 12 * * *",
    timeZone: TIME_ZONE,
    region: REGION,
    secrets: [gmailAppPassword],
  },
  async () => {
    const settings = await getNotificationSettings();
    const adminEmails = await getAdminEmails();
    if (!adminEmails.length) {
      logger.warn("No admin emails found. Skipping checkout admin reminder.");
      return;
    }

    const target = atMidnightDaysFromNow(0);
    const bookings = await getBookingsByDateField("checkOut", target);

    for (const booking of bookings) {
      const variables = bookingVariables(booking, settings.senderName);
      await sendEmail({
        to: adminEmails,
        subject: renderTemplate(settings.checkoutAdminReminder.subject, variables),
        text: renderTemplate(settings.checkoutAdminReminder.body, variables),
        senderName: settings.senderName,
        senderEmail: settings.senderEmail,
      });
    }
  }
);

export const lookupGoogleMapPlace = onCall(
  {
    region: REGION,
    secrets: [googleMapsApiKey],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "請先登入管理員帳號。");
    }

    const userSnap = await db.collection("users").doc(request.auth.uid).get();
    const userData = userSnap.data();
    if (!userSnap.exists || userData?.role !== "admin") {
      throw new HttpsError("permission-denied", "只有管理員可以使用這個功能。");
    }

    const url = typeof request.data?.url === "string" ? request.data.url.trim() : "";
    if (!url) {
      throw new HttpsError("invalid-argument", "請提供 Google Maps 連結。");
    }

    if (url.length > 2048) {
      throw new HttpsError("invalid-argument", "Google Maps 連結過長。");
    }

    const apiKey = googleMapsApiKey.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "GOOGLE_MAPS_API_KEY 尚未設定。");
    }

    let resolvedUrl;
    try {
      resolvedUrl = await resolveGoogleMapsUrl(url);
    } catch (error) {
      if (error instanceof InvalidGoogleMapsUrlError) {
        throw new HttpsError("invalid-argument", error.message);
      }
      throw error;
    }
    const parsed = extractPlaceLookupHints(resolvedUrl);

    let place = null;
    let searchError = null;

    if (parsed.placeId) {
      place = await fetchPlaceDetails(parsed.placeId, apiKey).catch(() => null);
    }

    if (!place) {
      try {
        place = await searchPlaceByText(parsed, apiKey);
      } catch (error) {
        searchError = error;
      }
    }

    if (!place && parsed.placeName && parsed.lat != null && parsed.lng != null) {
      return {
        placeId: parsed.placeId || "",
        name: parsed.placeName,
        address: "",
        lat: parsed.lat,
        lng: parsed.lng,
        sourceUrl: resolvedUrl,
        fallback: true,
      };
    }

    if (!place) {
      if (searchError instanceof HttpsError) {
        throw searchError;
      }
      throw new HttpsError("not-found", "找不到對應的 Google Maps 商家，請改用手動輸入。");
    }

    return {
      placeId: place.id || parsed.placeId || "",
      name: place.displayName?.text || "",
      address: place.formattedAddress || "",
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
      sourceUrl: resolvedUrl,
      fallback: false,
    };
  }
);

export const normalizeRecommendationCategorySortOrders = onRequest(
  {
    region: REGION,
    secrets: [maintenanceToken],
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "method-not-allowed" });
      return;
    }

    const token = (request.get("x-maintenance-token") || "").trim();
    if (!token || token !== maintenanceToken.value()) {
      response.status(401).json({ error: "unauthorized" });
      return;
    }

    const section = typeof request.body?.section === "string" ? request.body.section.trim() : "";
    const category = typeof request.body?.category === "string" ? request.body.category.trim() : "";

    if (!section || !category) {
      response.status(400).json({ error: "section-and-category-required" });
      return;
    }

    const snap = await db
      .collection("recommendations")
      .where("section", "==", section)
      .where("category", "==", category)
      .orderBy("sortOrder", "asc")
      .get();

    const docs = snap.docs
      .map((item) => ({
        id: item.id,
        ref: item.ref,
        name: item.data().name || "",
        sortOrder: item.data().sortOrder || 0,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "zh-Hant"));

    const batch = db.batch();
    const before = docs.map((item) => ({
      id: item.id,
      name: item.name,
      sortOrder: item.sortOrder,
    }));

    docs.forEach((item, index) => {
      batch.update(item.ref, {
        sortOrder: index + 1,
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();

    response.json({
      section,
      category,
      updated: docs.length,
      before,
      after: docs.map((item, index) => ({
        id: item.id,
        name: item.name,
        sortOrder: index + 1,
      })),
    });
  }
);

async function getNotificationSettings() {
  const snap = await db.collection("settings").doc("notifications").get();
  if (!snap.exists) return DEFAULT_SETTINGS;
  const stored = snap.data();
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    senderName: stored?.senderName === "Kuramae NEXT"
      ? DEFAULT_SETTINGS.senderName
      : stored?.senderName || DEFAULT_SETTINGS.senderName,
    bookingCreatedReminder: {
      ...DEFAULT_SETTINGS.bookingCreatedReminder,
      ...(stored?.bookingCreatedReminder || {}),
    },
    checkInReminder: {
      ...DEFAULT_SETTINGS.checkInReminder,
      ...(stored?.checkInReminder || {}),
    },
    checkoutAdminReminder: {
      ...DEFAULT_SETTINGS.checkoutAdminReminder,
      ...(stored?.checkoutAdminReminder || {}),
    },
  };
}

async function getAdminEmails() {
  const snap = await db
    .collection("users")
    .where("role", "==", "admin")
    .where("active", "==", true)
    .get();

  return snap.docs
    .map((doc) => doc.data().email)
    .filter((email) => typeof email === "string" && email.length > 0);
}

async function getBookingsByDateField(fieldName, date) {
  const start = Timestamp.fromDate(date);
  const end = Timestamp.fromDate(new Date(date.getTime() + 86400000));
  const snap = await db
    .collection("bookings")
    .where(fieldName, ">=", start)
    .where(fieldName, "<", end)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function sendAdminPush({
  title,
  body,
  url,
  tag,
  badge = "1",
}) {
  const notificationReference = db.collection("adminNotifications").doc();
  const notification = {
    title: truncatePushText(title, 80),
    body: truncatePushText(body, 160),
    url,
    tag,
    badge,
    status: "pending",
    deviceCount: 0,
    successCount: 0,
    failureCount: 0,
    createdAt: Timestamp.now(),
    completedAt: null,
  };

  try {
    await notificationReference.set(notification);
  } catch (error) {
    logger.error("Failed to save admin notification history.", {
      error,
      tag,
    });
  }

  const devicesSnapshot = await db
    .collection("adminPushDevices")
    .where("enabled", "==", true)
    .get();
  if (devicesSnapshot.empty) {
    await updateAdminNotificationHistory(notificationReference, {
      status: "no_devices",
      completedAt: Timestamp.now(),
    });
    logger.info("No admin push devices registered. Skipping push.", { tag });
    return;
  }

  const devicesByToken = new Map();
  for (const deviceDocument of devicesSnapshot.docs) {
    const token = deviceDocument.data().token;
    if (typeof token === "string" && token.length > 20 && !devicesByToken.has(token)) {
      devicesByToken.set(token, deviceDocument.ref);
    }
  }

  const devices = [...devicesByToken.entries()].map(([token, reference]) => ({
    token,
    reference,
  }));
  if (devices.length === 0) {
    await updateAdminNotificationHistory(notificationReference, {
      status: "no_devices",
      completedAt: Timestamp.now(),
    });
    logger.info("No valid admin push tokens registered. Skipping push.", { tag });
    return;
  }

  const invalidReferences = [];
  let successCount = 0;
  let failureCount = 0;

  try {
    for (let offset = 0; offset < devices.length; offset += 500) {
      const batch = devices.slice(offset, offset + 500);
      const response = await getMessaging().sendEachForMulticast({
        tokens: batch.map((device) => device.token),
        data: {
          title: notification.title,
          body: notification.body,
          url,
          badge,
          tag,
        },
        webpush: {
          headers: {
            Urgency: "high",
          },
          fcmOptions: {
            link: url,
          },
        },
      });

      successCount += response.successCount;
      failureCount += response.failureCount;
      response.responses.forEach((result, index) => {
        if (result.success) return;
        const code = result.error?.code || "";
        if (
          code === "messaging/registration-token-not-registered"
          || code === "messaging/invalid-registration-token"
        ) {
          invalidReferences.push(batch[index].reference);
          return;
        }
        logger.warn("Failed to send admin push.", { code, tag });
      });
    }
  } catch (error) {
    await updateAdminNotificationHistory(notificationReference, {
      status: "failed",
      deviceCount: devices.length,
      successCount,
      failureCount: Math.max(failureCount, devices.length - successCount),
      completedAt: Timestamp.now(),
    });
    throw error;
  }

  for (let offset = 0; offset < invalidReferences.length; offset += 500) {
    const deleteBatch = db.batch();
    invalidReferences
      .slice(offset, offset + 500)
      .forEach((reference) => deleteBatch.delete(reference));
    await deleteBatch.commit();
  }

  await updateAdminNotificationHistory(notificationReference, {
    status: failureCount === 0 ? "sent" : successCount > 0 ? "partial" : "failed",
    deviceCount: devices.length,
    successCount,
    failureCount,
    completedAt: Timestamp.now(),
  });
}

async function updateAdminNotificationHistory(reference, data) {
  try {
    await reference.update(data);
  } catch (error) {
    logger.error("Failed to update admin notification history.", {
      error,
      notificationId: reference.id,
    });
  }
}

async function sendBookingConflictPush(booking) {
  if (!booking?.id || !booking.checkIn?.toMillis || !booking.checkOut?.toMillis) return;

  const snapshot = await db.collection("bookings").get();
  const conflicts = snapshot.docs
    .filter((item) => item.id !== booking.id)
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((other) => bookingsOverlap(booking, other));
  if (!conflicts.length) return;

  const normalizedKey = String(booking.keyCode || "").trim().toUpperCase();
  const keyConflict = normalizedKey
    ? conflicts.some(
      (other) => String(other.keyCode || "").trim().toUpperCase() === normalizedKey
    )
    : false;
  const otherGuests = conflicts
    .slice(0, 3)
    .map((item) => item.guestName || "未命名房客")
    .join("、");

  await sendAdminPush({
    title: keyConflict ? "鑰匙與預約衝突" : "預約時間衝突",
    body: `${booking.guestName || "未命名房客"} 與 ${otherGuests} 的入住日期重疊${keyConflict ? `，且皆使用鑰匙 ${booking.keyCode}` : ""}`,
    url: `${WEBSITE_URL}/admin/calendar`,
    tag: `booking-conflict-${booking.id}`,
  });
}

function bookingsOverlap(first, second) {
  if (
    !first.checkIn?.toMillis
    || !first.checkOut?.toMillis
    || !second.checkIn?.toMillis
    || !second.checkOut?.toMillis
  ) {
    return false;
  }
  return (
    first.checkIn.toMillis() < second.checkOut.toMillis()
    && first.checkOut.toMillis() > second.checkIn.toMillis()
  );
}

async function hasValidGuestAccessCode(booking) {
  const code = String(booking.guestAccessCode || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  if (!code) return false;

  const snapshot = await db.collection("guestAccessCodes").doc(code).get();
  if (!snapshot.exists) return false;
  const access = snapshot.data();
  const now = Date.now();
  return (
    access?.active === true
    && access.startsAt?.toMillis?.() <= now
    && access.expiresAt?.toMillis?.() > now
  );
}

async function getCommunityAuthorFromAccount(uid) {
  const snapshot = await db.collection("users").doc(uid).get();
  const user = snapshot.data();
  const isAdmin = snapshot.exists && user?.role === "admin";
  const isActiveGuest = snapshot.exists && user?.role === "guest" && user?.active === true;
  if (!isAdmin && !isActiveGuest) {
    throw new HttpsError("permission-denied", "此帳號目前沒有留言權限。");
  }
  return {
    authorType: isAdmin ? "admin" : "guest",
    authorName: cleanCommunityAuthorName(user?.displayName),
  };
}

async function getCommunityAuthorFromGuestCode(rawCode) {
  const code = String(rawCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!code) {
    throw new HttpsError("unauthenticated", "請先使用有效的訪客碼登入。");
  }
  const snapshot = await db.collection("guestAccessCodes").doc(code).get();
  const access = snapshot.data();
  const now = Date.now();
  const valid = snapshot.exists
    && access?.active === true
    && access.startsAt?.toMillis?.() <= now
    && access.expiresAt?.toMillis?.() > now;
  if (!valid) {
    throw new HttpsError("permission-denied", "訪客碼已失效，請重新登入。");
  }
  return {
    authorType: "guest",
    authorName: cleanCommunityAuthorName(access?.guestName),
  };
}

function cleanCommunityAuthorName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ").slice(0, 40);
  return name || "訪客";
}

function timestampsEqual(first, second) {
  return first?.toMillis?.() === second?.toMillis?.();
}

function atMidnightDaysFromNow(offsetDays) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = new Date(`${value.year}-${value.month}-${value.day}T00:00:00+08:00`);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function bookingVariables(booking, senderName) {
  return {
    guestName: booking.guestName || "",
    guestEmail: booking.guestEmail || "",
    checkInDate: formatTimestamp(booking.checkIn),
    checkOutDate: formatTimestamp(booking.checkOut),
    partySize: String(booking.partySize || ""),
    keyCode: booking.keyCode || "未設定",
    guestAccessCode: formatGuestCode(booking.guestAccessCode || ""),
    websiteUrl: WEBSITE_URL,
    guestCodeLoginUrl: GUEST_CODE_LOGIN_URL,
    senderName,
  };
}

function formatGuestCode(code) {
  if (!code) return "未設定";
  const normalized = String(code).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return normalized.length > 4
    ? `${normalized.slice(0, 4)}-${normalized.slice(4)}`
    : normalized;
}

function formatTimestamp(value) {
  if (!value?.toDate) return "";
  return value.toDate().toISOString().slice(0, 10);
}

function formatDateInTimeZone(value) {
  if (!value?.toDate) return "日期未設定";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TIME_ZONE,
    month: "numeric",
    day: "numeric",
  }).format(value.toDate());
}

function formatDateKey(value) {
  const date = value?.toDate ? value.toDate() : new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function renderTemplate(template, variables) {
  return Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template
  );
}

function truncatePushText(value, maxLength) {
  const normalized = String(value).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

async function sendEmail({ to, cc = [], subject, text, senderName, senderEmail }) {
  const appPassword = gmailAppPassword.value();
  if (!appPassword) {
    logger.warn("GMAIL_APP_PASSWORD is missing. Email not sent.", {
      to,
      cc,
      subject,
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: senderEmail,
      pass: appPassword,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${senderName || senderEmail}" <${senderEmail}>`,
      to,
      cc,
      subject,
      text,
    });
  } catch (error) {
    logger.error("Failed to send email with Gmail SMTP", {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      to,
      cc,
      subject,
    });
  }
}


function extractPlaceLookupHints(inputUrl) {
  let url;
  try {
    url = new URL(inputUrl);
  } catch {
    throw new HttpsError("invalid-argument", "Google Maps 連結格式不正確。");
  }

  const queryPlaceId = url.searchParams.get("query_place_id");
  const query = url.searchParams.get("q") || url.searchParams.get("query") || "";
  const coordinates = extractCoordinates(url.pathname) || extractCoordinates(url.href);
  const placeName = extractPlaceName(url.pathname);

  return {
    query: decodeURIComponent(query || placeName || "").replace(/\+/g, " ").trim(),
    placeId: queryPlaceId || "",
    placeName,
    lat: coordinates?.lat ?? null,
    lng: coordinates?.lng ?? null,
  };
}

function extractCoordinates(text) {
  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return {
      lat: Number(atMatch[1]),
      lng: Number(atMatch[2]),
    };
  }

  const bangMatch = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (bangMatch) {
    return {
      lat: Number(bangMatch[1]),
      lng: Number(bangMatch[2]),
    };
  }

  return null;
}

function extractPlaceName(pathname) {
  const placeMatch = pathname.match(/\/place\/([^/]+)/);
  if (!placeMatch) return "";
  return decodeURIComponent(placeMatch[1]).replace(/\+/g, " ").trim();
}

async function searchPlaceByText(parsed, apiKey) {
  if (!parsed.query) {
    return null;
  }

  const body = {
    textQuery: parsed.query,
    ...(parsed.lat != null && parsed.lng != null
      ? {
          locationBias: {
            circle: {
              center: {
                latitude: parsed.lat,
                longitude: parsed.lng,
              },
              radius: 500,
            },
          },
        }
      : {}),
  };

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await safeReadJson(response);
    logger.error("Google Text Search failed", { status: response.status, details, query: parsed.query });
    const message = details?.error?.message || "";
    if (response.status === 403 && /Places API \(New\).+disabled/i.test(message)) {
      throw new HttpsError("failed-precondition", "這把 Google Maps API key 尚未開啟 Places API (New)，目前先只能從連結帶入名稱和座標。");
    }
    throw new HttpsError("internal", "Google Maps 搜尋失敗。");
  }

  const payload = await response.json();
  return payload.places?.[0] ?? null;
}

async function fetchPlaceDetails(placeId, apiKey) {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
    },
  });

  if (!response.ok) {
    const details = await safeReadJson(response);
    logger.warn("Google Place Details failed", { status: response.status, details, placeId });
    throw new Error("place details failed");
  }

  return response.json();
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import nodemailer from "nodemailer";

initializeApp();

const db = getFirestore("default");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
const googleMapsApiKey = defineSecret("GOOGLE_MAPS_API_KEY");
const maintenanceToken = defineSecret("MAINTENANCE_TOKEN");
const REGION = "asia-east1";
const TIME_ZONE = "Asia/Taipei";
const WEBSITE_URL = "https://tokyo-inn-kuramae.web.app";
const GUEST_CODE_LOGIN_URL = `${WEBSITE_URL}/code-login`;

const DEFAULT_SETTINGS = {
  senderName: "Kuramae NEXT",
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
      "提醒：admin 您好，以下房客今天已到退房日，請留意後續清潔與鑰匙回收。\n\n房客姓名：{{guestName}}\n房客 Email：{{guestEmail}}\n入住日期：{{checkInDate}}\n退房日期：{{checkOutDate}}\n鑰匙編號：{{keyCode}}\n\n此信由系統自動寄出。",
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
      throw new HttpsError("unauthenticated", "請先登入管理者帳號。");
    }

    const userSnap = await db.collection("users").doc(request.auth.uid).get();
    const userData = userSnap.data();
    if (!userSnap.exists || userData?.role !== "admin") {
      throw new HttpsError("permission-denied", "只有管理者可以使用這個功能。");
    }

    const url = typeof request.data?.url === "string" ? request.data.url.trim() : "";
    if (!url) {
      throw new HttpsError("invalid-argument", "請提供 Google Maps 連結。");
    }

    const apiKey = googleMapsApiKey.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "GOOGLE_MAPS_API_KEY 尚未設定。");
    }

    const resolvedUrl = await resolveGoogleMapsUrl(url);
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
  return {
    ...DEFAULT_SETTINGS,
    ...snap.data(),
    bookingCreatedReminder: {
      ...DEFAULT_SETTINGS.bookingCreatedReminder,
      ...(snap.data()?.bookingCreatedReminder || {}),
    },
    checkInReminder: {
      ...DEFAULT_SETTINGS.checkInReminder,
      ...(snap.data()?.checkInReminder || {}),
    },
    checkoutAdminReminder: {
      ...DEFAULT_SETTINGS.checkoutAdminReminder,
      ...(snap.data()?.checkoutAdminReminder || {}),
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

function renderTemplate(template, variables) {
  return Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template
  );
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

async function resolveGoogleMapsUrl(inputUrl) {
  try {
    const response = await fetch(inputUrl, {
      method: "HEAD",
      redirect: "follow",
    });
    return response.url || inputUrl;
  } catch {
    try {
      const response = await fetch(inputUrl, {
        method: "GET",
        redirect: "follow",
      });
      return response.url || inputUrl;
    } catch {
      return inputUrl;
    }
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

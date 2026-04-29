import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import nodemailer from "nodemailer";

initializeApp();

const db = getFirestore("default");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
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

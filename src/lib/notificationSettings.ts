import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { NotificationSettings } from '@/types';

const SETTINGS_COLLECTION = 'settings';
const SETTINGS_ID = 'notifications';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  senderName: 'Kuramae NEXT',
  senderEmail: 'ttoonnyy8024@gmail.com',
  bookingCreatedReminder: {
    subject: '預約完成通知｜{{guestName}} 您好',
    body:
      '您好 {{guestName}}，\n\n您的預約已建立完成。\n\n預約姓名：{{guestName}}\n入住日期：{{checkInDate}}\n退房日期：{{checkOutDate}}\n入住人數：{{partySize}}\n\n入住資訊網站：{{guestCodeLoginUrl}}\n訪客碼：{{guestAccessCode}}\n\n您可以使用 Gmail 登入，或在網站輸入訪客碼查看入住指南。訪客碼從預約建立後即可使用，效期至退房後一天。\n\n如有任何問題，歡迎直接回信與我們聯繫。\n\n祝旅途愉快\n{{senderName}}',
  },
  checkInReminder: {
    subject: '明天入住提醒｜{{guestName}} 您好',
    body:
      '您好 {{guestName}}，\n\n提醒您將於明天 {{checkInDate}} 入住。\n\n預約姓名：{{guestName}}\n入住日期：{{checkInDate}}\n退房日期：{{checkOutDate}}\n入住人數：{{partySize}}\n\n入住資訊網站：{{guestCodeLoginUrl}}\n訪客碼：{{guestAccessCode}}\n\n您可以使用 Gmail 登入，或在網站輸入訪客碼查看入住指南。訪客碼效期為入住前一天至退房後一天。\n\n如有任何問題，歡迎直接回信與我們聯繫。\n\n祝旅途愉快\n{{senderName}}',
  },
  checkoutAdminReminder: {
    subject: '退房提醒｜{{guestName}} 今日退房',
    body:
      '提醒：admin 您好，以下房客今天已到退房日，請留意後續清潔與鑰匙回收。\n\n房客姓名：{{guestName}}\n房客 Email：{{guestEmail}}\n入住日期：{{checkInDate}}\n退房日期：{{checkOutDate}}\n鑰匙編號：{{keyCode}}\n\n此信由系統自動寄出。',
  },
};

export function watchNotificationSettings(
  cb: (settings: NotificationSettings) => void
): Unsubscribe {
  return onSnapshot(doc(db, SETTINGS_COLLECTION, SETTINGS_ID), (snap) => {
    if (snap.exists()) {
      const data = snap.data() as Partial<NotificationSettings>;
      cb({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...data,
        bookingCreatedReminder: {
          ...DEFAULT_NOTIFICATION_SETTINGS.bookingCreatedReminder,
          ...data.bookingCreatedReminder,
        },
        checkInReminder: {
          ...DEFAULT_NOTIFICATION_SETTINGS.checkInReminder,
          ...data.checkInReminder,
        },
        checkoutAdminReminder: {
          ...DEFAULT_NOTIFICATION_SETTINGS.checkoutAdminReminder,
          ...data.checkoutAdminReminder,
        },
      });
      return;
    }
    cb(DEFAULT_NOTIFICATION_SETTINGS);
  });
}

export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<void> {
  await setDoc(
    doc(db, SETTINGS_COLLECTION, SETTINGS_ID),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

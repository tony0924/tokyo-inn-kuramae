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
const CURRENT_REMINDER_TEMPLATE_VERSION = 2;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  senderName: 'KURACHEN Stay',
  senderEmail: 'ttoonnyy8024@gmail.com',
  reminderTemplateVersion: CURRENT_REMINDER_TEMPLATE_VERSION,
  bookingCreatedReminder: {
    subject: '預約完成通知｜{{guestName}} 您好',
    body:
      '您好 {{guestName}}，\n\n您的預約已建立完成。\n\n預約姓名：{{guestName}}\n入住日期：{{checkInDate}}\n退房日期：{{checkOutDate}}\n入住人數：{{partySize}}\n\n入住資訊網站：{{guestCodeLoginUrl}}\n訪客碼：{{guestAccessCode}}\n\n您可以使用 Gmail 登入，或在網站輸入訪客碼查看入住指南。訪客碼從預約建立後即可使用，效期至退房後一天。\n\n如有任何問題，歡迎直接回信與我們聯繫。\n\n祝旅途愉快\n{{senderName}}',
  },
  checkInReminder: {
    subject: '明天入住提醒｜{{guestName}} 您好',
    body:
      '您好 {{guestName}}，\n\n提醒您將於明天 {{checkInDate}} 入住，以下是抵達住宿的簡短交通說明：\n\n【從成田機場出發】\n・推薦搭乘 Sky Access 前往都營淺草線「藏前站」，不建議搭乘 Skyliner。\n・Sky Access 特急通常可直達藏前站。\n・若搭乘 Sky Access 機場特快，列車不會停藏前站，請在淺草站下車，於同月台轉乘下一班往藏前方向的列車。\n・抵達藏前站後，建議使用 A5 電梯出口。\n\n【從羽田機場出發】\n・推薦搭乘京急機場線，搭乘直通都營淺草線的列車前往「藏前站」。\n・多數班次可直通；如需換車，請以當天 Google Maps 顯示的月台與班次為準。\n・抵達藏前站後，建議使用 A0 電梯出口。\n\n班次與月台可能因時間而異，出發前請再次確認 Google Maps。\n\n房客網站：{{guestCodeLoginUrl}}\n訪客碼：{{guestAccessCode}}\n\nEmail 僅提供簡短說明；住宿地址、進房方式、地圖與完整交通指引，請登入房客網站查看。\n\n祝旅途愉快\n{{senderName}}',
  },
  checkoutAdminReminder: {
    subject: '今日退房提醒｜{{guestName}}',
    body:
      '您好 {{guestName}}，\n\n今天 {{checkOutDate}} 是退房日，請於 11:00 前完成退房。離開前請簡單確認：\n\n・將冷氣與電視遙控器放回客廳餐桌\n・用吸塵器清潔全室地板\n・移除使用過的拋棄式床單\n・清空冰箱，並依分類丟棄所有垃圾\n・關閉燈、浴室抽風機與熱水機\n・拍照或錄影臥室、客廳、冰箱、廚房與浴室，並回傳房內狀態\n\n房客網站：{{guestCodeLoginUrl}}\n訪客碼：{{guestAccessCode}}\n\nEmail 僅提供簡短清單；垃圾位置、完整退房步驟與可勾選 Checklist，請登入房客網站查看。\n\n謝謝您的入住，祝旅途順利\n{{senderName}}',
  },
};

export function watchNotificationSettings(
  cb: (settings: NotificationSettings) => void
): Unsubscribe {
  return onSnapshot(doc(db, SETTINGS_COLLECTION, SETTINGS_ID), (snap) => {
    if (snap.exists()) {
      const data = snap.data() as Partial<NotificationSettings>;
      const hasCurrentReminderTemplates =
        Number(data.reminderTemplateVersion || 0) >= CURRENT_REMINDER_TEMPLATE_VERSION;
      cb({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...data,
        reminderTemplateVersion: CURRENT_REMINDER_TEMPLATE_VERSION,
        senderName: data.senderName === 'Kuramae NEXT'
          ? DEFAULT_NOTIFICATION_SETTINGS.senderName
          : data.senderName || DEFAULT_NOTIFICATION_SETTINGS.senderName,
        bookingCreatedReminder: {
          ...DEFAULT_NOTIFICATION_SETTINGS.bookingCreatedReminder,
          ...data.bookingCreatedReminder,
        },
        checkInReminder: {
          ...DEFAULT_NOTIFICATION_SETTINGS.checkInReminder,
          ...(hasCurrentReminderTemplates ? data.checkInReminder : {}),
        },
        checkoutAdminReminder: {
          ...DEFAULT_NOTIFICATION_SETTINGS.checkoutAdminReminder,
          ...(hasCurrentReminderTemplates ? data.checkoutAdminReminder : {}),
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

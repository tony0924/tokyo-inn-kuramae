import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';
import { app, db } from './firebase';
import type { AdminPushDevice, AdminPushDeviceDoc } from '@/types';

const DEVICES_COLLECTION = 'adminPushDevices';
const DEVICE_ID_STORAGE_KEY = 'tokyoInnAdminPushDeviceId';

export interface PushCapability {
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission | 'unsupported';
  standalone: boolean;
  requiresHomeScreen: boolean;
}

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export async function getPushCapability(): Promise<PushCapability> {
  const supported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    await isSupported().catch(() => false);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return {
    supported,
    configured: Boolean(import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim()),
    permission: supported ? Notification.permission : 'unsupported',
    standalone,
    requiresHomeScreen: supported && isAppleMobile && !standalone,
  };
}

export async function registerAdminPushDevice(uid: string): Promise<string> {
  const capability = await getPushCapability();
  if (!capability.supported) throw new Error('此裝置或瀏覽器不支援推播通知。');
  if (capability.requiresHomeScreen) throw new Error('請先將 KURACHEN 管理加入 iPhone 主畫面，再從主畫面開啟。');
  if (!capability.configured) throw new Error('Web Push 尚未設定完成，請先加入 Firebase VAPID 公鑰。');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? '通知權限已被關閉，請到 iPhone 設定中重新允許。' : '尚未允許通知權限。');
  }

  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error('無法取得這台裝置的推播識別碼，請稍後再試。');

  const documentId = getCurrentPushDeviceDocumentId(uid);
  const reference = doc(db, DEVICES_COLLECTION, documentId);
  const existing = await getDoc(reference);

  await setDoc(
    reference,
    {
      ownerUid: uid,
      token,
      label: detectDeviceLabel(),
      userAgent: navigator.userAgent.slice(0, 500),
      enabled: true,
      ...(!existing.exists() ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setAppBadge(0);
  return documentId;
}

export async function disableCurrentPushDevice(uid: string): Promise<void> {
  const supported = await isSupported().catch(() => false);
  if (supported) {
    await deleteToken(getMessaging(app)).catch(() => false);
  }
  await deleteDoc(doc(db, DEVICES_COLLECTION, getCurrentPushDeviceDocumentId(uid)));
  await clearAppBadge();
}

export function watchAdminPushDevices(
  uid: string,
  callback: (devices: AdminPushDevice[]) => void
): Unsubscribe {
  const devicesQuery = query(
    collection(db, DEVICES_COLLECTION),
    where('ownerUid', '==', uid)
  );
  return onSnapshot(devicesQuery, (snapshot) => {
    callback(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as AdminPushDeviceDoc),
      }))
    );
  });
}

export function subscribeToForegroundPush(
  callback: (payload: MessagePayload) => void
): Unsubscribe | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;
  try {
    return onMessage(getMessaging(app), (payload) => {
      void setAppBadge(1);
      callback(payload);
    });
  } catch {
    return null;
  }
}

export function getCurrentPushDeviceDocumentId(uid: string): string {
  return `${uid}_${getOrCreateDeviceId()}`;
}

export async function setAppBadge(count: number): Promise<void> {
  const badgeNavigator = navigator as BadgeNavigator;
  if (count <= 0) {
    await clearAppBadge();
    return;
  }
  await badgeNavigator.setAppBadge?.(count).catch(() => {});
}

export async function clearAppBadge(): Promise<void> {
  const badgeNavigator = navigator as BadgeNavigator;
  if (badgeNavigator.clearAppBadge) {
    await badgeNavigator.clearAppBadge().catch(() => {});
    return;
  }
  await badgeNavigator.setAppBadge?.(0).catch(() => {});
}

function getOrCreateDeviceId(): string {
  const stored = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  return id;
}

function detectDeviceLabel(): string {
  const userAgent = navigator.userAgent;
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/iPad/i.test(userAgent)) return 'iPad';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/Macintosh/i.test(userAgent)) return 'Mac';
  if (/Windows/i.test(userAgent)) return 'Windows';
  return '管理裝置';
}

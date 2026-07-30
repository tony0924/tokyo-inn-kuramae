import { useEffect } from 'react';
import { subscribeToForegroundPush } from '@/lib/pushNotifications';

export function PushForegroundBridge() {
  useEffect(() => {
    return subscribeToForegroundPush((payload) => {
      window.dispatchEvent(
        new CustomEvent('admin-push-received', {
          detail: {
            title: payload.data?.title || payload.notification?.title || 'KURACHEN 管理',
            body: payload.data?.body || payload.notification?.body || '有新的管理通知',
          },
        })
      );
    }) ?? undefined;
  }, []);

  return null;
}

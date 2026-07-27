import { useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { markAdminNotificationsRead } from '@/lib/adminNotifications';
import { clearAppBadge } from '@/lib/pushNotifications';
import type {
  AdminNotification,
  AdminNotificationStatus,
} from '@/types';
import type { AdminOutletContext } from './AdminLayout';

const STATUS_LABELS: Record<AdminNotificationStatus, string> = {
  pending: '傳送中',
  sent: '已傳送',
  partial: '部分送達',
  failed: '傳送失敗',
  no_devices: '無通知裝置',
};

export function NotificationHistoryPage() {
  const { user } = useAuth();
  const {
    notifications,
    notificationsLoading: loading,
    notificationsError: error,
  } = useOutletContext<AdminOutletContext>();

  useEffect(() => {
    if (!user || loading || error) return;
    void clearAppBadge();
    const latestCreatedAt = notifications[0]?.createdAt;
    markAdminNotificationsRead(user.uid, latestCreatedAt).catch((readError) => {
      console.warn('mark admin notifications read failed', readError);
    });
  }, [error, loading, notifications, user]);

  const groups = useMemo(() => {
    const grouped = new Map<string, AdminNotification[]>();
    for (const notification of notifications) {
      const date = notification.createdAt?.toDate?.();
      const key = date
        ? date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })
        : '時間未記錄';
      grouped.set(key, [...(grouped.get(key) ?? []), notification]);
    }
    return [...grouped.entries()];
  }, [notifications]);

  return (
    <div className="notification-history-page">
      <div className="admin-page-header notification-history-header">
        <div>
          <p className="today-eyebrow">Notification history</p>
          <h1 className="admin-page-title">通知紀錄</h1>
          <p className="admin-page-subtitle">
            顯示最近 100 則管理員推播；紀錄從此功能上線後開始累積。
          </p>
        </div>
        <div className="notification-history-count">
          <strong>{notifications.length}</strong>
          <span>則紀錄</span>
        </div>
      </div>

      {loading ? (
        <div className="admin-empty-state">載入通知紀錄中…</div>
      ) : error ? (
        <div className="admin-empty-state">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="notification-history-empty">
          <span aria-hidden="true">🔔</span>
          <h2>目前還沒有通知紀錄</h2>
          <p>下一次訪客登入、留言、預約異動或入住退房提醒發生時，就會顯示在這裡。</p>
        </div>
      ) : (
        <div className="notification-history-groups">
          {groups.map(([date, items]) => (
            <section className="notification-history-group" key={date}>
              <div className="notification-history-date">
                <span>{date}</span>
                <small>{items.length} 則</small>
              </div>
              <div className="notification-history-list">
                {items.map((notification) => (
                  <NotificationHistoryItem
                    notification={notification}
                    key={notification.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationHistoryItem({
  notification,
}: {
  notification: AdminNotification;
}) {
  const date = notification.createdAt?.toDate?.();
  const time = date?.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  }) ?? '—';
  const statusDetail = notification.status === 'no_devices'
    ? '事件已記錄，但當時沒有啟用通知的裝置'
    : notification.status === 'sent'
      ? `已送達 ${notification.successCount} 台裝置`
      : notification.status === 'partial'
        ? `送達 ${notification.successCount} 台，失敗 ${notification.failureCount} 台`
        : STATUS_LABELS[notification.status];

  return (
    <a className="notification-history-item" href={notification.url || undefined}>
      <span className={`notification-history-status ${notification.status}`} aria-hidden="true" />
      <span className="notification-history-content">
        <span className="notification-history-item-top">
          <strong>{notification.title}</strong>
          <time>{time}</time>
        </span>
        <span className="notification-history-body">{notification.body}</span>
        <span className="notification-history-meta">
          <span>{STATUS_LABELS[notification.status]}</span>
          <small>{statusDetail}</small>
        </span>
      </span>
      <span className="notification-history-arrow" aria-hidden="true">›</span>
    </a>
  );
}

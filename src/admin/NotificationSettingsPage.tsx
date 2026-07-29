import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  saveNotificationSettings,
  watchNotificationSettings,
} from '@/lib/notificationSettings';
import {
  disableCurrentPushDevice,
  getCurrentPushDeviceDocumentId,
  getPushCapability,
  registerAdminPushDevice,
  watchAdminPushDevices,
  type PushCapability,
} from '@/lib/pushNotifications';
import type { AdminPushDevice, NotificationSettings } from '@/types';

export function NotificationSettingsPage() {
  const { fbUser } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushCapability, setPushCapability] = useState<PushCapability | null>(null);
  const [pushDevices, setPushDevices] = useState<AdminPushDevice[]>([]);
  const [pushLoading, setPushLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    return watchNotificationSettings((next) => {
      setSettings(next);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    void getPushCapability().then(setPushCapability);
  }, []);

  useEffect(() => {
    if (!fbUser) {
      setPushDevices([]);
      setPushLoading(false);
      return;
    }
    return watchAdminPushDevices(fbUser.uid, (devices) => {
      setPushDevices(devices);
      setPushLoading(false);
    });
  }, [fbUser]);

  function update<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await saveNotificationSettings(settings);
      setMessage('通知設定已儲存。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  async function handlePushToggle() {
    if (!fbUser || pushBusy) return;
    setPushBusy(true);
    setPushMessage(null);
    setPushError(null);
    try {
      const currentId = getCurrentPushDeviceDocumentId(fbUser.uid);
      const currentEnabled = pushDevices.some((device) => device.id === currentId);
      if (currentEnabled) {
        await disableCurrentPushDevice(fbUser.uid);
        setPushMessage('這台裝置的推播通知已關閉。');
      } else {
        await registerAdminPushDevice(fbUser.uid);
        setPushMessage('這台裝置已開啟管理推播。');
      }
      setPushCapability(await getPushCapability());
    } catch (err) {
      setPushError(err instanceof Error ? err.message : '推播設定失敗');
    } finally {
      setPushBusy(false);
    }
  }

  if (loading) {
    return <p style={{ color: 'var(--text-mid)' }}>載入中…</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="admin-page-header">
        <h1 className="admin-page-title">通知設定</h1>
      </div>

      <PushSettingsCard
        uid={fbUser?.uid ?? null}
        capability={pushCapability}
        devices={pushDevices}
        loading={pushLoading}
        busy={pushBusy}
        message={pushMessage}
        error={pushError}
        onToggle={() => void handlePushToggle()}
      />

      <div className="admin-table" style={{ padding: 18, marginBottom: 24 }}>
        <div className="form-grid">
          <div className="form-field">
            <label>寄件名稱</label>
            <input
              value={settings.senderName}
              onChange={(e) => update('senderName', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>寄件 Email</label>
            <input
              type="email"
              value={settings.senderEmail}
              onChange={(e) => update('senderEmail', e.target.value)}
            />
          </div>
        </div>
        <p style={noticeStyle}>
          目前使用 Gmail SMTP 寄信。寄件 Email 必須是已建立 App Password 的
          Gmail 帳號；系統會用這個帳號寄送入住提醒與退房提醒。
        </p>
      </div>

      <div className="admin-table" style={{ padding: 18, marginBottom: 24 }}>
        <h2 style={sectionTitleStyle}>預約完成通知</h2>
        <p style={helperStyle}>
          建立預約後自動寄給房客，並副本寄送所有管理員。可用變數：
          <code> {'{{guestName}} {{guestEmail}} {{checkInDate}} {{checkOutDate}} {{partySize}} {{keyCode}} {{guestAccessCode}} {{websiteUrl}} {{guestCodeLoginUrl}} {{senderName}}'} </code>
        </p>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label>主旨</label>
          <input
            value={settings.bookingCreatedReminder.subject}
            onChange={(e) =>
              update('bookingCreatedReminder', {
                ...settings.bookingCreatedReminder,
                subject: e.target.value,
              })
            }
          />
        </div>
        <div className="form-field">
          <label>內文</label>
          <textarea
            value={settings.bookingCreatedReminder.body}
            onChange={(e) =>
              update('bookingCreatedReminder', {
                ...settings.bookingCreatedReminder,
                body: e.target.value,
              })
            }
            style={{ minHeight: 220 }}
          />
        </div>
      </div>

      <div className="admin-table" style={{ padding: 18, marginBottom: 24 }}>
        <h2 style={sectionTitleStyle}>入住前一天提醒</h2>
        <p style={helperStyle}>
          寄給房客，並副本寄送所有管理員。可用變數：
          <code> {'{{guestName}} {{guestEmail}} {{checkInDate}} {{checkOutDate}} {{partySize}} {{keyCode}} {{guestAccessCode}} {{websiteUrl}} {{guestCodeLoginUrl}} {{senderName}}'} </code>
        </p>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label>主旨</label>
          <input
            value={settings.checkInReminder.subject}
            onChange={(e) =>
              update('checkInReminder', {
                ...settings.checkInReminder,
                subject: e.target.value,
              })
            }
          />
        </div>
        <div className="form-field">
          <label>內文</label>
          <textarea
            value={settings.checkInReminder.body}
            onChange={(e) =>
              update('checkInReminder', {
                ...settings.checkInReminder,
                body: e.target.value,
              })
            }
            style={{ minHeight: 220 }}
          />
        </div>
      </div>

      <div className="admin-table" style={{ padding: 18, marginBottom: 24 }}>
        <h2 style={sectionTitleStyle}>退房後提醒管理員</h2>
        <p style={helperStyle}>
          寄給所有管理員。可用變數：
          <code> {'{{guestName}} {{guestEmail}} {{checkInDate}} {{checkOutDate}} {{partySize}} {{keyCode}} {{guestAccessCode}} {{websiteUrl}} {{guestCodeLoginUrl}} {{senderName}}'} </code>
        </p>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label>主旨</label>
          <input
            value={settings.checkoutAdminReminder.subject}
            onChange={(e) =>
              update('checkoutAdminReminder', {
                ...settings.checkoutAdminReminder,
                subject: e.target.value,
              })
            }
          />
        </div>
        <div className="form-field">
          <label>內文</label>
          <textarea
            value={settings.checkoutAdminReminder.body}
            onChange={(e) =>
              update('checkoutAdminReminder', {
                ...settings.checkoutAdminReminder,
                body: e.target.value,
              })
            }
            style={{ minHeight: 220 }}
          />
        </div>
      </div>

      {error && <p className="field-error">{error}</p>}
      {message && <p style={{ color: 'var(--gold-light)', marginBottom: 12 }}>{message}</p>}

      <div className="form-actions">
        <button type="submit" className="btn-gold" disabled={saving}>
          {saving ? '儲存中…' : '儲存通知設定'}
        </button>
      </div>
    </form>
  );
}

function PushSettingsCard({
  uid,
  capability,
  devices,
  loading,
  busy,
  message,
  error,
  onToggle,
}: {
  uid: string | null;
  capability: PushCapability | null;
  devices: AdminPushDevice[];
  loading: boolean;
  busy: boolean;
  message: string | null;
  error: string | null;
  onToggle: () => void;
}) {
  const currentId = uid ? getCurrentPushDeviceDocumentId(uid) : null;
  const currentEnabled = Boolean(currentId && devices.some((device) => device.id === currentId));
  const disabled =
    busy ||
    loading ||
    !uid ||
    !capability?.supported ||
    !capability.configured ||
    capability.requiresHomeScreen;

  let status = '正在檢查這台裝置…';
  if (capability && !capability.supported) status = '此裝置或瀏覽器不支援 Web Push。';
  else if (capability?.requiresHomeScreen) status = '請從 iPhone 主畫面的「藏前管理」開啟後再設定。';
  else if (capability && !capability.configured) status = 'Firebase Web Push 公鑰尚未設定。';
  else if (currentEnabled) status = '這台裝置已開啟管理推播。';
  else if (capability) status = '這台裝置尚未開啟管理推播。';

  return (
    <section className="push-settings-card">
      <div className="push-settings-heading">
        <div>
          <p className="today-eyebrow">App 通知</p>
          <h2>管理推播</h2>
          <p>{status}</p>
        </div>
        <span className={`push-status-dot${currentEnabled ? ' enabled' : ''}`} aria-hidden="true" />
      </div>

      <div className="push-settings-actions">
        <button type="button" className={currentEnabled ? 'btn-ghost' : 'btn-gold'} disabled={disabled} onClick={onToggle}>
          {busy ? '處理中…' : currentEnabled ? '關閉這台裝置通知' : '開啟這台裝置通知'}
        </button>
        <p>開啟後，訪客碼每日首次登入、推薦牆新留言、預約異動、入住與退房等事件會顯示在鎖定畫面。</p>
      </div>

      {message && <p className="push-settings-message">{message}</p>}
      {error && <p className="field-error">{error}</p>}

      {devices.length > 0 && (
        <div className="push-device-list">
          <h3>我的通知裝置</h3>
          {devices.map((device) => (
            <div className="push-device-row" key={device.id}>
              <span>
                <strong>{device.label}</strong>
                <small>{device.id === currentId ? '目前裝置' : '其他已登入裝置'}</small>
              </span>
              <span className="badge paid">已開啟</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const sectionTitleStyle = {
  fontFamily: "'Noto Serif TC', serif",
  fontSize: 18,
  color: 'var(--text)',
  marginBottom: 10,
} as const;

const helperStyle = {
  color: 'var(--text-soft)',
  fontSize: 12,
  lineHeight: 1.7,
  marginBottom: 16,
} as const;

const noticeStyle = {
  color: 'var(--text-mid)',
  fontSize: 13,
  lineHeight: 1.7,
  marginTop: 14,
  border: '1px solid rgba(212, 175, 55, 0.28)',
  borderRadius: 14,
  padding: '12px 14px',
  background: 'rgba(212, 175, 55, 0.08)',
} as const;

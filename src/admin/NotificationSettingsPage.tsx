import { useEffect, useState, type FormEvent } from 'react';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  saveNotificationSettings,
  watchNotificationSettings,
} from '@/lib/notificationSettings';
import type { NotificationSettings } from '@/types';

export function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return watchNotificationSettings((next) => {
      setSettings(next);
      setLoading(false);
    });
  }, []);

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

  if (loading) {
    return <p style={{ color: 'var(--text-mid)' }}>載入中…</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="admin-page-header">
        <h1 className="admin-page-title">通知設定</h1>
      </div>

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
          建立預約後自動寄給房客，並 CC 所有 admin。可用變數：
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
          寄給房客，並 CC 所有 admin。可用變數：
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
        <h2 style={sectionTitleStyle}>退房後提醒 admin</h2>
        <p style={helperStyle}>
          寄給所有 admin。可用變數：
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

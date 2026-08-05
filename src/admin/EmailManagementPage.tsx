import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import {
  sendGuestBookingEmail,
  watchEmailDeliveries,
} from '@/lib/emailDeliveries';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  watchNotificationSettings,
} from '@/lib/notificationSettings';
import { formatGuestCode } from '@/lib/guestAccessCodes';
import type {
  Booking,
  EmailDelivery,
  GuestEmailType,
  NotificationSettings,
  NotificationTemplate,
} from '@/types';
import { useBookings } from './useBookings';
import { Modal } from './Modal';

const EMAIL_TYPES: GuestEmailType[] = [
  'booking_created',
  'check_in_reminder',
  'checkout_reminder',
];

const EMAIL_COPY: Record<GuestEmailType, {
  title: string;
  timing: string;
  templateKey: 'bookingCreatedReminder' | 'checkInReminder' | 'checkoutAdminReminder';
}> = {
  booking_created: {
    title: '預約完成通知',
    timing: '建立預約後立即寄送',
    templateKey: 'bookingCreatedReminder',
  },
  check_in_reminder: {
    title: '入住前一天提醒',
    timing: '入住前一天 09:00 寄送',
    templateKey: 'checkInReminder',
  },
  checkout_reminder: {
    title: '退房當天提醒',
    timing: '退房當天 12:00 寄送',
    templateKey: 'checkoutAdminReminder',
  },
};

type PreviewState = { booking: Booking; type: GuestEmailType } | null;

export function EmailManagementPage() {
  const { fbUser } = useAuth();
  const { bookings, loading: bookingsLoading } = useBookings();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [deliveries, setDeliveries] = useState<EmailDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);

  useEffect(() => watchNotificationSettings(setSettings), []);
  useEffect(
    () => watchEmailDeliveries(
      (items) => {
        setDeliveries(items);
        setDeliveriesLoading(false);
      },
      () => {
        setError('無法載入 Email 寄送紀錄，請重新整理後再試。');
        setDeliveriesLoading(false);
      }
    ),
    []
  );

  const relevantBookings = useMemo(() => {
    const cutoff = subDays(new Date(), 2).getTime();
    return bookings
      .filter((booking) => booking.checkOut.toMillis() >= cutoff)
      .sort((first, second) => first.checkIn.toMillis() - second.checkIn.toMillis());
  }, [bookings]);

  const sentCount = deliveries.filter((delivery) => delivery.status === 'sent').length;
  const failedCount = deliveries.filter((delivery) => delivery.status === 'failed').length;
  const missingEmailCount = relevantBookings.filter((booking) => !booking.guestEmail.trim()).length;

  async function send(booking: Booking, type: GuestEmailType, testOnly: boolean) {
    const key = `${booking.id}:${type}:${testOnly ? 'test' : 'guest'}`;
    if (!testOnly && !confirm(`確定要將「${EMAIL_COPY[type].title}」寄給 ${booking.guestName} 嗎？`)) return;
    setBusyKey(key);
    setError(null);
    setMessage(null);
    try {
      await sendGuestBookingEmail({ bookingId: booking.id, type, testOnly });
      setMessage(
        testOnly
          ? `測試信已寄到 ${fbUser?.email || '你的管理員信箱'}。`
          : `${EMAIL_COPY[type].title}已寄給 ${booking.guestName}。`
      );
    } catch (err) {
      setError(readCallableError(err));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="email-management">
      <header className="admin-page-header email-management-header">
        <div>
          <p className="today-eyebrow">GUEST EMAIL</p>
          <h1 className="admin-page-title">Email 管理中心</h1>
          <p className="admin-page-subtitle">確認寄送時間、預覽內容、查看結果，必要時可手動重寄。</p>
        </div>
        <Link className="btn-ghost" to="/admin/notifications">編輯 Email 範本</Link>
      </header>

      <section className="email-summary-grid" aria-label="Email 寄送摘要">
        <Summary label="近期紀錄" value={deliveries.length} detail="最近 200 筆寄送" tone="neutral" />
        <Summary label="寄送成功" value={sentCount} detail="已由 Gmail SMTP 接受" tone="success" />
        <Summary label="寄送失敗" value={failedCount} detail={failedCount ? '請查看下方紀錄' : '目前沒有'} tone="danger" />
        <Summary label="缺少 Email" value={missingEmailCount} detail={missingEmailCount ? '請補齊預約資料' : '近期預約皆完整'} tone="warning" />
      </section>

      {message && <p className="email-feedback success">{message}</p>}
      {error && <p className="email-feedback error">{error}</p>}

      <section className="email-schedule-section">
        <div className="today-section-heading">
          <div>
            <p className="today-eyebrow">寄送排程</p>
            <h2>目前與接下來的住客</h2>
          </div>
          <span>排程使用台北時間</span>
        </div>

        {bookingsLoading || deliveriesLoading ? (
          <div className="email-empty">正在整理 Email 排程…</div>
        ) : relevantBookings.length === 0 ? (
          <div className="email-empty">目前沒有需要顯示的住宿 Email。</div>
        ) : (
          <div className="email-booking-list">
            {relevantBookings.map((booking) => (
              <article className="email-booking-card" key={booking.id}>
                <header>
                  <div>
                    <h3>{booking.guestName || '未填寫住客姓名'}</h3>
                    <span>
                      {format(booking.checkIn.toDate(), 'M月d日 EEE', { locale: zhTW })}
                      {' → '}
                      {format(booking.checkOut.toDate(), 'M月d日 EEE', { locale: zhTW })}
                    </span>
                  </div>
                  <span className={booking.guestEmail ? 'email-recipient' : 'email-recipient missing'}>
                    {booking.guestEmail || '尚未填寫 Email'}
                  </span>
                </header>
                <div className="email-plan-list">
                  {EMAIL_TYPES.map((type) => {
                    const latest = deliveries.find(
                      (delivery) => delivery.bookingId === booking.id && delivery.type === type
                        && delivery.trigger !== 'test'
                    );
                    const plannedFor = getPlannedDate(booking, type);
                    const status = deliveryStatus(latest, plannedFor);
                    return (
                      <div className="email-plan-row" key={type}>
                        <div className="email-plan-copy">
                          <span className={`email-status ${status.tone}`}>{status.label}</span>
                          <span>
                            <strong>{EMAIL_COPY[type].title}</strong>
                            <small>
                              {EMAIL_COPY[type].timing}・預計 {format(plannedFor, 'yyyy/MM/dd HH:mm')}
                            </small>
                            {latest?.errorMessage && <em>{latest.errorMessage}</em>}
                          </span>
                        </div>
                        <div className="email-plan-actions">
                          <button type="button" className="btn-ghost" onClick={() => setPreview({ booking, type })}>
                            預覽
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={busyKey !== null}
                            onClick={() => void send(booking, type, true)}
                          >
                            {busyKey === `${booking.id}:${type}:test` ? '寄送中…' : '測試寄給我'}
                          </button>
                          <button
                            type="button"
                            className="btn-gold"
                            disabled={!booking.guestEmail || busyKey !== null}
                            onClick={() => void send(booking, type, false)}
                          >
                            {busyKey === `${booking.id}:${type}:guest` ? '寄送中…' : latest?.status === 'sent' ? '再次寄送' : '立即寄送'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="email-history-section">
        <div className="today-section-heading">
          <div>
            <p className="today-eyebrow">寄送紀錄</p>
            <h2>最近的 Email</h2>
          </div>
        </div>
        {deliveries.length === 0 ? (
          <div className="email-empty">正式寄送或測試後，這裡會留下結果。</div>
        ) : (
          <div className="email-history-list">
            {deliveries.slice(0, 30).map((delivery) => (
              <div className="email-history-row" key={delivery.id}>
                <span className={`email-status ${delivery.status}`}>{statusLabel(delivery.status)}</span>
                <span>
                  <strong>{delivery.typeLabel}・{delivery.guestName}</strong>
                  <small>{delivery.recipient}・{triggerLabel(delivery.trigger)}</small>
                </span>
                <time>{formatDeliveryTime(delivery)}</time>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        {preview && (
          <EmailPreview
            booking={preview.booking}
            type={preview.type}
            settings={settings}
            onClose={() => setPreview(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function EmailPreview({
  booking,
  type,
  settings,
  onClose,
}: {
  booking: Booking;
  type: GuestEmailType;
  settings: NotificationSettings;
  onClose: () => void;
}) {
  const template = settings[EMAIL_COPY[type].templateKey] as NotificationTemplate;
  const variables = bookingVariables(booking, settings.senderName);
  variables.guestCodeLoginUrl =
    `https://tokyo-inn-kuramae.web.app/code-login?source=email&type=${encodeURIComponent(type)}`;
  return (
    <section className="email-preview-modal">
      <header>
        <div>
          <p>EMAIL PREVIEW</p>
          <h2>{EMAIL_COPY[type].title}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="關閉 Email 預覽">×</button>
      </header>
      <dl>
        <div><dt>收件人</dt><dd>{booking.guestEmail || '尚未填寫 Email'}</dd></div>
        <div><dt>主旨</dt><dd>{renderTemplate(template.subject, variables)}</dd></div>
      </dl>
      <pre>{renderTemplate(template.body, variables)}</pre>
    </section>
  );
}

function Summary({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: 'neutral' | 'success' | 'danger' | 'warning';
}) {
  return (
    <div className={`email-summary-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function getPlannedDate(booking: Booking, type: GuestEmailType): Date {
  if (type === 'booking_created') return booking.createdAt?.toDate?.() ?? booking.checkIn.toDate();
  const source = type === 'check_in_reminder'
    ? subDays(booking.checkIn.toDate(), 1)
    : booking.checkOut.toDate();
  const result = new Date(source);
  result.setHours(type === 'check_in_reminder' ? 9 : 12, 0, 0, 0);
  return result;
}

function deliveryStatus(delivery: EmailDelivery | undefined, plannedFor: Date) {
  if (delivery?.status === 'sent') return { label: '已寄出', tone: 'sent' };
  if (delivery?.status === 'failed') return { label: '寄送失敗', tone: 'failed' };
  if (delivery?.status === 'pending') return { label: '寄送中', tone: 'pending' };
  if (plannedFor.getTime() < Date.now()) return { label: '尚無紀錄', tone: 'overdue' };
  return { label: '預計寄送', tone: 'scheduled' };
}

function bookingVariables(booking: Booking, senderName: string): Record<string, string> {
  return {
    guestName: booking.guestName || '',
    guestEmail: booking.guestEmail || '',
    checkInDate: format(booking.checkIn.toDate(), 'yyyy-MM-dd'),
    checkOutDate: format(booking.checkOut.toDate(), 'yyyy-MM-dd'),
    partySize: String(booking.partySize || ''),
    keyCode: booking.keyCode || '未設定',
    guestAccessCode: booking.guestAccessCode ? formatGuestCode(booking.guestAccessCode) : '未設定',
    websiteUrl: 'https://tokyo-inn-kuramae.web.app',
    guestCodeLoginUrl: 'https://tokyo-inn-kuramae.web.app/code-login',
    senderName,
  };
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template
  );
}

function statusLabel(status: EmailDelivery['status']): string {
  if (status === 'sent') return '已寄出';
  if (status === 'failed') return '失敗';
  return '寄送中';
}

function triggerLabel(trigger: EmailDelivery['trigger']): string {
  if (trigger === 'scheduled') return '系統排程';
  if (trigger === 'automatic') return '自動寄送';
  if (trigger === 'test') return '測試信';
  return '管理員手動寄送';
}

function formatDeliveryTime(delivery: EmailDelivery): string {
  const date = delivery.sentAt?.toDate?.() || delivery.createdAt?.toDate?.();
  return date ? format(date, 'M/d HH:mm') : '處理中';
}

function readCallableError(error: unknown): string {
  if (!(error instanceof Error)) return 'Email 寄送失敗，請稍後再試。';
  const message = error.message.replace(/^FirebaseError:\s*/i, '');
  const separator = message.lastIndexOf(': ');
  return separator >= 0 ? message.slice(separator + 2) : message;
}

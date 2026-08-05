import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  DEFAULT_PAYMENT_INFORMATION,
  renderPaymentMessage,
  savePaymentInformation,
  watchPaymentInformation,
} from '@/lib/paymentInformation';
import { getExpectedRevenue } from '@/lib/bookingFinance';
import type { PaymentInformation } from '@/types';
import { useBookings } from './useBookings';

const TEMPLATE_VARIABLES =
  '{{guestName}} {{bankName}} {{branchName}} {{accountName}} {{accountNumber}} {{currency}} {{amount}} {{checkInDate}} {{checkOutDate}}';

export function PaymentInformationPage() {
  const { bookings, loading: bookingsLoading } = useBookings();
  const [information, setInformation] = useState<PaymentInformation>(
    DEFAULT_PAYMENT_INFORMATION
  );
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => watchPaymentInformation(
      (next) => {
        setInformation(next);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError('無法載入付款資訊，請重新整理後再試。');
      }
    ),
    []
  );

  const unpaidBookings = useMemo(
    () => bookings
      .filter(
        (booking) =>
          booking.paymentStatus === 'unpaid' && getExpectedRevenue(booking) > 0
      )
      .sort((a, b) => b.checkIn.toMillis() - a.checkIn.toMillis()),
    [bookings]
  );
  const selectedBooking = unpaidBookings.find((booking) => booking.id === selectedBookingId);

  useEffect(() => {
    if (selectedBookingId && !selectedBooking) setSelectedBookingId('');
  }, [selectedBooking, selectedBookingId]);
  const preview = renderPaymentMessage(information, selectedBooking);
  const missingAccountInformation =
    !information.bankName || !information.accountName || !information.accountNumber;

  function update<K extends keyof PaymentInformation>(
    key: K,
    value: PaymentInformation[K]
  ) {
    setInformation((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await savePaymentInformation(information);
      setMessage('付款資訊已儲存。');
    } catch {
      setError('付款資訊儲存失敗，請稍後再試。');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (missingAccountInformation || copying) return;
    setCopying(true);
    setMessage(null);
    setError(null);
    try {
      await copyText(preview);
      setMessage('付款訊息已複製，可以直接貼給房客。');
    } catch {
      setError('無法自動複製，請長按下方預覽文字手動複製。');
    } finally {
      setCopying(false);
    }
  }

  if (loading) {
    return <p className="admin-loading-state">付款資訊載入中…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="payment-information-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">付款資訊</h1>
          <p className="admin-page-description">
            集中管理收款帳戶，選擇預約後即可複製要傳給房客的付款訊息。
          </p>
        </div>
      </div>

      <div className="payment-information-layout">
        <section className="admin-table payment-information-card" aria-labelledby="payment-message-title">
          <div className="payment-information-section-heading">
            <span>01</span>
            <div>
              <h2 id="payment-message-title">房客訊息</h2>
              <p>只列出未付款房客，選擇後會自動帶入姓名、金額與住宿日期。</p>
            </div>
          </div>

          <div className="form-field payment-booking-picker">
            <label htmlFor="payment-booking">套用預約</label>
            <select
              id="payment-booking"
              value={selectedBookingId}
              onChange={(event) => setSelectedBookingId(event.target.value)}
              disabled={bookingsLoading}
            >
              <option value="">不指定預約（通用訊息）</option>
              {!bookingsLoading && unpaidBookings.length === 0 && (
                <option value="" disabled>目前沒有未付款房客</option>
              )}
              {unpaidBookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.guestName}・{formatBookingDate(booking.checkIn.toDate())}・
                  {information.currency} {booking.amount.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="payment-message-template">訊息範本</label>
            <textarea
              id="payment-message-template"
              value={information.messageTemplate}
              onChange={(event) => update('messageTemplate', event.target.value)}
              className="payment-template-input"
              required
            />
            <small className="payment-template-helper">
              可用變數：<code>{TEMPLATE_VARIABLES}</code>
            </small>
          </div>

          <div className="payment-message-preview" aria-live="polite">
            <div>
              <span>訊息預覽</span>
              <small>{selectedBooking ? `已套用 ${selectedBooking.guestName} 的預約` : '通用訊息'}</small>
            </div>
            <pre>{preview}</pre>
          </div>

          {missingAccountInformation && (
            <p className="payment-information-warning">
              請先填寫銀行名稱、戶名與帳號，才能複製訊息。
            </p>
          )}
          {error && <p className="field-error" role="alert">{error}</p>}
          {message && <p className="payment-information-success" role="status">{message}</p>}

          <div className="payment-information-actions">
            <button type="submit" className="btn-ghost" disabled={saving}>
              {saving ? '儲存中…' : '儲存付款資訊'}
            </button>
            <button
              type="button"
              className="btn-gold payment-copy-button"
              onClick={() => void handleCopy()}
              disabled={missingAccountInformation || copying}
            >
              {copying ? '複製中…' : '一鍵複製給房客'}
            </button>
          </div>
        </section>

        <section className="admin-table payment-information-card" aria-labelledby="payment-account-title">
          <div className="payment-information-section-heading">
            <span>02</span>
            <div>
              <h2 id="payment-account-title">收款帳戶</h2>
              <p>資料只會顯示在管理後台與複製的訊息中。</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="payment-bank-name">銀行名稱</label>
              <input
                id="payment-bank-name"
                value={information.bankName}
                onChange={(event) => update('bankName', event.target.value)}
                placeholder="例如：○○銀行"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="payment-branch-name">分行名稱</label>
              <input
                id="payment-branch-name"
                value={information.branchName}
                onChange={(event) => update('branchName', event.target.value)}
                placeholder="例如：藏前分行（可留白）"
              />
            </div>
            <div className="form-field">
              <label htmlFor="payment-account-name">戶名</label>
              <input
                id="payment-account-name"
                value={information.accountName}
                onChange={(event) => update('accountName', event.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="payment-account-number">帳號</label>
              <input
                id="payment-account-number"
                value={information.accountNumber}
                onChange={(event) => update('accountNumber', event.target.value)}
                inputMode="numeric"
                autoComplete="off"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="payment-currency">幣別</label>
              <input
                id="payment-currency"
                value={information.currency}
                onChange={(event) => update('currency', event.target.value.toUpperCase())}
                maxLength={8}
                required
              />
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('copy failed');
}

function formatBookingDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei',
  }).format(date);
}

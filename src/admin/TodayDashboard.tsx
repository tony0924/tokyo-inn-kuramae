import { useEffect, useMemo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useBookings } from './useBookings';
import { BookingForm } from './BookingForm';
import { Modal } from './Modal';
import { watchAllGuestMessages } from '@/lib/guestMessages';
import type { Booking, GuestMessage } from '@/types';

const PAYMENT_LABEL = {
  unpaid: '未付款',
  partial: '部分付款',
  paid: '已付款',
} as const;

export function TodayDashboard() {
  const { bookings, loading } = useBookings();
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [creating, setCreating] = useState(false);
  const now = new Date();

  useEffect(() => watchAllGuestMessages(setMessages), []);

  const summary = useMemo(() => {
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(startToday);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const arrivals = bookings
      .filter((booking) => isSameDay(booking.checkIn.toDate(), now))
      .sort((a, b) => a.checkIn.toMillis() - b.checkIn.toMillis());
    const departures = bookings
      .filter((booking) => isSameDay(booking.checkOut.toDate(), now))
      .sort((a, b) => a.checkOut.toMillis() - b.checkOut.toMillis());
    const staying = bookings.filter(
      (booking) =>
        booking.checkIn.toDate() <= now &&
        booking.checkOut.toDate() > now
    );
    const upcoming = bookings
      .filter((booking) => {
        const checkIn = booking.checkIn.toDate();
        return checkIn > now && checkIn < sevenDaysLater;
      })
      .sort((a, b) => a.checkIn.toMillis() - b.checkIn.toMillis())
      .slice(0, 5);
    const paymentAttention = bookings.filter(
      (booking) =>
        booking.paymentStatus !== 'paid' &&
        booking.checkOut.toDate() >= startToday
    );
    const keysOut = bookings.filter(
      (booking) => booking.keyLentAt && !booking.keyReturnedAt
    );

    return { arrivals, departures, staying, upcoming, paymentAttention, keysOut };
  }, [bookings]);

  const recentGuestMessages = useMemo(
    () => messages.filter((message) => message.authorType === 'guest').slice(0, 3),
    [messages]
  );

  return (
    <div className="today-dashboard">
      <header className="today-header">
        <div>
          <p className="today-eyebrow">今日營運</p>
          <h1 className="admin-page-title">
            {format(now, 'M月d日 EEEE', { locale: zhTW })}
          </h1>
          <p className="admin-page-subtitle">快速掌握今天與接下來七天的住宿狀況。</p>
        </div>
        <button type="button" className="btn-gold today-add-button" onClick={() => setCreating(true)}>
          ＋ 新增預約
        </button>
      </header>

      {loading ? (
        <div className="today-loading">載入今日營運資料…</div>
      ) : (
        <>
          <section className="today-summary-grid" aria-label="今日摘要">
            <SummaryCard label="今日入住" value={summary.arrivals.length} detail={guestNames(summary.arrivals)} tone="gold" to="/admin/bookings" />
            <SummaryCard label="今日退房" value={summary.departures.length} detail={guestNames(summary.departures)} tone="blue" to="/admin/bookings" />
            <SummaryCard label="住宿中" value={summary.staying.length} detail={guestNames(summary.staying)} tone="green" to="/admin/bookings" />
            <SummaryCard label="付款待處理" value={summary.paymentAttention.length} detail={paymentDetail(summary.paymentAttention)} tone="red" to="/admin/revenue" />
          </section>

          {(summary.paymentAttention.length > 0 || summary.keysOut.length > 0) && (
            <section className="today-attention" aria-labelledby="attention-heading">
              <div className="today-section-heading">
                <div>
                  <p className="today-eyebrow">需要注意</p>
                  <h2 id="attention-heading">待處理事項</h2>
                </div>
              </div>
              <div className="attention-grid">
                {summary.paymentAttention.length > 0 && (
                  <Link to="/admin/bookings" className="attention-card">
                    <span className="attention-icon" aria-hidden="true">＄</span>
                    <span>
                      <strong>{summary.paymentAttention.length} 筆款項尚未完成</strong>
                      <small>{summary.paymentAttention.slice(0, 3).map((booking) => `${booking.guestName}・${PAYMENT_LABEL[booking.paymentStatus]}`).join('、')}</small>
                    </span>
                    <span aria-hidden="true">›</span>
                  </Link>
                )}
                {summary.keysOut.length > 0 && (
                  <Link to="/admin/bookings" className="attention-card">
                    <span className="attention-icon" aria-hidden="true">鑰</span>
                    <span>
                      <strong>{summary.keysOut.length} 把鑰匙尚未歸還</strong>
                      <small>{summary.keysOut.slice(0, 3).map((booking) => booking.guestName).join('、')}</small>
                    </span>
                    <span aria-hidden="true">›</span>
                  </Link>
                )}
              </div>
            </section>
          )}

          <div className="today-content-grid">
            <section className="today-panel">
              <div className="today-section-heading">
                <div>
                  <p className="today-eyebrow">未來七天</p>
                  <h2>即將入住</h2>
                </div>
                <Link to="/admin/calendar">看行事曆</Link>
              </div>
              {summary.upcoming.length === 0 ? (
                <EmptyTodayState>未來七天沒有新的入住。</EmptyTodayState>
              ) : (
                <div className="today-booking-list">
                  {summary.upcoming.map((booking) => (
                    <Link to="/admin/bookings" className="today-booking-row" key={booking.id}>
                      <time dateTime={format(booking.checkIn.toDate(), 'yyyy-MM-dd')}>
                        <strong>{format(booking.checkIn.toDate(), 'd')}</strong>
                        <span>{format(booking.checkIn.toDate(), 'M月')}</span>
                      </time>
                      <span className="today-booking-person">
                        <strong>{booking.guestName}</strong>
                        <small>{booking.partySize} 人・{PAYMENT_LABEL[booking.paymentStatus]}</small>
                      </span>
                      <span className={`badge ${booking.paymentStatus}`}>{PAYMENT_LABEL[booking.paymentStatus]}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="today-panel">
              <div className="today-section-heading">
                <div>
                  <p className="today-eyebrow">最新動態</p>
                  <h2>房客留言</h2>
                </div>
                <Link to="/admin/messages">全部留言</Link>
              </div>
              {recentGuestMessages.length === 0 ? (
                <EmptyTodayState>目前沒有房客留言。</EmptyTodayState>
              ) : (
                <div className="today-message-list">
                  {recentGuestMessages.map((message) => (
                    <Link to="/admin/messages" className="today-message-row" key={message.id}>
                      <span className="today-message-avatar" aria-hidden="true">
                        {(message.guestName || '訪').slice(0, 1)}
                      </span>
                      <span>
                        <strong>{message.guestName || '訪客'}</strong>
                        <small>{message.body}</small>
                      </span>
                      <time>{formatMessageTime(message)}</time>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      <Modal open={creating} onClose={() => setCreating(false)}>
        <BookingForm booking={null} onClose={() => setCreating(false)} />
      </Modal>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
  to,
}: {
  label: string;
  value: number;
  detail: string;
  tone: 'gold' | 'blue' | 'green' | 'red';
  to: string;
}) {
  return (
    <Link to={to} className={`today-summary-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </Link>
  );
}

function EmptyTodayState({ children }: { children: string }) {
  return <div className="today-empty">{children}</div>;
}

function guestNames(bookings: Booking[]): string {
  if (bookings.length === 0) return '目前沒有';
  return bookings.slice(0, 2).map((booking) => booking.guestName).join('、');
}

function paymentDetail(bookings: Booking[]): string {
  if (bookings.length === 0) return '目前沒有';
  const unpaid = bookings.filter((booking) => booking.paymentStatus === 'unpaid').length;
  const partial = bookings.filter((booking) => booking.paymentStatus === 'partial').length;
  return [
    unpaid > 0 ? `${unpaid} 筆未付` : '',
    partial > 0 ? `${partial} 筆部分付` : '',
  ].filter(Boolean).join('・');
}

function formatMessageTime(message: GuestMessage): string {
  const date = message.createdAt?.toDate?.();
  if (!date) return '剛剛';
  if (isSameDay(date, new Date())) return format(date, 'HH:mm');
  return format(date, 'M/d');
}

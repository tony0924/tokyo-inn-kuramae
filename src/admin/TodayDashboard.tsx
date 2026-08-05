import { useEffect, useMemo, useState } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { useBookings } from './useBookings';
import { BookingForm } from './BookingForm';
import { AdminWeatherCard } from './AdminWeatherCard';
import { Modal } from './Modal';
import { watchGuestCommunityMessages } from '@/lib/guestMessages';
import { watchEmailDeliveries } from '@/lib/emailDeliveries';
import { markKeyLent, markKeyReturned, updateBooking } from '@/lib/bookings';
import { setAdminGuestPreviewBookingId } from '@/lib/bookingPreview';
import { getStayStatus, selectOperationalBooking, type StayStage } from '@/lib/stayStatus';
import type { Booking, EmailDelivery, GuestCommunityMessage } from '@/types';

type TodayTask = {
  id: string;
  icon: string;
  title: string;
  detail: string;
  to?: string;
  action?: 'paid' | 'lend' | 'return';
  booking?: Booking;
  actionLabel?: string;
  urgent?: boolean;
};

const PAYMENT_LABEL = {
  unpaid: '未付款',
  partial: '部分付款',
  paid: '已付款',
} as const;

export function TodayDashboard() {
  const { bookings, loading } = useBookings();
  const [messages, setMessages] = useState<GuestCommunityMessage[]>([]);
  const [emailDeliveries, setEmailDeliveries] = useState<EmailDelivery[]>([]);
  const [creating, setCreating] = useState(false);
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const now = new Date();

  useEffect(() => watchGuestCommunityMessages(setMessages, undefined, 100), []);
  useEffect(() => watchEmailDeliveries(setEmailDeliveries, () => {}), []);

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
  const operationalBooking = useMemo(
    () => selectOperationalBooking(bookings, now),
    [bookings]
  );
  const guestRecommendationCount = useMemo(
    () => messages.filter((message) => message.authorType === 'guest').length,
    [messages]
  );
  const todayTasks = useMemo(
    () => buildTodayTasks(summary, emailDeliveries, now),
    [emailDeliveries, summary]
  );

  async function completeTask(task: TodayTask) {
    if (!task.action || !task.booking) return;
    setTaskBusyId(task.id);
    setTaskError(null);
    try {
      if (task.action === 'paid') {
        await updateBooking(task.booking.id, { paymentStatus: 'paid' });
      } else if (task.action === 'lend') {
        await markKeyLent(task.booking);
      } else {
        await markKeyReturned(task.booking);
      }
    } catch {
      setTaskError('待辦更新失敗，請重新整理後再試。');
    } finally {
      setTaskBusyId(null);
    }
  }

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

      <AdminWeatherCard />

      {loading ? (
        <div className="today-loading">載入今日營運資料…</div>
      ) : (
        <>
          {operationalBooking ? (
            <OperationsCard
              booking={operationalBooking}
              guestRecommendationCount={guestRecommendationCount}
            />
          ) : (
            <section className="operations-card empty">
              <div>
                <p className="today-eyebrow">住宿狀態</p>
                <h2>目前沒有進行中或即將入住的預約</h2>
                <span>新增預約後，這裡會集中顯示房客、款項、鑰匙與訪客碼狀態。</span>
              </div>
            </section>
          )}

          <section className="today-summary-grid" aria-label="今日摘要">
            <SummaryCard label="今日入住" value={summary.arrivals.length} detail={guestNames(summary.arrivals)} tone="gold" to="/admin/bookings" />
            <SummaryCard label="今日退房" value={summary.departures.length} detail={guestNames(summary.departures)} tone="blue" to="/admin/bookings" />
            <SummaryCard label="住宿中" value={summary.staying.length} detail={guestNames(summary.staying)} tone="green" to="/admin/bookings" />
            <SummaryCard label="付款待處理" value={summary.paymentAttention.length} detail={paymentDetail(summary.paymentAttention)} tone="red" to="/admin/revenue" />
          </section>

          <section className="today-attention today-task-section" aria-labelledby="attention-heading">
            <div className="today-section-heading">
              <div>
                <p className="today-eyebrow">TODAY&apos;S CHECKLIST</p>
                <h2 id="attention-heading">今日待辦</h2>
              </div>
              <span>{todayTasks.length > 0 ? `${todayTasks.length} 項待處理` : '今天都處理完成了'}</span>
            </div>
            {taskError && <p className="field-error">{taskError}</p>}
            {todayTasks.length === 0 ? (
              <div className="today-tasks-complete">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>目前沒有待處理事項</strong>
                  <small>款項、鑰匙、訪客碼、房客資料與 Email 皆無異常。</small>
                </div>
              </div>
            ) : (
              <div className="today-task-list">
                {todayTasks.map((task) => (
                  <div className={`today-task-row${task.urgent ? ' urgent' : ''}`} key={task.id}>
                    <span className="attention-icon" aria-hidden="true">{task.icon}</span>
                    <span className="today-task-copy">
                      <strong>{task.title}</strong>
                      <small>{task.detail}</small>
                    </span>
                    {task.action && task.booking ? (
                      <button
                        type="button"
                        className="today-task-action"
                        disabled={taskBusyId !== null}
                        onClick={() => void completeTask(task)}
                      >
                        {taskBusyId === task.id ? '處理中…' : task.actionLabel}
                      </button>
                    ) : (
                      <Link className="today-task-action" to={task.to || '/admin/bookings'}>
                        前往處理
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

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
                  <h2>推薦牆留言</h2>
                </div>
                <Link to="/admin/messages">管理推薦牆</Link>
              </div>
              {recentGuestMessages.length === 0 ? (
                <EmptyTodayState>目前沒有新的訪客推薦。</EmptyTodayState>
              ) : (
                <div className="today-message-list">
                  {recentGuestMessages.map((message) => (
                    <Link to="/admin/messages" className="today-message-row" key={message.id}>
                      <span className="today-message-avatar" aria-hidden="true">
                        {(message.authorName || '訪').slice(0, 1)}
                      </span>
                      <span>
                        <strong>{message.authorName || '訪客'}</strong>
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

function OperationsCard({
  booking,
  guestRecommendationCount,
}: {
  booking: Booking;
  guestRecommendationCount: number;
}) {
  const navigate = useNavigate();
  const status = getStayStatus(booking);
  const stage = OPERATIONS_STAGE_COPY[status.stage];
  const checkIn = booking.checkIn.toDate();
  const checkOut = booking.checkOut.toDate();

  return (
    <section className={`operations-card stage-${status.stage}`} aria-labelledby="operations-card-title">
      <div className="operations-card-main">
        <div className="operations-card-title-row">
          <span className="operations-card-icon" aria-hidden="true">{stage.icon}</span>
          <div>
            <p className="today-eyebrow">{stage.label}</p>
            <h2 id="operations-card-title">{booking.guestName}</h2>
            <span>
              {format(checkIn, 'M/d HH:mm')} → {format(checkOut, 'M/d HH:mm')}・{booking.partySize} 人
            </span>
          </div>
        </div>
        <strong className="operations-countdown">{operationsCountdown(status)}</strong>
      </div>

      <div className="operations-signal-grid">
        <OperationSignal
          label="款項"
          value={PAYMENT_LABEL[booking.paymentStatus]}
          attention={booking.paymentStatus !== 'paid'}
        />
        <OperationSignal
          label="鑰匙"
          value={keyStatus(booking)}
          attention={Boolean(booking.keyLentAt && !booking.keyReturnedAt && status.stage === 'checkout_today')}
        />
        <OperationSignal
          label="訪客碼"
          value={booking.guestAccessCode ? '已建立' : '尚未建立'}
          attention={!booking.guestAccessCode}
        />
        <OperationSignal
          label="推薦牆"
          value={guestRecommendationCount > 0 ? `${guestRecommendationCount} 則` : '目前沒有'}
          attention={false}
        />
      </div>

      <div className="operations-actions">
        <Link to={`/admin/bookings?booking=${booking.id}`} className="btn-gold">開啟這筆預約</Link>
        <Link to="/admin/messages" className="operations-secondary-action">管理推薦牆</Link>
        <button
          type="button"
          className="operations-secondary-action"
          onClick={() => {
            setAdminGuestPreviewBookingId(booking.id);
            navigate('/guest/home');
          }}
        >
          預覽房客首頁
        </button>
      </div>
    </section>
  );
}

function OperationSignal({
  label,
  value,
  attention,
}: {
  label: string;
  value: string;
  attention: boolean;
}) {
  return (
    <div className={attention ? 'operation-signal attention' : 'operation-signal'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const OPERATIONS_STAGE_COPY: Record<StayStage, { label: string; icon: string }> = {
  before_checkin: { label: '下一筆預約', icon: '🗓️' },
  checkin_today: { label: '今日入住', icon: '🔑' },
  staying: { label: '住宿中', icon: '🏠' },
  checkout_today: { label: '今日退房', icon: '🏁' },
  completed: { label: '已完成', icon: '✓' },
};

function operationsCountdown(status: ReturnType<typeof getStayStatus>): string {
  switch (status.stage) {
    case 'before_checkin':
      return status.daysUntilCheckIn === 1 ? '明天入住' : `${status.daysUntilCheckIn} 天後入住`;
    case 'checkin_today':
      return '今天入住';
    case 'staying':
      return status.daysUntilCheckOut === 1 ? '明天退房' : `${status.daysUntilCheckOut} 天後退房`;
    case 'checkout_today':
      return '今天退房';
    case 'completed':
      return '已完成';
  }
}

function keyStatus(booking: Booking): string {
  if (!booking.keyCode) return '未指定';
  if (booking.keyReturnedAt) return '已歸還';
  if (booking.keyLentAt) return '借出中';
  return '尚未借出';
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

function formatMessageTime(message: GuestCommunityMessage): string {
  const date = message.createdAt?.toDate?.();
  if (!date) return '剛剛';
  if (isSameDay(date, new Date())) return format(date, 'HH:mm');
  return format(date, 'M/d');
}

function buildTodayTasks(
  summary: {
    arrivals: Booking[];
    departures: Booking[];
    staying: Booking[];
    upcoming: Booking[];
    paymentAttention: Booking[];
    keysOut: Booking[];
  },
  deliveries: EmailDelivery[],
  now: Date
): TodayTask[] {
  const tasks: TodayTask[] = [];
  const tomorrow = addDays(now, 1);

  summary.arrivals.forEach((booking) => {
    if (!booking.guestEmail.trim()) {
      tasks.push({
        id: `missing-email:${booking.id}`,
        icon: '✉',
        title: `${booking.guestName} 尚未填寫 Email`,
        detail: '今天入住，請補上聯絡信箱。',
        to: `/admin/bookings?booking=${booking.id}`,
        urgent: true,
      });
    }
    if (!booking.guestAccessCode) {
      tasks.push({
        id: `missing-code:${booking.id}`,
        icon: '碼',
        title: `${booking.guestName} 尚無訪客碼`,
        detail: '今天入住，房客目前無法使用訪客碼查看指南。',
        to: '/admin/guest-codes',
        urgent: true,
      });
    }
    if (booking.keyCode && !booking.keyLentAt) {
      tasks.push({
        id: `lend-key:${booking.id}`,
        icon: '鑰',
        title: `交付 ${booking.guestName} 的鑰匙`,
        detail: `${booking.keyCode} 尚未登記出借。`,
        action: 'lend',
        actionLabel: '登記已交付',
        booking,
      });
    }
  });

  summary.departures.forEach((booking) => {
    if (booking.keyCode && booking.keyLentAt && !booking.keyReturnedAt) {
      tasks.push({
        id: `return-key:${booking.id}`,
        icon: '鑰',
        title: `確認 ${booking.guestName} 歸還鑰匙`,
        detail: `${booking.keyCode} 仍顯示借出中。`,
        action: 'return',
        actionLabel: '登記已歸還',
        booking,
        urgent: true,
      });
    }
  });

  summary.paymentAttention.slice(0, 5).forEach((booking) => {
    tasks.push({
      id: `payment:${booking.id}`,
      icon: '＄',
      title: `${booking.guestName} 款項尚未完成`,
      detail: `${PAYMENT_LABEL[booking.paymentStatus]}・${format(booking.checkIn.toDate(), 'M/d')} 入住`,
      action: 'paid',
      actionLabel: '標記已付款',
      booking,
    });
  });

  const tomorrowBookings = [...summary.upcoming, ...summary.arrivals, ...summary.staying]
    .filter((booking, index, all) => all.findIndex((item) => item.id === booking.id) === index)
    .filter((booking) => isSameDay(booking.checkIn.toDate(), tomorrow));
  if (now.getHours() >= 9) {
    tomorrowBookings.forEach((booking) => {
      if (!booking.guestEmail) return;
      const sent = deliveries.some(
        (delivery) =>
          delivery.bookingId === booking.id
          && delivery.type === 'check_in_reminder'
          && delivery.status === 'sent'
          && delivery.trigger !== 'test'
      );
      if (!sent) {
        tasks.push({
          id: `checkin-email:${booking.id}`,
          icon: '✉',
          title: `${booking.guestName} 的入住提醒尚無寄送紀錄`,
          detail: '明天入住，09:00 排程後仍未確認寄出。',
          to: '/admin/emails',
          urgent: true,
        });
      }
    });
  }

  if (now.getHours() >= 12) {
    summary.departures.forEach((booking) => {
      if (!booking.guestEmail) return;
      const sent = deliveries.some(
        (delivery) =>
          delivery.bookingId === booking.id
          && delivery.type === 'checkout_reminder'
          && delivery.status === 'sent'
          && delivery.trigger !== 'test'
      );
      if (!sent) {
        tasks.push({
          id: `checkout-email:${booking.id}`,
          icon: '✉',
          title: `${booking.guestName} 的退房提醒尚無寄送紀錄`,
          detail: '今天退房，12:00 排程後仍未確認寄出。',
          to: '/admin/emails',
          urgent: true,
        });
      }
    });
  }

  const latestDeliveryByPlan = new Map<string, EmailDelivery>();
  deliveries
    .filter((delivery) => delivery.trigger !== 'test')
    .forEach((delivery) => {
      const key = `${delivery.bookingId}:${delivery.type}`;
      if (!latestDeliveryByPlan.has(key)) latestDeliveryByPlan.set(key, delivery);
    });
  const failedEmail = Array.from(latestDeliveryByPlan.values())
    .find((delivery) => delivery.status === 'failed');
  if (failedEmail) {
    tasks.unshift({
      id: `failed-email:${failedEmail.id}`,
      icon: '!',
      title: `Email 寄送失敗：${failedEmail.guestName}`,
      detail: failedEmail.errorMessage || failedEmail.typeLabel,
      to: '/admin/emails',
      urgent: true,
    });
  }

  return tasks;
}

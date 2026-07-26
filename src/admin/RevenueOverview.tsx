import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { useBookings } from './useBookings';
import {
  createBookingPayment,
  deleteBookingPayment,
  watchBookingPayments,
} from '@/lib/bookingPayments';
import {
  getExpectedRevenue,
  getLegacyReceivedAmount,
  inferStayType,
  isNonRevenueStay,
  STAY_TYPE_LABEL,
} from '@/lib/bookingFinance';
import type {
  Booking,
  BookingPayment,
  BookingPaymentKind,
  BookingPaymentMethod,
  PaymentStatus,
} from '@/types';

type RevenueScope = 'all' | 'year' | 'month';

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paid: '已全額收款',
  partial: '部分付款',
  unpaid: '尚未收款',
};

const METHOD_LABEL: Record<BookingPaymentMethod, string> = {
  cash: '現金',
  transfer: '轉帳',
  card: '信用卡',
  platform: '訂房平台',
  other: '其他',
};

function todayInput(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function RevenueOverview() {
  const { bookings, loading } = useBookings();
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const now = new Date();
  const [scope, setScope] = useState<RevenueScope>('month');
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [paymentBookingId, setPaymentBookingId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayInput());
  const [paymentKind, setPaymentKind] = useState<BookingPaymentKind>('payment');
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>('transfer');
  const [paymentNote, setPaymentNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => watchBookingPayments(setPayments), []);

  const bookingById = useMemo(
    () => new Map(bookings.map((booking) => [booking.id, booking])),
    [bookings]
  );

  const paymentsByBooking = useMemo(() => {
    const result = new Map<string, BookingPayment[]>();
    payments.forEach((payment) => {
      const current = result.get(payment.bookingId) ?? [];
      current.push(payment);
      result.set(payment.bookingId, current);
    });
    return result;
  }, [payments]);

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) =>
        isDateInScope(booking.checkIn.toDate(), scope, year, month)
      ),
    [bookings, month, scope, year]
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter((payment) =>
        isDateInScope(payment.receivedAt.toDate(), scope, year, month)
      ),
    [month, payments, scope, year]
  );

  const detailBookings = useMemo(
    () =>
      [...filteredBookings].sort(
        (a, b) => b.checkIn.toDate().getTime() - a.checkIn.toDate().getTime()
      ),
    [filteredBookings]
  );

  const summary = useMemo(() => {
    const accommodationValue = filteredBookings.reduce(
      (total, booking) => total + booking.amount,
      0
    );
    const expectedRevenue = filteredBookings.reduce(
      (total, booking) => total + getExpectedRevenue(booking),
      0
    );
    const nonCashValue = filteredBookings.reduce((total, booking) => {
      const expected = getExpectedRevenue(booking);
      return total + Math.max(booking.amount - expected, 0);
    }, 0);
    const recordedCash = filteredPayments.reduce(
      (total, payment) =>
        total + (payment.kind === 'refund' ? -payment.amount : payment.amount),
      0
    );
    const legacyCash = filteredBookings.reduce((total, booking) => {
      if ((paymentsByBooking.get(booking.id)?.length ?? 0) > 0) return total;
      return total + getLegacyReceivedAmount(booking);
    }, 0);
    const outstanding = filteredBookings.reduce((total, booking) => {
      const received = getBookingReceived(booking, paymentsByBooking.get(booking.id) ?? []);
      return total + Math.max(getExpectedRevenue(booking) - received, 0);
    }, 0);

    return {
      accommodationValue,
      expectedRevenue,
      actualCash: recordedCash + legacyCash,
      nonCashValue,
      outstanding,
    };
  }, [filteredBookings, filteredPayments, paymentsByBooking]);

  const scopeLabel =
    scope === 'all'
      ? '全部期間'
      : scope === 'year'
        ? `${year} 年`
        : `${month.replace('-', ' 年 ')} 月`;

  function selectPaymentBooking(id: string) {
    setPaymentBookingId(id);
    const booking = bookingById.get(id);
    if (!booking) return;
    const received = getBookingReceived(booking, paymentsByBooking.get(id) ?? []);
    setPaymentAmount(String(Math.max(getExpectedRevenue(booking) - received, 0)));
  }

  async function handlePaymentSubmit(event: FormEvent) {
    event.preventDefault();
    const booking = bookingById.get(paymentBookingId);
    const amount = Number(paymentAmount);
    if (!booking) {
      setPaymentError('請選擇預約');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('請輸入大於 0 的金額');
      return;
    }
    if (!paymentDate) {
      setPaymentError('請選擇收款日期');
      return;
    }

    setSavingPayment(true);
    setPaymentError(null);
    try {
      await createBookingPayment({
        bookingId: booking.id,
        guestName: booking.guestName,
        amount,
        kind: paymentKind,
        method: paymentMethod,
        receivedAt: new Date(`${paymentDate}T12:00:00`),
        note: paymentNote,
      });
      setPaymentAmount('');
      setPaymentNote('');
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : '收款紀錄建立失敗');
    } finally {
      setSavingPayment(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">收入總覽</h1>
          <p className="revenue-page-intro">同時查看住宿創造的價值與真正收到的款項。</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-mid)' }}>載入中…</p>
      ) : (
        <>
          <div className="admin-table revenue-filter-panel">
            <div className="revenue-scope-controls">
              {(['all', 'year', 'month'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={scope === item ? 'btn-gold' : 'btn-ghost'}
                  onClick={() => setScope(item)}
                >
                  {item === 'all' ? '全部期間' : item === 'year' ? '年度' : '月份'}
                </button>
              ))}
              {scope === 'year' && (
                <input
                  type="number"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  min={2000}
                  max={2100}
                  aria-label="選擇年份"
                />
              )}
              {scope === 'month' && (
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  aria-label="選擇月份"
                />
              )}
            </div>
          </div>

          <div className="stats-grid revenue-stats-grid">
            <StatCard label={`${scopeLabel}住宿價值`} value={summary.accommodationValue} tone="gold" />
            <StatCard label="實際入帳" value={summary.actualCash} tone="green" />
            <StatCard label="尚待收款" value={summary.outstanding} tone="amber" />
            <StatCard label="非現金住宿價值" value={summary.nonCashValue} tone="muted" />
          </div>

          <div className="revenue-definition-note">
            <span>住宿價值依入住日期統計</span>
            <span>實際入帳依收款日期統計</span>
            <span>舊資料若沒有收款紀錄，會暫時依「已全額付」推估</span>
          </div>

          <section className="revenue-detail-section" aria-labelledby="stay-value-title">
            <div className="revenue-detail-heading">
              <div>
                <h2 id="stay-value-title" className="admin-section-title">住宿價值明細</h2>
                <p>{scopeLabel}共 {detailBookings.length} 筆，應收 TWD {summary.expectedRevenue.toLocaleString()}</p>
              </div>
            </div>
            {detailBookings.length === 0 ? (
              <div className="admin-table revenue-detail-empty">此期間沒有住宿明細。</div>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-table mobile-card-table revenue-detail-table">
                  <thead>
                    <tr>
                      <th>房客</th><th>性質</th><th>入住</th><th>退房</th>
                      <th>住宿價值</th><th>應收</th><th>已收</th><th>狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailBookings.map((booking) => {
                      const stayType = inferStayType(booking);
                      const bookingPayments = paymentsByBooking.get(booking.id) ?? [];
                      const received = getBookingReceived(booking, bookingPayments);
                      return (
                        <tr key={booking.id}>
                          <td><div className="revenue-guest"><strong>{booking.guestName}</strong><small>{booking.guestEmail}</small></div></td>
                          <td><span className={`stay-type-badge ${stayType}`}>{STAY_TYPE_LABEL[stayType]}</span></td>
                          <td>{format(booking.checkIn.toDate(), 'yyyy-MM-dd')}</td>
                          <td>{format(booking.checkOut.toDate(), 'yyyy-MM-dd')}</td>
                          <td className="revenue-amount">TWD {booking.amount.toLocaleString()}</td>
                          <td>TWD {getExpectedRevenue(booking).toLocaleString()}</td>
                          <td>TWD {received.toLocaleString()}{bookingPayments.length === 0 && received > 0 ? <small className="legacy-estimate">推估</small> : null}</td>
                          <td><span className={`badge ${booking.paymentStatus}`}>{isNonRevenueStay(stayType) ? '不收費' : PAYMENT_LABEL[booking.paymentStatus]}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="revenue-detail-section" aria-labelledby="payment-entry-title">
            <div className="revenue-detail-heading">
              <div>
                <h2 id="payment-entry-title" className="admin-section-title">登記實際收款</h2>
                <p>訂金、尾款與退款都可分開記錄。</p>
              </div>
            </div>
            <form className="admin-table revenue-payment-form" onSubmit={handlePaymentSubmit}>
              <div className="form-grid">
                <div className="form-field full">
                  <label>預約</label>
                  <select value={paymentBookingId} onChange={(event) => selectPaymentBooking(event.target.value)}>
                    <option value="">請選擇房客</option>
                    {bookings.map((booking) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.guestName} · {format(booking.checkIn.toDate(), 'yyyy-MM-dd')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>類型</label>
                  <select value={paymentKind} onChange={(event) => setPaymentKind(event.target.value as BookingPaymentKind)}>
                    <option value="payment">收款</option>
                    <option value="refund">退款</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>金額</label>
                  <input type="number" min={1} step={1} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
                </div>
                <div className="form-field">
                  <label>日期</label>
                  <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
                </div>
                <div className="form-field">
                  <label>方式</label>
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as BookingPaymentMethod)}>
                    {Object.entries(METHOD_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="form-field full">
                  <label>備註</label>
                  <input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="例如：訂金、尾款、Airbnb 撥款" />
                </div>
              </div>
              {paymentError && <p className="field-error">{paymentError}</p>}
              <div className="form-actions">
                <button type="submit" className="btn-gold" disabled={savingPayment}>
                  {savingPayment ? '儲存中…' : paymentKind === 'refund' ? '登記退款' : '登記收款'}
                </button>
              </div>
            </form>
          </section>

          <section className="revenue-detail-section" aria-labelledby="cash-detail-title">
            <div className="revenue-detail-heading">
              <div>
                <h2 id="cash-detail-title" className="admin-section-title">實際入帳明細</h2>
                <p>{scopeLabel}共 {filteredPayments.length} 筆手動紀錄</p>
              </div>
            </div>
            {filteredPayments.length === 0 ? (
              <div className="admin-table revenue-detail-empty">此期間還沒有手動收款紀錄。</div>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-table mobile-card-table payment-detail-table">
                  <thead><tr><th>日期</th><th>房客</th><th>類型</th><th>方式</th><th>金額</th><th>備註</th><th>操作</th></tr></thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{format(payment.receivedAt.toDate(), 'yyyy-MM-dd')}</td>
                        <td>{bookingById.get(payment.bookingId)?.guestName || payment.guestName}</td>
                        <td>{payment.kind === 'refund' ? '退款' : '收款'}</td>
                        <td>{METHOD_LABEL[payment.method]}</td>
                        <td className={payment.kind === 'refund' ? 'revenue-refund' : 'revenue-amount'}>
                          {payment.kind === 'refund' ? '−' : ''}TWD {payment.amount.toLocaleString()}
                        </td>
                        <td>{payment.note || '—'}</td>
                        <td><button type="button" className="btn-danger" onClick={() => {
                          if (confirm('確定刪除這筆收款紀錄嗎？')) void deleteBookingPayment(payment.id);
                        }}>刪除</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function isDateInScope(date: Date, scope: RevenueScope, year: string, month: string): boolean {
  if (scope === 'all') return true;
  if (scope === 'year') return date.getFullYear() === Number(year);
  const [selectedYear, selectedMonth] = month.split('-').map(Number);
  return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
}

function getBookingReceived(booking: Booking, payments: BookingPayment[]): number {
  if (payments.length === 0) return getLegacyReceivedAmount(booking);
  return payments.reduce(
    (total, payment) => total + (payment.kind === 'refund' ? -payment.amount : payment.amount),
    0
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'gold' | 'green' | 'amber' | 'muted';
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">TWD {value.toLocaleString()}</div>
    </div>
  );
}

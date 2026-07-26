import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useBookings } from './useBookings';
import type { PaymentStatus } from '@/types';

type RevenueScope = 'all' | 'year' | 'month';

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paid: '已全額收款',
  partial: '部分付款',
  unpaid: '尚未收款',
};

export function RevenueOverview() {
  const { bookings, loading } = useBookings();
  const now = new Date();
  const [scope, setScope] = useState<RevenueScope>('month');
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  const filteredBookings = useMemo(() => {
    if (scope === 'all') return bookings;

    return bookings.filter((booking) => {
      const checkIn = booking.checkIn.toDate();

      if (scope === 'year') {
        return checkIn.getFullYear() === Number(year);
      }

      const [selectedYear, selectedMonth] = month.split('-').map(Number);
      return (
        checkIn.getFullYear() === selectedYear &&
        checkIn.getMonth() + 1 === selectedMonth
      );
    });
  }, [bookings, month, scope, year]);

  const summary = useMemo(() => {
    return filteredBookings.reduce(
      (acc, booking) => {
        acc.total += booking.amount;
        acc.count += 1;
        if (booking.paymentStatus === 'paid') acc.paid += booking.amount;
        if (booking.paymentStatus === 'partial') acc.partial += booking.amount;
        if (booking.paymentStatus === 'unpaid') acc.unpaid += booking.amount;
        return acc;
      },
      { total: 0, paid: 0, partial: 0, unpaid: 0, count: 0 }
    );
  }, [filteredBookings]);

  const detailBookings = useMemo(
    () =>
      [...filteredBookings].sort(
        (a, b) => b.checkIn.toDate().getTime() - a.checkIn.toDate().getTime()
      ),
    [filteredBookings]
  );

  const scopeLabel =
    scope === 'all'
      ? '全部期間'
      : scope === 'year'
        ? `${year} 年`
        : `${month.replace('-', ' 年 ')} 月`;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">收入總覽</h1>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-mid)' }}>載入中…</p>
      ) : (
        <>
          <div className="admin-table" style={{ padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {(['all', 'year', 'month'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={scope === item ? 'btn-gold' : 'btn-ghost'}
                  onClick={() => setScope(item)}
                  style={{ padding: '6px 14px', fontSize: 13 }}
                >
                  {item === 'all' ? '總收入' : item === 'year' ? '年度收入' : '當月收入'}
                </button>
              ))}

              {scope === 'year' && (
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min={2000}
                  max={2100}
                  style={controlInputStyle}
                  aria-label="選擇年份"
                />
              )}

              {scope === 'month' && (
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  style={controlInputStyle}
                  aria-label="選擇月份"
                />
              )}
            </div>
          </div>

          <div className="stats-grid">
            <StatCard label={`${scopeLabel}收入`} value={summary.total} tone="gold" />
            <StatCard label="已全額收款" value={summary.paid} tone="green" />
            <StatCard label="部分付款" value={summary.partial} tone="amber" />
            <StatCard label="尚未收款" value={summary.unpaid} tone="muted" />
          </div>

          <div className="admin-table" style={{ marginTop: 24, padding: 18 }}>
            <div style={{ color: 'var(--text)', fontSize: 14, marginBottom: 8 }}>
              {scopeLabel}共有 {summary.count} 筆預約
            </div>
            <div style={{ color: 'var(--text-mid)', fontSize: 13, lineHeight: 1.7 }}>
              收入以預約的入住日歸屬期間計算。
              <br />
              `已全額收款 / 部分付款 / 尚未收款` 會依照目前每筆預約的付款狀態分類。
            </div>
          </div>

          <section className="revenue-detail-section" aria-labelledby="revenue-detail-title">
            <div className="revenue-detail-heading">
              <div>
                <h2 id="revenue-detail-title" className="admin-section-title">收入明細</h2>
                <p>{scopeLabel}共 {detailBookings.length} 筆</p>
              </div>
            </div>

            {detailBookings.length === 0 ? (
              <div className="admin-table revenue-detail-empty">
                此期間沒有預約收入明細。
              </div>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-table mobile-card-table revenue-detail-table">
                  <thead>
                    <tr>
                      <th>房客</th>
                      <th>入住</th>
                      <th>退房</th>
                      <th>人數</th>
                      <th>金額</th>
                      <th>付款狀態</th>
                      <th>付款備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <div className="revenue-guest">
                            <strong>{booking.guestName}</strong>
                            <small>{booking.guestEmail}</small>
                          </div>
                        </td>
                        <td>{format(booking.checkIn.toDate(), 'yyyy-MM-dd')}</td>
                        <td>{format(booking.checkOut.toDate(), 'yyyy-MM-dd')}</td>
                        <td>{booking.partySize}</td>
                        <td className="revenue-amount">TWD {booking.amount.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${booking.paymentStatus}`}>
                            {PAYMENT_LABEL[booking.paymentStatus]}
                          </span>
                        </td>
                        <td className="revenue-payment-note">{booking.paymentNotes || '—'}</td>
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

const controlInputStyle = {
  background: 'var(--bg-mid)',
  border: '1px solid var(--border-card)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  padding: '8px 10px',
  fontSize: 13,
} as const;

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

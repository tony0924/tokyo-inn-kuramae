import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useBookings } from './useBookings';
import { Modal } from './Modal';
import { BookingForm } from './BookingForm';
import { deleteBookingWithGuestAccessCode } from '@/lib/bookings';
import { formatGuestCode } from '@/lib/guestAccessCodes';
import type { Booking, PaymentStatus } from '@/types';

const PAY_LABEL: Record<PaymentStatus, string> = {
  unpaid: '未付',
  partial: '部分付',
  paid: '已付',
};

export function BookingList() {
  const { bookings, loading } = useBookings();
  const [editing, setEditing] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'all' | 'past'>('upcoming');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === 'all') return bookings;
    if (filter === 'upcoming')
      return bookings.filter((b) => b.checkOut.toDate() >= now);
    return bookings.filter((b) => b.checkOut.toDate() < now);
  }, [bookings, filter]);

  async function handleDelete(booking: Booking) {
    if (!confirm(`確定要移除「${booking.guestName}」的預約嗎？`)) return;
    setDeletingId(booking.id);
    setError(null);
    try {
      await deleteBookingWithGuestAccessCode(booking.id, booking.guestAccessCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除預約失敗');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">預約清單</h1>
        <button type="button" className="btn-gold" onClick={() => setCreating(true)}>
          ＋ 新增預約
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {(['upcoming', 'all', 'past'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? 'btn-gold' : 'btn-ghost'}
            onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', fontSize: 13 }}
          >
            {f === 'upcoming' ? '未來/進行中' : f === 'past' ? '已退房' : '全部'}
          </button>
        ))}
      </div>

      <p style={{ color: 'var(--text-soft)', fontSize: 12, marginBottom: 16 }}>
        鑰匙狀態說明：未交付 = 尚未把鑰匙交給房客；使用中 = 房客已領取、鑰匙仍在外；已回收 = 房客已歸還鑰匙。
      </p>

      {error && (
        <p className="field-error" style={{ marginBottom: 12 }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-mid)' }}>載入中…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text-mid)' }}>沒有符合的預約。</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>Email</th>
              <th>入住</th>
              <th>退房</th>
              <th>人</th>
              <th>金額</th>
              <th>付款</th>
              <th>訪客碼</th>
              <th>鑰匙</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} onClick={() => setEditing(b)} style={{ cursor: 'pointer' }}>
                <td style={{ color: 'var(--text)' }}>{b.guestName}</td>
                <td style={{ color: 'var(--text-mid)' }}>{b.guestEmail}</td>
                <td>{format(b.checkIn.toDate(), 'yyyy-MM-dd')}</td>
                <td>{format(b.checkOut.toDate(), 'yyyy-MM-dd')}</td>
                <td style={{ textAlign: 'center' }}>{b.partySize}</td>
                <td>TWD {b.amount.toLocaleString()}</td>
                <td>
                  <span className={`badge ${b.paymentStatus}`}>
                    {PAY_LABEL[b.paymentStatus]}
                  </span>
                </td>
                <td style={{ color: 'var(--gold-light)', letterSpacing: '0.06em' }}>
                  {b.guestAccessCode ? formatGuestCode(b.guestAccessCode) : '—'}
                </td>
                <td style={{ color: 'var(--text-mid)', fontSize: 12 }}>
                  {b.keyCode ? `${b.keyCode} / ${keyStatus(b)}` : keyStatus(b)}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={deletingId === b.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(b);
                    }}
                    style={{ padding: '5px 10px', fontSize: 12 }}
                  >
                    {deletingId === b.id ? '移除中…' : '移除'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={creating || editing !== null} onClose={() => {
        setCreating(false);
        setEditing(null);
      }}>
        <BookingForm
          booking={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>
    </div>
  );
}

function keyStatus(b: Booking): string {
  if (b.keyReturnedAt) return '已回收';
  if (b.keyLentAt) return '使用中';
  return '未交付';
}

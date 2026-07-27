import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useBookings } from './useBookings';
import { useKeys } from './useKeys';
import { Modal } from './Modal';
import { BookingForm } from './BookingForm';
import { deleteBookingWithGuestAccessCode, markKeyLent, markKeyReturned } from '@/lib/bookings';
import { formatGuestCode } from '@/lib/guestAccessCodes';
import type { Booking, KeyItem, PaymentStatus } from '@/types';

const PAY_LABEL: Record<PaymentStatus, string> = {
  unpaid: '未付',
  partial: '部分付',
  paid: '已付',
};

type SortKey =
  | 'guestName'
  | 'guestEmail'
  | 'checkIn'
  | 'checkOut'
  | 'partySize'
  | 'amount'
  | 'paymentStatus'
  | 'guestAccessCode'
  | 'keyStatus';
type SortDirection = 'asc' | 'desc';

export function BookingList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { bookings, loading } = useBookings();
  const { keys } = useKeys();
  const [editing, setEditing] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'all' | 'past'>('upcoming');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('checkIn');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [keyUpdatingId, setKeyUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const updateLayout = () => setIsCompactLayout(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener('change', updateLayout);
    return () => mediaQuery.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    const bookingId = searchParams.get('booking');
    if (loading || !bookingId) return;
    const requestedBooking = bookings.find((booking) => booking.id === bookingId);
    if (requestedBooking) {
      setEditing(requestedBooking);
    } else {
      setError('找不到指定的預約，可能已被移除。');
    }
    setSearchParams({}, { replace: true });
  }, [bookings, loading, searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === 'all') return bookings;
    if (filter === 'upcoming')
      return bookings.filter((b) => b.checkOut.toDate() >= now);
    return bookings.filter((b) => b.checkOut.toDate() < now);
  }, [bookings, filter]);

  const sortedBookings = useMemo(() => {
    const direction = (filter === 'upcoming' ? sortDirection : sortKey === 'checkIn' ? 'desc' : sortDirection) === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const primary = compareBookings(a, b, sortKey) * direction;
      if (primary !== 0) return primary;
      return a.checkIn.toDate().getTime() - b.checkIn.toDate().getTime();
    });
  }, [filter, filtered, sortDirection, sortKey]);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDirection('asc');
  }

  function renderSortHeader(label: string, key: SortKey) {
    const active = sortKey === key;
    const arrow = active ? (sortDirection === 'asc' ? '↑' : '↓') : '';
    return (
      <button
        type="button"
        className={`table-sort-button${active ? ' active' : ''}`}
        onClick={() => toggleSort(key)}
      >
        <span>{label}</span>
        <span className="table-sort-indicator" aria-hidden="true">{arrow}</span>
      </button>
    );
  }

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

  async function handleKeyAction(booking: Booking, action: 'lend' | 'return') {
    setKeyUpdatingId(booking.id);
    setError(null);
    try {
      if (action === 'lend') {
        await markKeyLent(booking);
      } else {
        await markKeyReturned(booking);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新鑰匙狀態失敗');
    } finally {
      setKeyUpdatingId(null);
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

      <div className="admin-filter-bar">
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
        <div className="admin-table-scroll">
          <table className="admin-table booking-table">
          <thead>
            <tr>
              <th>{renderSortHeader('姓名', 'guestName')}</th>
              <th>{renderSortHeader('Email', 'guestEmail')}</th>
              <th>{renderSortHeader('入住', 'checkIn')}</th>
              <th>{renderSortHeader('退房', 'checkOut')}</th>
              <th>{renderSortHeader('人', 'partySize')}</th>
              <th>{renderSortHeader('金額', 'amount')}</th>
              <th>{renderSortHeader('付款', 'paymentStatus')}</th>
              <th>{renderSortHeader('訪客碼', 'guestAccessCode')}</th>
              <th>{renderSortHeader('鑰匙', 'keyStatus')}</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedBookings.map((b) => {
              const isExpanded = expandedBookingId === b.id;
              return (
              <tr
                key={b.id}
                className={isExpanded ? 'booking-card-expanded' : undefined}
                onClick={() => {
                  if (isCompactLayout) {
                    setExpandedBookingId(isExpanded ? null : b.id);
                  } else {
                    setEditing(b);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <td data-label="姓名" style={{ color: 'var(--text)' }}>
                  <span>{b.guestName}</span>
                  <span className="booking-card-toggle" aria-hidden="true">
                    {isExpanded ? '收合' : '展開'}
                  </span>
                </td>
                <td data-label="Email" style={{ color: 'var(--text-mid)' }}>{b.guestEmail}</td>
                <td data-label="入住">{format(b.checkIn.toDate(), 'yyyy-MM-dd')}</td>
                <td data-label="退房">{format(b.checkOut.toDate(), 'yyyy-MM-dd')}</td>
                <td data-label="人數" style={{ textAlign: 'center' }}>{b.partySize}</td>
                <td data-label="金額">TWD {b.amount.toLocaleString()}</td>
                <td data-label="付款">
                  <span className={`badge ${b.paymentStatus}`}>
                    {PAY_LABEL[b.paymentStatus]}
                  </span>
                </td>
                <td data-label="訪客碼" style={{ color: 'var(--gold-light)', letterSpacing: '0.06em' }}>
                  {b.guestAccessCode ? formatGuestCode(b.guestAccessCode) : '—'}
                </td>
                <td data-label="鑰匙" style={{ color: 'var(--text-mid)', fontSize: 12 }}>
                  {isCompactLayout && isExpanded ? (
                    <>
                      <KeyLoanHistory booking={b} keys={keys} />
                      {b.keyCode && !b.keyLentAt && (
                        <div className="booking-key-actions">
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={keyUpdatingId === b.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleKeyAction(b, 'lend');
                            }}
                          >
                            {keyUpdatingId === b.id ? '處理中…' : `登記出借 ${getKeyName(b.keyCode, keys)}`}
                          </button>
                        </div>
                      )}
                      {b.keyCode && b.keyLentAt && !b.keyReturnedAt && (
                        <div className="booking-key-actions">
                          <button
                            type="button"
                            className="btn-gold"
                            disabled={keyUpdatingId === b.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleKeyAction(b, 'return');
                            }}
                          >
                            {keyUpdatingId === b.id ? '處理中…' : `登記歸還 ${getKeyName(b.keyCode, keys)}`}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    keyStatus(b, keys)
                  )}
                </td>
                <td data-label="操作">
                  <button
                    type="button"
                    className="btn-ghost booking-card-edit"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditing(b);
                    }}
                    style={{ padding: '5px 10px', fontSize: 12 }}
                  >
                    編輯
                  </button>
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
              );
            })}
          </tbody>
          </table>
        </div>
      )}

      <Modal variant="booking" open={creating || editing !== null} onClose={() => {
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

function keyStatus(booking: Booking, keys: KeyItem[]): string {
  const keyName = getKeyName(booking.keyCode, keys);
  if (!booking.keyCode) return '未指定鑰匙';
  if (booking.keyReturnedAt) return `已歸還 ${keyName}`;
  if (booking.keyLentAt) return `使用中 ${keyName}`;
  return `未交付 ${keyName}`;
}

function getKeyName(keyCode: string | null, keys: KeyItem[]): string {
  if (!keyCode) return '鑰匙';
  return keys.find((key) => key.code.trim().toUpperCase() === keyCode.trim().toUpperCase())?.label || keyCode;
}

function getKeyLoanHistory(booking: Booking) {
  if (booking.keyHistory?.length) return booking.keyHistory;
  if (booking.keyCode && booking.keyLentAt) {
    return [{ keyCode: booking.keyCode, lentAt: booking.keyLentAt, returnedAt: booking.keyReturnedAt }];
  }
  return [];
}

function KeyLoanHistory({ booking, keys }: { booking: Booking; keys: KeyItem[] }) {
  const history = getKeyLoanHistory(booking);
  if (history.length === 0) return <>未交付 {getKeyName(booking.keyCode, keys)}</>;

  return (
    <div className="key-loan-history">
      {history.map((item, index) => {
        const keyName = getKeyName(item.keyCode, keys);
        return (
          <div key={`${item.keyCode}-${item.lentAt.toMillis()}-${index}`}>
            <span>出借 {keyName}</span>
            <span>{item.returnedAt ? `歸還 ${keyName}` : '尚未歸還'}</span>
          </div>
        );
      })}
    </div>
  );
}

function getPaymentStatusRank(status: PaymentStatus): number {
  if (status === 'paid') return 0;
  if (status === 'partial') return 1;
  return 2;
}

function getKeyStatusRank(booking: Booking): number {
  if (booking.keyReturnedAt) return 2;
  if (booking.keyLentAt) return 1;
  return 0;
}

function compareBookings(a: Booking, b: Booking, sortKey: SortKey): number {
  switch (sortKey) {
    case 'guestName':
      return a.guestName.localeCompare(b.guestName, 'zh-Hant');
    case 'guestEmail':
      return a.guestEmail.localeCompare(b.guestEmail, 'zh-Hant');
    case 'checkIn':
      return a.checkIn.toDate().getTime() - b.checkIn.toDate().getTime();
    case 'checkOut':
      return a.checkOut.toDate().getTime() - b.checkOut.toDate().getTime();
    case 'partySize':
      return a.partySize - b.partySize;
    case 'amount':
      return a.amount - b.amount;
    case 'paymentStatus':
      return getPaymentStatusRank(a.paymentStatus) - getPaymentStatusRank(b.paymentStatus);
    case 'guestAccessCode':
      return (a.guestAccessCode || '').localeCompare(b.guestAccessCode || '', 'zh-Hant');
    case 'keyStatus':
      return getKeyStatusRank(a) - getKeyStatusRank(b);
    default:
      return 0;
  }
}

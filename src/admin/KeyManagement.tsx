import { useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { createKey, deleteKey, normalizeKeyCode, setKeyActive, updateKey } from '@/lib/keys';
import { markKeyLent, markKeyReturned, recordKeyLoan, updateBooking } from '@/lib/bookings';
import { useBookings } from './useBookings';
import { useKeys } from './useKeys';
import { Modal } from './Modal';
import { BookingForm } from './BookingForm';
import type { Booking, KeyItem } from '@/types';

type EditingState = {
  code: string;
  label: string;
  notes: string;
};

type LoanEditingState = {
  bookingId: string;
  guestName: string;
  keyCode: string;
  keyLentAt: string;
  keyReturnedAt: string;
  keyHistory: Booking['keyHistory'];
};

type SortKey = 'code' | 'label' | 'status' | 'currentUsage' | 'notes' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export function KeyManagement() {
  const { keys, loading } = useKeys();
  const { bookings } = useBookings();
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [loanEditing, setLoanEditing] = useState<LoanEditingState | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const loanedByCode = useMemo(
    () =>
      new Map(
        bookings
          .filter((booking) => booking.keyCode && booking.keyLentAt && !booking.keyReturnedAt)
          .map((booking) => [normalizeKeyCode(booking.keyCode || ''), booking])
      ),
    [bookings]
  );

  // Most relevant booking per key: prefer one that is currently out, otherwise
  // the most recent booking (by check-in) that used this key. Keeps the booking
  // link visible even after the key has been returned.
  const latestBookingByCode = useMemo(() => {
    const map = new Map<string, Booking>();
    for (const booking of bookings) {
      const bookingCode = normalizeKeyCode(booking.keyCode || '');
      if (!bookingCode) continue;
      const existing = map.get(bookingCode);
      if (!existing || isMoreRelevant(booking, existing)) {
        map.set(bookingCode, booking);
      }
    }
    return map;
  }, [bookings]);

  const sortedKeys = useMemo(() => {
    return [...keys].sort((a, b) => {
      const aBooking = loanedByCode.get(normalizeKeyCode(a.code));
      const bBooking = loanedByCode.get(normalizeKeyCode(b.code));
      const direction = sortDirection === 'asc' ? 1 : -1;

      const primary = compareKeys(a, b, aBooking, bBooking, sortKey) * direction;
      if (primary !== 0) return primary;

      return a.code.localeCompare(b.code, 'zh-Hant') * direction;
    });
  }, [keys, loanedByCode, sortDirection, sortKey]);

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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await createKey({ code, label, notes });
      setMessage(`已新增鑰匙 ${normalizeKeyCode(code)}`);
      setCode('');
      setLabel('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增鑰匙失敗');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await updateKey(editing);
      setMessage(`已更新鑰匙 ${editing.code}`);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新鑰匙失敗');
    } finally {
      setSaving(false);
    }
  }

  function startLoanEditing(booking: Booking) {
    setMessage(null);
    setError(null);
    setLoanEditing({
      bookingId: booking.id,
      guestName: booking.guestName,
      keyCode: normalizeKeyCode(booking.keyCode || ''),
      keyLentAt: tsToDateInput(booking.keyLentAt),
      keyReturnedAt: tsToDateInput(booking.keyReturnedAt),
      keyHistory: booking.keyHistory,
    });
  }

  async function handleLoanSave(e: FormEvent) {
    e.preventDefault();
    if (!loanEditing) return;
    if (loanEditing.keyReturnedAt && !loanEditing.keyLentAt) {
      setError('請先填出借日，才能登記歸還日。');
      return;
    }
    if (
      loanEditing.keyLentAt &&
      loanEditing.keyReturnedAt &&
      loanEditing.keyReturnedAt < loanEditing.keyLentAt
    ) {
      setError('歸還日不能早於出借日。');
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const keyLentAt = dateInputToTs(loanEditing.keyLentAt);
      const keyReturnedAt = dateInputToTs(loanEditing.keyReturnedAt);
      await updateBooking(loanEditing.bookingId, {
        keyLentAt,
        keyReturnedAt,
        keyHistory: recordKeyLoan(loanEditing.keyHistory, loanEditing.keyCode, keyLentAt, keyReturnedAt),
      });
      setMessage(`已更新 ${loanEditing.guestName} 的鑰匙借還紀錄`);
      setLoanEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新借還紀錄失敗');
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickLent(booking: Booking) {
    setMessage(null);
    setError(null);
    try {
      await markKeyLent(booking);
      setMessage(`已登記 ${booking.guestName} 領取 ${booking.keyCode || '鑰匙'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登記出借失敗');
    }
  }

  async function handleQuickReturned(booking: Booking) {
    setMessage(null);
    setError(null);
    try {
      await markKeyReturned(booking);
      setMessage(`已登記 ${booking.guestName} 歸還 ${booking.keyCode || '鑰匙'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登記歸還失敗');
    }
  }

  async function handleDelete(key: KeyItem) {
    const loanedBooking = loanedByCode.get(normalizeKeyCode(key.code));
    if (loanedBooking) {
      setError(`「${key.code}」目前出借給 ${loanedBooking.guestName}，請先登記歸還後再刪除。`);
      return;
    }
    if (!confirm(`確定刪除鑰匙「${key.code}」嗎？`)) return;
    setError(null);
    try {
      await deleteKey(key.code);
      setMessage(`已刪除鑰匙 ${key.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除鑰匙失敗');
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">鑰匙管理</h1>
          <p style={{ color: 'var(--text-mid)', fontSize: 13, marginTop: 8 }}>
            新增可出借的鑰匙。預約表單只能選擇啟用且未出借中的鑰匙。鑰匙的出借與歸還可直接在下方登記，歸還後仍會保留最近一筆預約，方便補登或修正日期。
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="admin-table" style={{ padding: 18, marginBottom: 24 }}>
        <div className="form-grid">
          <div className="form-field">
            <label>鑰匙編號 *</label>
            <input
              value={code}
              onChange={(e) => setCode(normalizeKeyCode(e.target.value))}
              placeholder="如：A1、ROOM-204、備用鑰匙"
              required
            />
          </div>
          <div className="form-field">
            <label>顯示名稱</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="如：204 主鑰匙"
            />
          </div>
          <div className="form-field full">
            <label>備註</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="如：放在玄關鑰匙盒、備用鑰匙"
            />
          </div>
        </div>

        {error && <p className="field-error" style={{ marginTop: 14 }}>{error}</p>}
        {message && (
          <p style={{ color: 'var(--gold-light)', marginTop: 14, fontSize: 13 }}>{message}</p>
        )}

        <div className="form-actions" style={{ marginTop: 18 }}>
          <button type="submit" className="btn-gold" disabled={saving}>
            {saving ? '新增中…' : '新增鑰匙'}
          </button>
        </div>
      </form>

      {editing && (
        <form onSubmit={handleUpdate} className="admin-table" style={{ padding: 18, marginBottom: 24 }}>
          <h2 style={sectionTitleStyle}>編輯鑰匙 {editing.code}</h2>
          <div className="form-grid">
            <div className="form-field">
              <label>顯示名稱</label>
              <input
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>備註</label>
              <input
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: 18 }}>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
              取消
            </button>
            <button type="submit" className="btn-gold" disabled={saving}>
              {saving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </form>
      )}

      {loanEditing && (
        <form onSubmit={handleLoanSave} className="admin-table" style={{ padding: 18, marginBottom: 24 }}>
          <h2 style={sectionTitleStyle}>
            鑰匙 {loanEditing.keyCode} 借還登記 — {loanEditing.guestName}
          </h2>
          <div className="form-grid">
            <div className="form-field">
              <label>出借日</label>
              <input
                type="date"
                value={loanEditing.keyLentAt}
                onChange={(e) => setLoanEditing({ ...loanEditing, keyLentAt: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>歸還日</label>
              <input
                type="date"
                value={loanEditing.keyReturnedAt}
                onChange={(e) => setLoanEditing({ ...loanEditing, keyReturnedAt: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setLoanEditing({ ...loanEditing, keyLentAt: todayInput() })}
            >
              出借日填今天
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setLoanEditing({ ...loanEditing, keyReturnedAt: todayInput() })}
            >
              歸還日填今天
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setLoanEditing({ ...loanEditing, keyReturnedAt: '' })}
            >
              清除歸還日
            </button>
          </div>
          <div className="form-actions" style={{ marginTop: 18 }}>
            <button type="button" className="btn-ghost" onClick={() => setLoanEditing(null)}>
              取消
            </button>
            <button type="submit" className="btn-gold" disabled={saving}>
              {saving ? '儲存中…' : '儲存借還紀錄'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-mid)' }}>載入中…</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
          <thead>
            <tr>
              <th>{renderSortHeader('鑰匙編號', 'code')}</th>
              <th>{renderSortHeader('名稱', 'label')}</th>
              <th>{renderSortHeader('狀態', 'status')}</th>
              <th>{renderSortHeader('目前使用', 'currentUsage')}</th>
              <th>{renderSortHeader('備註', 'notes')}</th>
              <th>{renderSortHeader('建立時間', 'createdAt')}</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ color: 'var(--text-mid)' }}>
                  尚未建立鑰匙。新增後即可在預約表單中選擇。
                </td>
              </tr>
            ) : (
              sortedKeys.map((key) => {
                const normalizedCode = normalizeKeyCode(key.code);
                const loanedBooking = loanedByCode.get(normalizedCode);
                const latestBooking = latestBookingByCode.get(normalizedCode);
                const status = getKeyStatus(key, Boolean(loanedBooking));
                return (
                  <tr key={key.id}>
                    <td style={{ color: 'var(--gold-light)', letterSpacing: '0.04em' }}>
                      {key.code}
                    </td>
                    <td style={{ color: 'var(--text)' }}>{key.label}</td>
                    <td>
                      <span className={`badge ${status.className}`}>{status.label}</span>
                    </td>
                    <td style={{ color: 'var(--text-mid)' }}>
                      {latestBooking ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ color: 'var(--text)' }}>{latestBooking.guestName}</span>
                          <span style={{ fontSize: 12 }}>
                            {format(latestBooking.checkIn.toDate(), 'yyyy-MM-dd')} ~{' '}
                            {format(latestBooking.checkOut.toDate(), 'yyyy-MM-dd')} ·{' '}
                            {loanStatusLabel(latestBooking)}
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ color: 'var(--text-mid)' }}>{key.notes || '—'}</td>
                    <td style={{ color: 'var(--text-mid)' }}>
                      {key.createdAt?.toDate ? format(key.createdAt.toDate(), 'yyyy-MM-dd') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {latestBooking && !latestBooking.keyLentAt && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => handleQuickLent(latestBooking)}
                          >
                            登記出借
                          </button>
                        )}
                        {latestBooking && latestBooking.keyLentAt && !latestBooking.keyReturnedAt && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => handleQuickReturned(latestBooking)}
                          >
                            登記歸還
                          </button>
                        )}
                        {latestBooking && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => startLoanEditing(latestBooking)}
                          >
                            借還登記
                          </button>
                        )}
                        {latestBooking && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => setViewingBooking(latestBooking)}
                          >
                            查看預約
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() =>
                            setEditing({
                              code: key.code,
                              label: key.label,
                              notes: key.notes,
                            })
                          }
                        >
                          編輯
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setKeyActive(key.code, !key.active)}
                        >
                          {key.active ? '停用' : '啟用'}
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleDelete(key)}
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      )}

      <Modal open={viewingBooking !== null} onClose={() => setViewingBooking(null)}>
        <BookingForm booking={viewingBooking} onClose={() => setViewingBooking(null)} />
      </Modal>
    </div>
  );
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function tsToDateInput(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateInputToTs(value: string): Timestamp | null {
  if (!value) return null;
  return Timestamp.fromDate(new Date(`${value}T00:00`));
}

function todayInput(): string {
  return tsToDateInput({ toDate: () => new Date() });
}

function isCurrentlyOut(booking: Booking): boolean {
  return Boolean(booking.keyLentAt && !booking.keyReturnedAt);
}

// A booking that still has the key out beats any other; otherwise the later
// check-in wins so the newest booking for that key stays on top.
function isMoreRelevant(candidate: Booking, current: Booking): boolean {
  const candidateOut = isCurrentlyOut(candidate);
  const currentOut = isCurrentlyOut(current);
  if (candidateOut !== currentOut) return candidateOut;
  return candidate.checkIn.toDate().getTime() > current.checkIn.toDate().getTime();
}

function loanStatusLabel(booking: Booking): string {
  if (booking.keyReturnedAt) return `已歸還 ${booking.keyCode || '鑰匙'}`;
  if (booking.keyLentAt) return '使用中';
  return '未交付';
}

function getKeyStatus(key: KeyItem, loaned: boolean): { label: string; className: string } {
  if (!key.active) return { label: '已停用', className: 'role-pending' };
  if (loaned) return { label: '出借中', className: 'partial' };
  return { label: '可出借', className: 'paid' };
}

function getKeyStatusOrder(key: KeyItem, loaned: boolean): number {
  if (!key.active) return 2;
  if (loaned) return 1;
  return 0;
}

function compareText(a: string, b: string): number {
  return (a || '').localeCompare(b || '', 'zh-Hant');
}

function compareDate(a?: { toDate?: () => Date } | null, b?: { toDate?: () => Date } | null): number {
  const aTime = a?.toDate ? a.toDate().getTime() : 0;
  const bTime = b?.toDate ? b.toDate().getTime() : 0;
  return aTime - bTime;
}

function compareKeys(
  a: KeyItem,
  b: KeyItem,
  aBooking: { guestName: string; checkIn: { toDate: () => Date } } | undefined,
  bBooking: { guestName: string; checkIn: { toDate: () => Date } } | undefined,
  sortKey: SortKey
): number {
  switch (sortKey) {
    case 'code':
      return compareText(a.code, b.code);
    case 'label':
      return compareText(a.label, b.label);
    case 'status':
      return (
        getKeyStatusOrder(a, Boolean(aBooking)) - getKeyStatusOrder(b, Boolean(bBooking))
      );
    case 'currentUsage':
      if (aBooking && bBooking) {
        return (
          compareDate(aBooking.checkIn, bBooking.checkIn) ||
          compareText(aBooking.guestName, bBooking.guestName)
        );
      }
      if (aBooking) return -1;
      if (bBooking) return 1;
      return 0;
    case 'notes':
      return compareText(a.notes, b.notes);
    case 'createdAt':
      return compareDate(a.createdAt, b.createdAt);
    default:
      return 0;
  }
}

const sectionTitleStyle = {
  fontFamily: "'Noto Serif TC', serif",
  fontSize: 18,
  color: 'var(--text)',
  marginBottom: 14,
} as const;

import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { createKey, deleteKey, normalizeKeyCode, setKeyActive, updateKey } from '@/lib/keys';
import { useBookings } from './useBookings';
import { useKeys } from './useKeys';
import type { KeyItem } from '@/types';

type EditingState = {
  code: string;
  label: string;
  notes: string;
};

export function KeyManagement() {
  const { keys, loading } = useKeys();
  const { bookings } = useBookings();
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loanedByCode = new Map(
    bookings
      .filter((booking) => booking.keyCode && booking.keyLentAt && !booking.keyReturnedAt)
      .map((booking) => [normalizeKeyCode(booking.keyCode || ''), booking])
  );

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

  async function handleDelete(key: KeyItem) {
    const loanedBooking = loanedByCode.get(normalizeKeyCode(key.code));
    if (loanedBooking) {
      setError(`「${key.code}」目前出借給 ${loanedBooking.guestName}，請先在預約中登記歸還後再刪除。`);
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
            新增可出借的鑰匙。預約表單只能選擇啟用且未出借中的鑰匙。
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

      {loading ? (
        <p style={{ color: 'var(--text-mid)' }}>載入中…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>鑰匙編號</th>
              <th>名稱</th>
              <th>狀態</th>
              <th>目前使用</th>
              <th>備註</th>
              <th>建立時間</th>
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
              keys.map((key) => {
                const loanedBooking = loanedByCode.get(normalizeKeyCode(key.code));
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
                      {loanedBooking
                        ? `${loanedBooking.guestName}（${format(
                            loanedBooking.checkIn.toDate(),
                            'yyyy-MM-dd'
                          )} ~ ${format(loanedBooking.checkOut.toDate(), 'yyyy-MM-dd')}）`
                        : '—'}
                    </td>
                    <td style={{ color: 'var(--text-mid)' }}>{key.notes || '—'}</td>
                    <td style={{ color: 'var(--text-mid)' }}>
                      {key.createdAt?.toDate ? format(key.createdAt.toDate(), 'yyyy-MM-dd') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
      )}
    </div>
  );
}

function getKeyStatus(key: KeyItem, loaned: boolean): { label: string; className: string } {
  if (!key.active) return { label: '已停用', className: 'role-pending' };
  if (loaned) return { label: '出借中', className: 'partial' };
  return { label: '可出借', className: 'paid' };
}

const sectionTitleStyle = {
  fontFamily: "'Noto Serif TC', serif",
  fontSize: 18,
  color: 'var(--text)',
  marginBottom: 14,
} as const;

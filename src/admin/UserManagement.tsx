import { format } from 'date-fns';
import { useUsers } from './useUsers';
import {
  deleteEmailAccess,
  grantGuestAccessForEmail,
  setUserActive,
  setUserBookingId,
  setUserRole,
  watchEmailAccess,
} from '@/lib/users';
import { useBookings } from './useBookings';
import { useEffect, useState } from 'react';
import type { EmailAccess, User } from '@/types';

export function UserManagement() {
  const { users, loading } = useUsers();
  const { bookings } = useBookings();
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailAccess, setEmailAccess] = useState<EmailAccess[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    return watchEmailAccess(setEmailAccess);
  }, []);

  async function approve(u: User) {
    setBusyUid(u.uid);
    setError(null);
    try {
      const matchingBooking = bookings.find(
        (b) => b.guestEmail.toLowerCase() === u.email.toLowerCase()
      );
      await setUserRole(u.uid, 'guest');
      await setUserActive(u.uid, true);
      if (matchingBooking) {
        await setUserBookingId(u.uid, matchingBooking.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗');
    } finally {
      setBusyUid(null);
    }
  }

  async function toggleActive(u: User) {
    setBusyUid(u.uid);
    setError(null);
    try {
      await setUserActive(u.uid, !u.active);
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗');
    } finally {
      setBusyUid(null);
    }
  }

  async function changeRole(u: User, role: User['role']) {
    setBusyUid(u.uid);
    setError(null);
    try {
      await setUserRole(u.uid, role);
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗');
    } finally {
      setBusyUid(null);
    }
  }

  async function addEmailAccess() {
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('請輸入 Gmail 帳號');
      return;
    }
    setInviting(true);
    setError(null);
    try {
      const matchingBooking = bookings.find(
        (b) => b.guestEmail.toLowerCase() === normalizedEmail
      );
      await grantGuestAccessForEmail(normalizedEmail, matchingBooking?.id ?? null);

      setInviteEmail('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增授權 Gmail 失敗');
    } finally {
      setInviting(false);
    }
  }

  async function removeEmailAccess(email: string) {
    setError(null);
    try {
      await deleteEmailAccess(email);
    } catch (e) {
      setError(e instanceof Error ? e.message : '移除授權失敗');
    }
  }

  const pending = users.filter((u) => u.role === 'pending');
  const active = users.filter((u) => u.role !== 'pending');
  const approvedEmailsWithoutLogin = emailAccess.filter(
    (item) => !users.some((u) => u.email.toLowerCase() === item.email.toLowerCase())
  );
  const approvedCount = active.length + approvedEmailsWithoutLogin.length;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">使用者</h1>
      </div>

      {error && (
        <p className="field-error" style={{ marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div className="admin-table" style={{ marginBottom: 32, padding: 18 }}>
        <h2
          style={{
            fontFamily: "'Noto Serif TC', serif",
            fontSize: 16,
            color: 'var(--text)',
            marginBottom: 12,
          }}
        >
          新增已核准 Gmail
        </h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="guest@gmail.com"
            style={{
              flex: '1 1 280px',
              background: 'var(--bg-mid)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-sm)',
              padding: '9px 12px',
              color: 'var(--text)',
            }}
          />
          <button
            type="button"
            className="btn-gold"
            onClick={() => {
              void addEmailAccess();
            }}
            disabled={inviting}
          >
            {inviting ? '新增中…' : '新增 Gmail'}
          </button>
        </div>
        <p style={{ color: 'var(--text-soft)', fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>
          建立預約或手動新增 Gmail 後，會直接列在已核准帳號中。
          <br />
          如果房客還沒有用 Google 登入，狀態會顯示「尚未登入」；第一次登入後會自動變成可用 guest 帳號並綁定預約。
        </p>
      </div>

      <h2 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: 'var(--text)', marginBottom: 12 }}>
        待審核 ({pending.length})
      </h2>
      {loading ? (
        <p style={{ color: 'var(--text-mid)' }}>載入中…</p>
      ) : pending.length === 0 ? (
        <p style={{ color: 'var(--text-soft)', fontSize: 13, fontStyle: 'italic' }}>
          目前沒有待審核的帳號。
        </p>
      ) : (
        <table className="admin-table" style={{ marginBottom: 32 }}>
          <thead>
            <tr>
              <th>姓名</th>
              <th>Email</th>
              <th>有對應預約？</th>
              <th>註冊時間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((u) => {
              const match = bookings.find(
                (b) => b.guestEmail.toLowerCase() === u.email.toLowerCase()
              );
              return (
                <tr key={u.uid}>
                  <td>{u.displayName || '—'}</td>
                  <td>{u.email}</td>
                  <td style={{ color: 'var(--text-mid)' }}>
                    {match
                      ? `✓ ${match.guestName} ${format(match.checkIn.toDate(), 'MM/dd')}–${format(match.checkOut.toDate(), 'MM/dd')}`
                      : '✗ 找不到'}
                  </td>
                  <td style={{ color: 'var(--text-mid)' }}>
                    {u.createdAt ? format(u.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-gold"
                      onClick={() => approve(u)}
                      disabled={busyUid === u.uid}
                      style={{ padding: '6px 14px', fontSize: 12 }}
                    >
                      審核通過
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: 'var(--text)', marginBottom: 12 }}>
        已核准帳號 ({approvedCount})
      </h2>
      {approvedCount === 0 ? (
        <p style={{ color: 'var(--text-soft)', fontSize: 13, fontStyle: 'italic' }}>
          沒有任何已核准帳號。
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>Email</th>
              <th>角色</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {active.map((u) => (
              <tr key={u.uid}>
                <td>{u.displayName || '—'}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge role-${u.role}`}>{u.role}</span>
                </td>
                <td style={{ color: u.active ? 'var(--gold-light)' : 'var(--text-soft)' }}>
                  {u.active ? '啟用' : '停用'}
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => toggleActive(u)}
                    disabled={busyUid === u.uid}
                    style={{ padding: '5px 10px', fontSize: 12 }}
                  >
                    {u.active ? '停用' : '啟用'}
                  </button>
                  {u.role === 'guest' && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => changeRole(u, 'admin')}
                      disabled={busyUid === u.uid}
                      style={{ padding: '5px 10px', fontSize: 12 }}
                    >
                      升級 admin
                    </button>
                  )}
                  {u.role === 'admin' && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => changeRole(u, 'guest')}
                      disabled={busyUid === u.uid}
                      style={{ padding: '5px 10px', fontSize: 12 }}
                    >
                      降為 guest
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {approvedEmailsWithoutLogin.map((item) => (
              <tr key={item.id}>
                <td>尚未登入</td>
                <td>{item.email}</td>
                <td>
                  <span className={`badge role-${item.role}`}>{item.role}</span>
                </td>
                <td style={{ color: item.active ? 'var(--gold-light)' : 'var(--text-soft)' }}>
                  {item.active ? '已核准，尚未登入' : '停用'}
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      void removeEmailAccess(item.email);
                    }}
                    style={{ padding: '5px 10px', fontSize: 12 }}
                  >
                    移除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

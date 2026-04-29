import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import {
  createGuestAccessCode,
  deleteGuestAccessCode,
  formatGuestCode,
  generateGuestCode,
  setGuestAccessCodeActive,
  watchGuestAccessCodes,
} from '@/lib/guestAccessCodes';
import type { GuestAccessCode } from '@/types';

function toDateTimeInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getStatus(code: GuestAccessCode): { label: string; className: string } {
  const now = Date.now();
  if (!code.active) return { label: '已停用', className: 'role-pending' };
  if (code.startsAt.toDate().getTime() > now) return { label: '尚未生效', className: 'partial' };
  if (code.expiresAt.toDate().getTime() <= now) return { label: '已過期', className: 'unpaid' };
  return { label: '可使用', className: 'paid' };
}

export function GuestCodeManagement() {
  const now = useMemo(() => new Date(), []);
  const [codes, setCodes] = useState<GuestAccessCode[]>([]);
  const [label, setLabel] = useState('房客訪客碼');
  const [code, setCode] = useState(generateGuestCode());
  const [startsAt, setStartsAt] = useState(toDateTimeInput(now));
  const [expiresAt, setExpiresAt] = useState(toDateTimeInput(addDays(now, 7)));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => watchGuestAccessCodes(setCodes), []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const start = new Date(startsAt);
      const end = new Date(expiresAt);
      if (!code.trim()) throw new Error('請產生或輸入訪客碼');
      if (!label.trim()) throw new Error('請填寫用途說明');
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error('請設定正確的有效時間');
      }
      if (start >= end) throw new Error('結束時間必須晚於開始時間');

      await createGuestAccessCode({
        code,
        label,
        startsAt: start,
        expiresAt: end,
      });
      setMessage(`已建立訪客碼 ${formatGuestCode(code)}`);
      setCode(generateGuestCode());
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立失敗');
    } finally {
      setSaving(false);
    }
  }

  async function copyCode(value: string) {
    await navigator.clipboard.writeText(formatGuestCode(value));
    setMessage(`已複製 ${formatGuestCode(value)}`);
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">訪客碼管理</h1>
          <p style={{ color: 'var(--text-mid)', fontSize: 13, marginTop: 8 }}>
            產生有時效的隨機碼，房客可不登入 Gmail，直接用訪客碼查看房客頁面。
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="admin-table" style={{ padding: 18, marginBottom: 24 }}>
        <div className="form-grid">
          <div className="form-field">
            <label>用途說明</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="form-field">
            <label>訪客碼</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={code}
                onChange={(e) => setCode(formatGuestCode(e.target.value))}
                style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
              />
              <button
                type="button"
                className="btn-ghost"
                style={{ whiteSpace: 'nowrap' }}
                onClick={() => setCode(generateGuestCode())}
              >
                重新產生
              </button>
            </div>
          </div>
          <div className="form-field">
            <label>開始時間</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>過期時間</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="field-error" style={{ marginTop: 14 }}>{error}</p>}
        {message && (
          <p style={{ color: 'var(--gold-light)', marginTop: 14, fontSize: 13 }}>{message}</p>
        )}

        <div className="form-actions" style={{ marginTop: 18 }}>
          <button type="submit" className="btn-gold" disabled={saving}>
            {saving ? '建立中…' : '建立訪客碼'}
          </button>
        </div>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>用途</th>
            <th>訪客碼</th>
            <th>狀態</th>
            <th>有效區間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {codes.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ color: 'var(--text-mid)' }}>
                尚未建立訪客碼。
              </td>
            </tr>
          ) : (
            codes.map((item) => {
              const status = getStatus(item);
              return (
                <tr key={item.id}>
                  <td style={{ color: 'var(--text)' }}>{item.label}</td>
                  <td style={{ color: 'var(--gold-light)', letterSpacing: '0.08em' }}>
                    {formatGuestCode(item.code)}
                  </td>
                  <td>
                    <span className={`badge ${status.className}`}>{status.label}</span>
                  </td>
                  <td style={{ color: 'var(--text-mid)' }}>
                    {format(item.startsAt.toDate(), 'yyyy-MM-dd HH:mm')} ~{' '}
                    {format(item.expiresAt.toDate(), 'yyyy-MM-dd HH:mm')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="btn-ghost" onClick={() => copyCode(item.code)}>
                        複製
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setGuestAccessCodeActive(item.code, !item.active)}
                      >
                        {item.active ? '停用' : '啟用'}
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => {
                          if (confirm(`確定刪除訪客碼 ${formatGuestCode(item.code)} 嗎？`)) {
                            deleteGuestAccessCode(item.code).catch((err) =>
                              setError(err instanceof Error ? err.message : '刪除失敗')
                            );
                          }
                        }}
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
  );
}

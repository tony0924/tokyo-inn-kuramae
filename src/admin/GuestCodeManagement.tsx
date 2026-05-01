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
import { watchGuestPageViews } from '@/lib/guestAnalytics';
import type { GuestAccessCode, GuestPageView } from '@/types';

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

function getStatusRank(code: GuestAccessCode): number {
  const status = getStatus(code).label;
  if (status === '可使用') return 0;
  if (status === '尚未生效') return 1;
  if (status === '已停用') return 2;
  return 3;
}

function formatMaybeDate(view: GuestPageView): string {
  return view.createdAt ? format(view.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : '剛剛';
}

export function GuestCodeManagement() {
  const now = useMemo(() => new Date(), []);
  const [codes, setCodes] = useState<GuestAccessCode[]>([]);
  const [views, setViews] = useState<GuestPageView[]>([]);
  const [label, setLabel] = useState('房客訪客碼');
  const [code, setCode] = useState(generateGuestCode());
  const [startsAt, setStartsAt] = useState(toDateTimeInput(now));
  const [expiresAt, setExpiresAt] = useState(toDateTimeInput(addDays(now, 7)));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => watchGuestAccessCodes(setCodes), []);
  useEffect(() => watchGuestPageViews(setViews), []);

  const codeByValue = useMemo(() => {
    return new Map(codes.map((item) => [item.code, item]));
  }, [codes]);

  const codeStats = useMemo(() => {
    const stats = new Map<string, { loginCount: number; viewCount: number }>();
    views.forEach((view) => {
      if (!view.guestAccessCode) return;
      const current = stats.get(view.guestAccessCode) ?? { loginCount: 0, viewCount: 0 };
      if (view.eventType === 'code_login') current.loginCount += 1;
      if (view.eventType === 'page_view') current.viewCount += 1;
      stats.set(view.guestAccessCode, current);
    });
    return stats;
  }, [views]);

  const sortedCodes = useMemo(() => {
    return [...codes].sort((a, b) => {
      const rankDiff = getStatusRank(a) - getStatusRank(b);
      if (rankDiff !== 0) return rankDiff;
      return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
    });
  }, [codes]);

  const dashboard = useMemo(() => {
    const pageViews = views.filter((view) => view.eventType === 'page_view');
    const codeLogins = views.filter((view) => view.eventType === 'code_login');
    const visitorCounts = new Map<string, { label: string; count: number }>();
    const uniqueVisitors = new Set<string>();

    pageViews.forEach((view) => {
      const codeInfo = view.guestAccessCode ? codeByValue.get(view.guestAccessCode) : null;
      const label =
        view.userEmail ||
        codeInfo?.guestEmail ||
        view.guestEmail ||
        codeInfo?.guestName ||
        view.guestName ||
        (view.guestAccessCode ? `訪客碼 ${formatGuestCode(view.guestAccessCode)}` : '未知訪客');
      const key = view.userUid || view.userEmail || view.guestAccessCode || view.deviceId;
      uniqueVisitors.add(key);

      const current = visitorCounts.get(key) ?? { label, count: 0 };
      current.count += 1;
      visitorCounts.set(key, current);
    });

    return {
      totalPageViews: pageViews.length,
      totalCodeLogins: codeLogins.length,
      uniqueVisitorCount: uniqueVisitors.size,
      topVisitors: [...visitorCounts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      recentViews: views.slice(0, 8),
    };
  }, [codeByValue, views]);

  function getVisitorLabel(view: GuestPageView): string {
    if (view.userEmail) {
      return view.userName ? `${view.userName}（${view.userEmail}）` : view.userEmail;
    }
    if (view.guestAccessCode) {
      const codeInfo = codeByValue.get(view.guestAccessCode);
      const name = codeInfo?.guestName || view.guestName;
      const email = codeInfo?.guestEmail || view.guestEmail;
      if (name && email) return `${name}（${email}）`;
      if (email) return email;
      if (name) return name;
      return `訪客碼 ${formatGuestCode(view.guestAccessCode)}`;
    }
    return '未知訪客';
  }

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

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card gold">
          <div className="stat-label">房客頁瀏覽次數</div>
          <div className="stat-value">{dashboard.totalPageViews}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">訪客碼登入次數</div>
          <div className="stat-value">{dashboard.totalCodeLogins}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">主要訪客數</div>
          <div className="stat-value">{dashboard.uniqueVisitorCount}</div>
        </div>
        <div className="stat-card muted">
          <div className="stat-label">目前訪客碼</div>
          <div className="stat-value">{codes.length}</div>
        </div>
      </div>

      <div className="guest-dashboard-grid">
        <div className="admin-table" style={{ padding: 18 }}>
          <h2 className="admin-section-title">主要查看者</h2>
          {dashboard.topVisitors.length === 0 ? (
            <p className="helper-text">目前還沒有房客頁瀏覽紀錄。</p>
          ) : (
            <div className="top-visitor-list">
              {dashboard.topVisitors.map((visitor, index) => (
                <div key={visitor.label} className="top-visitor-row">
                  <span>{index + 1}. {visitor.label}</span>
                  <strong>{visitor.count} 次</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-table" style={{ padding: 18 }}>
          <h2 className="admin-section-title">最近訪問紀錄</h2>
          {dashboard.recentViews.length === 0 ? (
            <p className="helper-text">目前還沒有訪問紀錄。</p>
          ) : (
            <div className="recent-view-list">
              {dashboard.recentViews.map((view) => (
                <div key={view.id} className="recent-view-row">
                  <div>
                    <strong>{getVisitorLabel(view)}</strong>
                    <span>{view.eventType === 'code_login' ? '訪客碼登入' : view.path}</span>
                  </div>
                  <time>{formatMaybeDate(view)}</time>
                </div>
              ))}
            </div>
          )}
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
            <th>使用次數</th>
            <th>有效區間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {codes.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ color: 'var(--text-mid)' }}>
                尚未建立訪客碼。
              </td>
            </tr>
          ) : (
            sortedCodes.map((item) => {
              const status = getStatus(item);
              const usage = codeStats.get(item.code) ?? { loginCount: 0, viewCount: 0 };
              return (
                <tr key={item.id}>
                  <td style={{ color: 'var(--text)' }}>{item.label}</td>
                  <td style={{ color: 'var(--gold-light)', letterSpacing: '0.08em' }}>
                    {formatGuestCode(item.code)}
                  </td>
                  <td>
                    <span className={`badge ${status.className}`}>{status.label}</span>
                  </td>
                  <td style={{ color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>
                    登入 {usage.loginCount} / 瀏覽 {usage.viewCount}
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

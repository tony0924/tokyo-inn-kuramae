import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import {
  formatGuestCode,
  saveGuestAccessSession,
  validateGuestAccessCode,
} from '@/lib/guestAccessCodes';
import { recordGuestPageEvent } from '@/lib/guestAnalytics';
import { captureEmailEntry, consumeEmailEntry } from '@/lib/guestAttribution';

export default function GuestCodeLoginPage() {
  const { fbUser, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => captureEmailEntry(location.search), [location.search]);

  if (!loading && fbUser && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'guest' && user.active) return <Navigate to="/guest" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const access = await validateGuestAccessCode(code);
      if (!access) {
        setError('此訪客碼不存在、尚未生效或已過期。請確認後再試一次。');
        return;
      }
      await recordGuestPageEvent({
        eventType: 'code_login',
        path: '/code-login',
        guestAccessCode: access.code,
        guestAccess: access,
      }).catch((err) => console.warn('record guest code login failed', err));
      const emailType = consumeEmailEntry();
      if (emailType) {
        await recordGuestPageEvent({
          eventType: 'email_entry',
          path: '/code-login',
          guestAccessCode: access.code,
          guestAccess: access,
          targetId: emailType,
        }).catch((err) => console.warn('record Email entry failed', err));
      }
      saveGuestAccessSession(access.code);
      navigate('/guest/home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '驗證失敗，請稍後再試。');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="full-page-center" style={{ flexDirection: 'column', gap: 20, padding: 24 }}>
      <div className="top-bar" />
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}
      >
        <h1
          style={{
            fontFamily: "'Noto Serif TC', serif",
            color: 'var(--gold)',
            marginBottom: 12,
          }}
        >
          訪客碼登入
        </h1>
        <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 24 }}>
          請輸入管理員提供的隨機碼，即可查看房客指南。
        </p>

        <label htmlFor="guest-access-code" className="sr-only">訪客碼</label>
        <input
          id="guest-access-code"
          value={code}
          onChange={(e) => setCode(formatGuestCode(e.target.value))}
          placeholder="例如：ABCD-2345"
          autoComplete="one-time-code"
          aria-describedby="guest-code-help"
          style={{
            width: '100%',
            textAlign: 'center',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        />
        <p id="guest-code-help" style={{ color: 'var(--text-mid)', fontSize: 12, marginBottom: 14 }}>
          可直接輸入 8 碼，系統會自動加入連字號。
        </p>

        <button
          type="submit"
          className="btn-gold"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={checking || code.trim().length < 4}
        >
          {checking ? '驗證中…' : '進入房客頁面'}
        </button>

        {error && (
          <p role="alert" style={{ color: 'var(--vermilion)', fontSize: 13, marginTop: 16 }}>{error}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 18 }}>
          <Link to={`/login${location.search}`} style={{ color: 'var(--text-mid)', fontSize: 13 }}>
            使用 Gmail 登入
          </Link>
          <Link to="/" style={{ color: 'var(--text-mid)', fontSize: 13 }}>
            回首頁
          </Link>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { signInWithGoogle } from '@/lib/auth';
import { useAuth } from '@/auth/AuthProvider';

export default function LoginPage() {
  const { fbUser, user, loading } = useAuth();
  const location = useLocation();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && fbUser && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'guest' && user.active) return <Navigate to="/guest" replace />;
    return <Navigate to="/pending" replace />;
  }

  const handleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : '登入失敗';
      setError(message);
      setSigningIn(false);
    }
  };

  const from = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname;

  return (
    <div className="full-page-center" style={{ flexDirection: 'column', gap: 20, padding: 24 }}>
      <div className="top-bar" />
      <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: "'Noto Serif TC', serif",
            color: 'var(--gold)',
            marginBottom: 12,
          }}
        >
          登入
        </h1>
        <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 24 }}>
          請使用您預約時提供的 Gmail 帳號登入。
          {from && (
            <>
              <br />
              <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>
                登入後將回到 {from}
              </span>
            </>
          )}
        </p>

        <button
          type="button"
          className="btn-gold"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={signingIn}
          onClick={handleSignIn}
        >
          {signingIn ? '登入中…' : '使用 Google 登入'}
        </button>

        <Link
          to="/code-login"
          className="btn-ghost"
          style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
        >
          使用訪客碼登入
        </Link>

        {error && (
          <p style={{ color: 'var(--vermilion)', fontSize: 13, marginTop: 16 }}>{error}</p>
        )}

        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginTop: 18,
            color: 'var(--text-mid)',
            fontSize: 13,
          }}
        >
          ← 回首頁
        </Link>
      </div>
    </div>
  );
}

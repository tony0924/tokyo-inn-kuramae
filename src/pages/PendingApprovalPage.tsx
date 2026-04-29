import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { signOut } from '@/lib/auth';

export default function PendingApprovalPage() {
  const { fbUser, user, loading } = useAuth();

  if (loading) return null;
  if (!fbUser) return <Navigate to="/login" replace />;

  // If somehow they shouldn't be here, send them to where they belong
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'guest' && user.active) return <Navigate to="/guest" replace />;

  return (
    <div className="full-page-center" style={{ flexDirection: 'column', gap: 16, padding: 24 }}>
      <div className="top-bar" />
      <div className="card" style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: "'Noto Serif TC', serif",
            color: 'var(--gold)',
            marginBottom: 16,
          }}
        >
          等待審核中
        </h1>
        <p style={{ color: 'var(--text-mid)', lineHeight: 1.7, marginBottom: 8 }}>
          您的帳號 <strong style={{ color: 'var(--text)' }}>{fbUser.email}</strong>{' '}
          已收到。
        </p>
        <p style={{ color: 'var(--text-mid)', lineHeight: 1.7, marginBottom: 24 }}>
          管理者確認您的預約資訊後即會開放查看。請稍候。
        </p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            signOut().catch(() => {});
          }}
        >
          登出
        </button>
      </div>
    </div>
  );
}

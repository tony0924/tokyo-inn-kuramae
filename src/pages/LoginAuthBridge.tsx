import { Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';

export default function LoginAuthBridge() {
  return (
    <AuthProvider>
      <AuthenticatedLoginRedirect />
    </AuthProvider>
  );
}

function AuthenticatedLoginRedirect() {
  const { fbUser, user, loading } = useAuth();

  if (loading || !fbUser || !user) return null;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'guest' && user.active) {
    return <Navigate to="/guest" replace />;
  }
  return <Navigate to="/pending" replace />;
}

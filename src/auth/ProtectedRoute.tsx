import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthProvider';
import {
  clearGuestAccessSession,
  getStoredGuestAccessCode,
  validateGuestAccessCode,
} from '@/lib/guestAccessCodes';
import type { UserRole } from '@/types';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRoles: UserRole[];
  requireActive?: boolean;
}

export function ProtectedRoute({
  children,
  requireRoles,
  requireActive = true,
}: ProtectedRouteProps) {
  const { fbUser, user, loading } = useAuth();
  const location = useLocation();
  const allowsGuestCode = useMemo(
    () => requireRoles.includes('guest'),
    [requireRoles]
  );
  const [checkingGuestCode, setCheckingGuestCode] = useState(() =>
    allowsGuestCode ? Boolean(getStoredGuestAccessCode()) : false
  );
  const [guestCodeAllowed, setGuestCodeAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkGuestCode() {
      if (loading || fbUser || !allowsGuestCode) {
        setCheckingGuestCode(false);
        setGuestCodeAllowed(false);
        return;
      }

      const storedCode = getStoredGuestAccessCode();
      if (!storedCode) {
        setCheckingGuestCode(false);
        setGuestCodeAllowed(false);
        return;
      }

      setCheckingGuestCode(true);
      const access = await validateGuestAccessCode(storedCode).catch(() => null);
      if (cancelled) return;

      if (access) {
        setGuestCodeAllowed(true);
      } else {
        clearGuestAccessSession();
        setGuestCodeAllowed(false);
      }
      setCheckingGuestCode(false);
    }

    checkGuestCode();

    return () => {
      cancelled = true;
    };
  }, [allowsGuestCode, fbUser, loading]);

  if (loading || checkingGuestCode) {
    return <FullPageLoader />;
  }

  if (!fbUser) {
    if (guestCodeAllowed) return <>{children}</>;
    if (allowsGuestCode && getStoredGuestAccessCode()) return <FullPageLoader />;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user) {
    return <FullPageLoader />;
  }

  if (!requireRoles.includes(user.role)) {
    return <Navigate to="/pending" replace />;
  }

  if (requireActive && !user.active && user.role !== 'admin') {
    return <Navigate to="/pending" replace />;
  }

  return <>{children}</>;
}

function FullPageLoader() {
  return (
    <div className="full-page-center">
      <div className="loader-text">載入中…</div>
    </div>
  );
}

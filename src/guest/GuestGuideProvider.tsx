import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { getStoredGuestAccessCode } from '@/lib/guestAccessCodes';
import { getGuestPortalData, getPrivateGuestGuide } from '@/lib/guestGuide';
import type { GuestGuidePrivateContent } from '@/types';

interface GuestGuideState {
  guide: GuestGuidePrivateContent | null;
  loading: boolean;
  error: boolean;
}

const GuestGuideContext = createContext<GuestGuideState>({
  guide: null,
  loading: true,
  error: false,
});

export function GuestGuideProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<GuestGuideState>({
    guide: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ guide: null, loading: true, error: false });
      try {
        const code = !user ? getStoredGuestAccessCode() : null;
        const guide = code
          ? (await getGuestPortalData(code)).guide
          : await getPrivateGuestGuide();
        if (!cancelled) setState({ guide, loading: false, error: false });
      } catch {
        if (!cancelled) setState({ guide: null, loading: false, error: true });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <GuestGuideContext.Provider value={state}>
      {children}
    </GuestGuideContext.Provider>
  );
}

export function useGuestGuide(): GuestGuideState {
  return useContext(GuestGuideContext);
}

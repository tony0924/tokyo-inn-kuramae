import { useEffect, useState } from 'react';
import { watchEmailAccess } from '@/lib/users';
import type { EmailAccess } from '@/types';

export function useEmailAccess(): {
  emailAccess: EmailAccess[];
  loading: boolean;
} {
  const [emailAccess, setEmailAccess] = useState<EmailAccess[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = watchEmailAccess((items) => {
      setEmailAccess(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { emailAccess, loading };
}

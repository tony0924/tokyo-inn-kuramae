import { useEffect, useState } from 'react';
import { watchUsers } from '@/lib/users';
import type { User, UserRole } from '@/types';

export function useUsers(filter?: { role?: UserRole }): {
  users: User[];
  loading: boolean;
} {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = watchUsers((items) => {
      setUsers(items);
      setLoading(false);
    }, filter);
    return unsub;
  }, [filter?.role]);

  return { users, loading };
}

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User, UserDoc } from '@/types';

interface AuthState {
  fbUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  fbUser: null,
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: Unsubscribe | null = null;

    const unsubAuth = onAuthStateChanged(auth, (current) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      setFbUser(current);

      if (!current) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      unsubDoc = onSnapshot(
        doc(db, 'users', current.uid),
        (snap) => {
          if (snap.exists()) {
            setUser({
              uid: snap.id,
              ...(snap.data() as UserDoc),
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error('user doc subscribe error', err);
          setUser(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ fbUser, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

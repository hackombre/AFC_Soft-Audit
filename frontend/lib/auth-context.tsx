'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, clearToken, getToken, setToken } from '@/lib/api';
import type { UserOut } from '@/lib/types';

interface AuthContextType {
  currentUser: UserOut | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }
    try {
      const user = (await api.me()) as UserOut;
      setCurrentUser(user);
    } catch {
      clearToken();
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await api.login(email, password);
      setToken(access_token);
      const user = (await api.me()) as UserOut;
      setCurrentUser(user);
      router.push('/missions');
    },
    [router]
  );

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}

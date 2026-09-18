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
import { api } from '@/lib/api';
import type { UserOut } from '@/lib/types';

const SECURITY_VERIFIED_KEY = 'afcsoft_security_verified';

interface AuthContextType {
  currentUser: UserOut | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  newSecurityCode: string | null;
  clearNewSecurityCode: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSecurityCode, setNewSecurityCode] = useState<string | null>(null);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    // Le cookie httpOnly n'est pas lisible ici : c'est le
    // serveur qui fait autorité. Un 401 sur /me signifie
    // simplement « pas de session valide ».
    try {
      const user = (await api.me()) as UserOut;
      setCurrentUser(user);
    } catch {
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
      // Le serveur dépose lui-même le cookie de session.
      const { security_code, must_change_password } = await api.login(email, password);
      if (typeof window !== 'undefined') sessionStorage.removeItem(SECURITY_VERIFIED_KEY);
      const user = (await api.me()) as UserOut;
      setCurrentUser(user);
      if (security_code) setNewSecurityCode(security_code);
      router.push(must_change_password ? '/change-password' : '/missions');
    },
    [router]
  );

  const logout = useCallback(async () => {
    // Révocation côté serveur : le jeton devient inutilisable
    // même s'il a déjà été intercepté.
    try {
      await api.logout();
    } catch {
      /* même en cas d'échec réseau, on nettoie l'état local */
    }
    if (typeof window !== 'undefined') sessionStorage.removeItem(SECURITY_VERIFIED_KEY);
    setCurrentUser(null);
    router.push('/login');
  }, [router]);

  const clearNewSecurityCode = useCallback(() => setNewSecurityCode(null), []);

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, login, logout, refreshUser, newSecurityCode, clearNewSecurityCode }}
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
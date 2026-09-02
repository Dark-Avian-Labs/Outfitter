import { useAuth as useClerkAuth, useUser } from '@clerk/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { apiFetch, clearCsrfToken, setClerkTokenGetter } from '../../utils/api';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  userId: string | null;
  isAdmin: boolean;
}

interface AuthContextValue {
  auth: AuthState;
  refresh: () => Promise<void>;
}

const UNAUTHENTICATED: AuthState = { status: 'unauthenticated', userId: null, isAdmin: false };

function clerkUserIsOutfitterAdmin(publicMetadata: unknown): boolean {
  if (!publicMetadata || typeof publicMetadata !== 'object') return false;
  const apps = (publicMetadata as { apps?: unknown }).apps;
  if (!apps || typeof apps !== 'object') return false;
  for (const [key, value] of Object.entries(apps)) {
    if (key.toLowerCase() === 'outfitter' && value === 'admin') return true;
  }
  return false;
}

const AuthContext = createContext<AuthContextValue>({
  auth: UNAUTHENTICATED,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user } = useUser();
  const [auth, setAuth] = useState<AuthState>({ status: 'loading', userId: null, isAdmin: false });
  const refreshSeq = useRef(0);

  useEffect(() => {
    setClerkTokenGetter((options) => getToken(options));
    return () => {
      setClerkTokenGetter(null);
    };
  }, [getToken]);

  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current;
    if (!isLoaded) return;
    if (!isSignedIn) {
      clearCsrfToken();
      if (seq === refreshSeq.current) setAuth(UNAUTHENTICATED);
      return;
    }
    try {
      const res = await apiFetch('/api/auth/me');
      if (seq !== refreshSeq.current) return;
      if (res.status === 401) {
        setAuth(UNAUTHENTICATED);
        return;
      }
      if (!res.ok) throw new Error(`Unexpected status ${res.status}`);
      const data = (await res.json()) as { userId?: string | null; isAdmin?: boolean };
      if (seq !== refreshSeq.current) return;
      setAuth({
        status: 'authenticated',
        userId: data.userId ?? null,
        isAdmin: data.isAdmin === true || clerkUserIsOutfitterAdmin(user?.publicMetadata),
      });
    } catch {
      if (seq !== refreshSeq.current) return;
      setAuth({ status: 'error', userId: null, isAdmin: false });
    }
  }, [isLoaded, isSignedIn, user?.publicMetadata]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clerkAdmin = clerkUserIsOutfitterAdmin(user?.publicMetadata);
  const value = useMemo(
    () => ({
      auth:
        auth.status === 'authenticated' ? { ...auth, isAdmin: auth.isAdmin || clerkAdmin } : auth,
      refresh,
    }),
    [auth, clerkAdmin, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function DisabledAuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    setClerkTokenGetter(null);
  }, []);
  const value = useMemo(() => ({ auth: UNAUTHENTICATED, refresh: async () => {} }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

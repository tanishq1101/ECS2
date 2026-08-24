/**
 * Shared authentication for both portals.
 *
 * The role returned by the login endpoint is the single source of truth for
 * which portal a session may enter, so adding the student role did not require
 * a second auth system alongside the mess-staff one.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, cachedUser, SESSION_EXPIRED_EVENT, tokenStore } from '../services/api';

const AuthContext = createContext(null);

/** Where each role belongs after signing in. */
export function homePathForRole(role) {
  return role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
}

export function AuthProvider({ children }) {
  // Start from the cached profile so a refresh does not flash the login page.
  const [user, setUser] = useState(() => (tokenStore.get() ? cachedUser.get() : null));
  // `bootstrapping` covers the token check on first load, so guarded routes do
  // not bounce a signed-in user to the login page during a refresh.
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!tokenStore.get()) {
        setBootstrapping(false);
        return;
      }
      try {
        const data = await authApi.me();
        if (!cancelled) {
          setUser(data.user);
          cachedUser.set(data.user);
        }
      } catch (error) {
        // Only a rejected token ends the session. A network failure means the
        // server is unreachable, which the pages report through their own
        // error states rather than by signing the student out.
        if (error.status === 401 || error.status === 403) {
          tokenStore.clear();
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Any rejected token anywhere in the app ends the session here.
  useEffect(() => {
    const handleExpiry = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiry);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiry);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    tokenStore.set(data.token);
    cachedUser.set(data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Signing out locally must succeed even if the server is unreachable.
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, role: user?.role ?? null, isAuthenticated: !!user, bootstrapping, login, logout }),
    [user, bootstrapping, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Deckr, setToken, getToken } from '../api/client.js';
import { dropCache } from '../lib/cache.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [unlocked, setUnlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const { user: u, unlocked: keys } = await Deckr.me();
      setUser(u);
      setUnlocked(keys || []);
      return u;
    } catch (err) {
      if (err.status === 401) {
        setToken(null);
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loginWithToken = useCallback(
    async (token) => {
      setToken(token);
      setLoading(true);
      return refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    try {
      await Deckr.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    setUnlocked([]);
    dropCache('cards');
    dropCache('achievements');
    dropCache('profile:');
    dropCache('card:');
  }, []);

  const value = useMemo(
    () => ({ user, setUser, unlocked, setUnlocked, loading, refresh, loginWithToken, logout }),
    [user, unlocked, loading, refresh, loginWithToken, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

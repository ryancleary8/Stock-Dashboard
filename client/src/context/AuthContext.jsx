import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchJSON } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const data = await fetchJSON('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async ({ email, password }) => {
    const data = await fetchJSON('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await fetchJSON('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refreshSession }),
    [user, loading, login, signup, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
};
